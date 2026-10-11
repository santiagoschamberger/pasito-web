-- Follow-up to 20261011174354_optimize_brand_data_room_engagement_refresh.
--
-- Production timing of that version showed the core refresh still spent ~30 s
-- of its ~34 s in two places inside one big CTE statement:
--   * the profile counts used GROUPING SETS, which forced a sort of all AR/UY
--     profiles (~10.7 s), and
--   * user_favorites was re-aggregated once per country (2 x ~3.6 s).
-- Changes (payload output unchanged, verified on local data):
--   * profile counts use a plain GROUP BY country/age bucket (totals are summed
--     from the buckets) and run as their own statement (~2 s);
--   * the location/interest label pass runs as its own statement and feeds the
--     payload statement as jsonb instead of a materialized CTE;
--   * favorite categories are aggregated once for both countries;
--   * memoize is disabled for the core refresh (the per-profile label cache
--     had a ~50% miss rate and used >130 MB per process);
--   * engagement builds its rows with a read-only statement and then writes the
--     two snapshot rows in a small UPDATE.
--
-- No new indexes and no schema changes.

-- Demographic/redemption base payload for AR and UY.
-- One pass over profiles for counts per age bucket and one pass for
-- location/interest labels, instead of materializing every profile per
-- country and rescanning that copy a dozen times. Redeemer attributes come
-- from primary-key lookups. Memoize is disabled because caching the
-- per-profile label expansion only burns memory (half the keys are unique).
create or replace function public.refresh_brand_data_room_core_snapshots()
returns void
language plpgsql
set search_path = ''
set work_mem = '64MB'
set enable_memoize = off
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_reporting_date date := public.brand_data_room_reporting_date();
  v_payloads jsonb;
  v_profile_stats jsonb;
  v_profile_labels jsonb;
begin
  -- The two passes over profiles run as their own statements (plain GROUP BY,
  -- no grouping sets, no materialized copy of profiles). Their results are tiny
  -- (a few hundred rows) and feed the payload statement below as jsonb.
  select coalesce(jsonb_agg(pg_catalog.to_jsonb(stats)), '[]'::jsonb)
    into v_profile_stats
  from (
    select
      p.country_code,
      p.age_bucket,
      count(*)::bigint as registered,
      count(*) filter (where p.last_active_date >= v_reporting_date - 29)::bigint as active_30d,
      count(*) filter (where p.created_at >= v_now - interval '30 days')::bigint as new_30d,
      count(*) filter (where p.age between 13 and 100)::bigint as age_users,
      count(*) filter (
        where nullif(pg_catalog.btrim(coalesce(p.province, '')), '') is not null
           or nullif(pg_catalog.btrim(coalesce(p.city, '')), '') is not null
           or nullif(pg_catalog.btrim(coalesce(p.barrio, '')), '') is not null
      )::bigint as location_users,
      count(*) filter (where pg_catalog.cardinality(p.interests) > 0)::bigint as interest_users
    from (
      select
        profile.country_code,
        profile.age,
        profile.province,
        profile.city,
        profile.barrio,
        profile.interests,
        profile.created_at,
        profile.last_active_date,
        case
          when profile.age between 13 and 17 then 1
          when profile.age between 18 and 24 then 2
          when profile.age between 25 and 34 then 3
          when profile.age between 35 and 44 then 4
          when profile.age between 45 and 54 then 5
          when profile.age between 55 and 64 then 6
          when profile.age between 65 and 100 then 7
        end as age_bucket
      from public.profiles profile
      where profile.country_code in ('AR', 'UY')
    ) p
    group by p.country_code, p.age_bucket
  ) stats;

  select coalesce(jsonb_agg(pg_catalog.to_jsonb(labels)), '[]'::jsonb)
    into v_profile_labels
  from (
    select
      p.country_code,
      v.kind,
      min(pg_catalog.btrim(v.value)) as label,
      count(*)::bigint as count
    from public.profiles p
    cross join lateral (
      select 'provinces'::text as kind, p.province as value
      union all
      select 'cities'::text, p.city
      union all
      select 'neighborhoods'::text, p.barrio
      union all
      select 'interests'::text, interest
      from pg_catalog.unnest(p.interests) interest
    ) v
    where p.country_code in ('AR', 'UY')
      and nullif(pg_catalog.btrim(coalesce(v.value, '')), '') is not null
    group by p.country_code, v.kind, pg_catalog.lower(pg_catalog.btrim(v.value))
    having count(*) >= 20
  ) labels;

  with
  countries(country_code, country_name, currency) as (
    values ('AR'::text, 'Argentina'::text, 'ARS'::text),
           ('UY'::text, 'Uruguay'::text, 'UYU'::text)
  ),
  profile_buckets as (
    select *
    from pg_catalog.jsonb_to_recordset(v_profile_stats) as stats(
      country_code text,
      age_bucket integer,
      registered bigint,
      active_30d bigint,
      new_30d bigint,
      age_users bigint,
      location_users bigint,
      interest_users bigint
    )
  ),
  profile_stats as (
    select country_code, age_bucket, 0 as is_total, registered,
           active_30d, new_30d, age_users, location_users, interest_users
    from profile_buckets
    where age_bucket is not null
    union all
    select country_code, null::integer, 1,
           sum(registered)::bigint, sum(active_30d)::bigint, sum(new_30d)::bigint,
           sum(age_users)::bigint, sum(location_users)::bigint, sum(interest_users)::bigint
    from profile_buckets
    group by country_code
  ),
  profile_labels as (
    select *
    from pg_catalog.jsonb_to_recordset(v_profile_labels) as labels(
      country_code text,
      kind text,
      label text,
      count bigint
    )
  ),
  used_coupons as materialized (
    select
      r.country_code,
      c.user_id,
      c.reward_id,
      c.partner_id,
      c.used_at,
      c.pasitos_spent,
      c.extra_purchase,
      c.partner_liked,
      r.title as reward_title,
      r.category as reward_category,
      r.original_value,
      partner.name as partner_name
    from public.coupons c
    join public.rewards r on r.id = c.reward_id
    join public.partners partner on partner.id = c.partner_id
    where c.status = 'used'
      and r.country_code in ('AR', 'UY')
  ),
  coupon_stats as (
    select
      country_code,
      count(*)::bigint as redemptions_total,
      count(*) filter (where used_at >= v_now - interval '30 days')::bigint as redemptions_30d,
      round(avg(pasitos_spent), 1) as average_pasitos_spent,
      count(*) filter (where extra_purchase is not null)::bigint as survey_responses,
      count(*) filter (where extra_purchase = true)::bigint as survey_extra,
      count(*) filter (where partner_liked is not null)::bigint as survey_liked_responses,
      count(*) filter (where partner_liked = true)::bigint as survey_liked
    from used_coupons
    group by country_code
  ),
  redeemers as materialized (
    select country_code, user_id, count(*)::bigint as redemption_count
    from used_coupons
    group by country_code, user_id
  ),
  redeemer_profiles as materialized (
    -- Primary-key lookup per redeemer (offset 0 keeps it a nested loop
    -- instead of hashing the whole profiles table).
    select rd.country_code, rp.age, rp.barrio, rp.interests
    from redeemers rd
    cross join lateral (
      select p.age, p.barrio, p.interests, p.country_code
      from public.profiles p
      where p.id = rd.user_id
      offset 0
    ) rp
    where rp.country_code = rd.country_code
  ),
  parsed_values as materialized (
    select country_code, pg_catalog.replace(original_value, ',', '.')::numeric as amount
    from used_coupons
    where pg_catalog.btrim(coalesce(original_value, '')) ~ '^[0-9]+([.,][0-9]{1,2})?$'
  ),
  value_stats as (
    select
      country_code,
      round(avg(amount), 0) as average_value,
      round((percentile_cont(0.5) within group (order by amount))::numeric, 0) as median_value,
      count(*)::bigint as sample_size
    from parsed_values
    group by country_code
  ),
  catalog_counts as (
    select
      country.country_code,
      (select count(*) from public.partners partner
        where partner.country_code = country.country_code
          and partner.is_active = true
          and partner.approval_status = 'approved') as active_partners,
      (select count(*) from public.rewards reward
        where reward.country_code = country.country_code
          and reward.is_active = true
          and reward.type = 'reward') as active_rewards
    from countries country
  ),
  age_labels(sort_order, label) as (
    values (1, '13–17'), (2, '18–24'), (3, '25–34'), (4, '35–44'),
           (5, '45–54'), (6, '55–64'), (7, '65+')
  ),
  redeemer_age as (
    select
      country_code,
      case
        when age between 13 and 17 then 1
        when age between 18 and 24 then 2
        when age between 25 and 34 then 3
        when age between 35 and 44 then 4
        when age between 45 and 54 then 5
        when age between 55 and 64 then 6
        when age between 65 and 100 then 7
      end as sort_order,
      count(*)::bigint as count
    from redeemer_profiles
    where age between 13 and 100
    group by 1, 2
  ),
  redeemer_labels as (
    select country_code, 'neighborhoods'::text as kind, min(pg_catalog.btrim(barrio)) as label, count(*)::bigint as count
    from redeemer_profiles
    where nullif(pg_catalog.btrim(coalesce(barrio, '')), '') is not null
    group by country_code, pg_catalog.lower(pg_catalog.btrim(barrio))
    having count(*) >= 20
    union all
    select country_code, 'interests'::text, min(pg_catalog.btrim(interest)), count(*)::bigint
    from redeemer_profiles
    cross join lateral pg_catalog.unnest(interests) interest
    where nullif(pg_catalog.btrim(interest), '') is not null
    group by country_code, pg_catalog.lower(pg_catalog.btrim(interest))
    having count(*) >= 20
  ),
  ranked_labels as (
    select
      country_code,
      kind,
      label,
      count,
      row_number() over (partition by country_code, kind order by count desc, label) as position
    from (
      select country_code, kind, label, count from profile_labels
      union all
      select country_code, 'redeemer_' || kind, label, count from redeemer_labels
    ) labels
  ),
  label_json as (
    select country_code, kind,
      jsonb_agg(jsonb_build_object('label', label, 'count', count) order by count desc, label) as rows
    from ranked_labels
    where position <= case kind
      when 'provinces' then 12
      when 'cities' then 12
      when 'neighborhoods' then 15
      when 'interests' then 15
      when 'redeemer_neighborhoods' then 12
      when 'redeemer_interests' then 15
    end
    group by country_code, kind
  ),
  favorite_categories as materialized (
    select country_code, label, count,
      row_number() over (partition by country_code order by count desc, label) as position
    from (
      select
        partner.country_code,
        min(coalesce(cc.label, pg_catalog.initcap(pg_catalog.replace(partner.category, '_', ' ')))) as label,
        count(*)::bigint as count
      from public.user_favorites uf
      join public.partners partner
        on uf.item_type = 'partner'
       and uf.item_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       and partner.id = uf.item_id::uuid
      left join public.catalog_categories cc on cc.id = partner.category
      where partner.country_code in ('AR', 'UY')
      group by partner.country_code, partner.category
      having count(*) >= 20
    ) categories
  ),
  redemption_categories as (
    select country_code, label, count,
      row_number() over (partition by country_code order by count desc, label) as position
    from (
      select
        uc.country_code,
        min(coalesce(cc.label, pg_catalog.initcap(pg_catalog.replace(uc.reward_category, '_', ' ')))) as label,
        count(*)::bigint as count
      from used_coupons uc
      left join public.catalog_categories cc on cc.id = uc.reward_category
      group by uc.country_code, uc.reward_category
    ) categories
  ),
  monthly_redemptions as (
    select country_code, pg_catalog.date_trunc('month', used_at) as month_start, count(*)::bigint as redemptions
    from used_coupons
    where used_at >= pg_catalog.date_trunc('month', v_now) - interval '11 months'
    group by 1, 2
  ),
  top_rewards as (
    select country_code, reward_title, partner_name, count,
      row_number() over (partition by country_code order by count desc, reward_title) as position
    from (
      select country_code, reward_id, min(reward_title) as reward_title, min(partner_name) as partner_name, count(*)::bigint as count
      from used_coupons
      group by country_code, reward_id
    ) rewards
  ),
  top_partners as (
    select country_code, partner_name, count,
      row_number() over (partition by country_code order by count desc, partner_name) as position
    from (
      select country_code, partner_id, min(partner_name) as partner_name, count(*)::bigint as count
      from used_coupons
      group by country_code, partner_id
    ) partners
  ),
  payloads as (
    select
      country.country_code,
      jsonb_build_object(
        'countryCode', country.country_code,
        'countryName', country.country_name,
        'currency', country.currency,
        'headline', jsonb_build_object(
          'registeredUsers', coalesce(total.registered, 0),
          'activeUsers30d', coalesce(total.active_30d, 0),
          'newUsers30d', coalesce(total.new_30d, 0),
          'redeemingUsers', (select count(*) from redeemers rd where rd.country_code = country.country_code),
          'redemptionsTotal', coalesce(coupon.redemptions_total, 0),
          'redemptions30d', coalesce(coupon.redemptions_30d, 0),
          'activePartners', catalog.active_partners,
          'activeRewards', catalog.active_rewards,
          'averageRedeemedValue', value.average_value,
          'medianRedeemedValue', value.median_value,
          'valueSampleSize', coalesce(value.sample_size, 0),
          'averagePasitosSpent', coupon.average_pasitos_spent
        ),
        'dataCoverage', jsonb_build_object(
          'ageUsers', coalesce(total.age_users, 0),
          'locationUsers', coalesce(total.location_users, 0),
          'interestUsers', coalesce(total.interest_users, 0)
        ),
        'ageDistribution', coalesce((
          select jsonb_agg(jsonb_build_object('label', age_label.label, 'count', bucket.registered) order by bucket.age_bucket)
          from profile_stats bucket
          join age_labels age_label on age_label.sort_order = bucket.age_bucket
          where bucket.country_code = country.country_code
            and bucket.is_total = 0
        ), '[]'::jsonb),
        'redeemerAgeDistribution', coalesce((
          select jsonb_agg(jsonb_build_object('label', age_label.label, 'count', bucket.count) order by bucket.sort_order)
          from redeemer_age bucket
          join age_labels age_label on age_label.sort_order = bucket.sort_order
          where bucket.country_code = country.country_code
        ), '[]'::jsonb),
        'locations', jsonb_build_object(
          'provinces', coalesce((select rows from label_json l where l.country_code = country.country_code and l.kind = 'provinces'), '[]'::jsonb),
          'cities', coalesce((select rows from label_json l where l.country_code = country.country_code and l.kind = 'cities'), '[]'::jsonb),
          'neighborhoods', coalesce((select rows from label_json l where l.country_code = country.country_code and l.kind = 'neighborhoods'), '[]'::jsonb)
        ),
        'redeemerNeighborhoods', coalesce((select rows from label_json l where l.country_code = country.country_code and l.kind = 'redeemer_neighborhoods'), '[]'::jsonb),
        'interests', coalesce((select rows from label_json l where l.country_code = country.country_code and l.kind = 'interests'), '[]'::jsonb),
        'redeemerInterests', coalesce((select rows from label_json l where l.country_code = country.country_code and l.kind = 'redeemer_interests'), '[]'::jsonb),
        'favoriteCategories', coalesce((
          select jsonb_agg(jsonb_build_object('label', label, 'count', count) order by count desc, label)
          from favorite_categories f
          where f.country_code = country.country_code and f.position <= 12
        ), '[]'::jsonb),
        'redemptionCategories', coalesce((
          select jsonb_agg(jsonb_build_object('label', label, 'count', count) order by count desc, label)
          from redemption_categories rc
          where rc.country_code = country.country_code and rc.position <= 12
        ), '[]'::jsonb),
        'redemptionTrend', (
          select jsonb_agg(
            jsonb_build_object(
              'month', pg_catalog.to_char(months.month_start, 'YYYY-MM'),
              'count', coalesce(monthly.redemptions, 0)
            ) order by months.month_start
          )
          from pg_catalog.generate_series(
            pg_catalog.date_trunc('month', v_now) - interval '11 months',
            pg_catalog.date_trunc('month', v_now),
            interval '1 month'
          ) months(month_start)
          left join monthly_redemptions monthly
            on monthly.country_code = country.country_code
           and monthly.month_start = months.month_start
        ),
        'redemptionFrequency', coalesce((
          select jsonb_agg(jsonb_build_object('label', label, 'count', count) order by sort_order)
          from (
            select
              case
                when redemption_count = 1 then '1 canje'
                when redemption_count between 2 and 3 then '2–3 canjes'
                when redemption_count between 4 and 9 then '4–9 canjes'
                else '10+ canjes'
              end as label,
              case
                when redemption_count = 1 then 1
                when redemption_count between 2 and 3 then 2
                when redemption_count between 4 and 9 then 3
                else 4
              end as sort_order,
              count(*)::bigint as count
            from redeemers rd
            where rd.country_code = country.country_code
            group by 1, 2
          ) frequency
        ), '[]'::jsonb),
        'topRewards', coalesce((
          select jsonb_agg(
            jsonb_build_object('label', reward_title, 'partner', partner_name, 'count', count)
            order by count desc, reward_title
          )
          from top_rewards t
          where t.country_code = country.country_code and t.position <= 10
        ), '[]'::jsonb),
        'topPartners', coalesce((
          select jsonb_agg(jsonb_build_object('label', partner_name, 'count', count) order by count desc, partner_name)
          from top_partners t
          where t.country_code = country.country_code and t.position <= 10
        ), '[]'::jsonb),
        'survey', jsonb_build_object(
          'responses', coalesce(coupon.survey_responses, 0),
          'extraPurchases', coalesce(coupon.survey_extra, 0),
          'likedResponses', coalesce(coupon.survey_liked_responses, 0),
          'liked', coalesce(coupon.survey_liked, 0)
        )
      ) as payload
    from countries country
    left join profile_stats total
      on total.country_code = country.country_code
     and total.is_total = 1
    left join coupon_stats coupon on coupon.country_code = country.country_code
    left join value_stats value on value.country_code = country.country_code
    left join catalog_counts catalog on catalog.country_code = country.country_code
  )
  select jsonb_object_agg(country_code, payload)
    into v_payloads
  from payloads;

  -- Separate write: a read-only SELECT can use parallel workers for the two
  -- profile passes; a data-modifying statement cannot.
  insert into public.brand_data_room_snapshots as snapshot (country_code, payload, refreshed_at)
  select built.key, built.value, v_now
  from pg_catalog.jsonb_each(v_payloads) built
  on conflict (country_code) do update
    set payload = excluded.payload,
        refreshed_at = excluded.refreshed_at;
end;
$$;

-- Engagement payload. The 30-day activity rollup aggregates per user straight
-- from the covering index idx_daily_activity_opened_date_user and resolves the
-- country with one primary-key lookup per active user, instead of
-- materializing every AR/UY profile plus ~12M activity rows and spilling to
-- disk. Push reach and challenge rollups use the same per-user lookups.
--
-- dailyActiveTrend, notificationBreakdown and the notification totals are no
-- longer written here: every caller (the daily cron job and
-- refresh_brand_data_room_snapshots) runs refresh_brand_data_room_marketing_snapshots()
-- and refresh_brand_data_room_push_snapshots() right after, and those already
-- own and overwrite those keys.
create or replace function public.refresh_brand_data_room_engagement_snapshots()
returns void
language plpgsql
set search_path = ''
set work_mem = '128MB'
as $$
declare
  v_reporting_date date := public.brand_data_room_reporting_date();
  v_now timestamptz := pg_catalog.now();
  v_rows jsonb;
begin
  perform public.refresh_brand_data_room_core_snapshots();

  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  activity_by_user as materialized (
    select
      (select p.country_code from public.profiles p where p.id = u.user_id) as country_code,
      u.open_days,
      u.validated_steps,
      u.validated_step_days,
      u.pasitos_earned
    from (
      select
        da.user_id,
        count(*)::bigint as open_days,
        sum(da.validated_steps)::bigint as validated_steps,
        count(da.validated_steps)::bigint as validated_step_days,
        sum(da.pasitos_earned)::bigint as pasitos_earned
      from public.daily_activity da
      where da.date >= v_reporting_date - 29
        and da.opened_app = true
      group by da.user_id
    ) u
  ),
  activity_totals as (
    select
      country_code,
      sum(open_days)::bigint as app_open_days_30d,
      coalesce(sum(validated_steps), 0)::bigint as validated_steps_30d,
      coalesce(sum(pasitos_earned), 0)::bigint as pasitos_earned_30d,
      round(sum(validated_steps)::numeric / nullif(sum(validated_step_days), 0), 0)::bigint as average_steps_per_active_day,
      round(avg(open_days), 1) as average_open_days_per_active,
      count(*) filter (where open_days >= 8)::bigint as recurrent_users_30d
    from activity_by_user
    group by country_code
  ),
  push_totals as (
    select country_code, count(*)::bigint as reachable_users
    from (
      select (select p.country_code from public.profiles p where p.id = d.user_id) as country_code
      from public.user_push_devices d
      where d.disabled_at is null
        and d.permission_status = 'granted'
      group by d.user_id
    ) reachable
    group by country_code
  ),
  redemption_by_user as materialized (
    select
      r.country_code,
      c.user_id,
      count(*)::bigint as redemptions,
      count(*) filter (where c.used_at >= v_now - interval '30 days')::bigint as recent_redemptions
    from public.coupons c
    join public.rewards r on r.id = c.reward_id
    where c.status = 'used'
      and r.country_code in ('AR', 'UY')
    group by r.country_code, c.user_id
  ),
  redemption_totals as (
    select
      country_code,
      count(*) filter (where recent_redemptions > 0)::bigint as redeeming_users_30d,
      count(*) filter (where redemptions >= 2)::bigint as repeat_redeemers
    from redemption_by_user
    group by country_code
  ),
  challenge_participant_country as materialized (
    select
      resolved.country_code,
      ch.id as challenge_id,
      ch.title,
      ch.brand_name,
      resolved.user_id,
      resolved.instagram_shared,
      resolved.won
    from (
      select
        participant.challenge_id,
        participant.user_id,
        participant.instagram_shared,
        participant.won,
        (select p.country_code from public.profiles p where p.id = participant.user_id) as country_code
      from public.challenge_participants participant
    ) resolved
    join public.challenges ch on ch.id = resolved.challenge_id
    where resolved.country_code in ('AR', 'UY')
      and resolved.country_code = any(ch.country_codes)
  ),
  challenge_participant_rollup as (
    select
      country_code,
      challenge_id,
      min(title) as title,
      min(brand_name) as brand_name,
      count(*)::bigint as participants,
      count(*) filter (where instagram_shared)::bigint as instagram_shares,
      count(*) filter (where won)::bigint as winners
    from challenge_participant_country
    group by country_code, challenge_id
  ),
  challenge_activity_rollup as (
    select
      resolved.country_code,
      resolved.challenge_id,
      coalesce(sum(resolved.validated_steps), 0)::bigint as validated_steps
    from (
      select
        per_user.challenge_id,
        per_user.validated_steps,
        (select p.country_code from public.profiles p where p.id = per_user.user_id) as country_code
      from (
        select activity.challenge_id, activity.user_id, sum(activity.validated_steps) as validated_steps
        from public.challenge_participant_activity_snapshots activity
        group by activity.challenge_id, activity.user_id
      ) per_user
    ) resolved
    join public.challenges ch on ch.id = resolved.challenge_id
    where resolved.country_code in ('AR', 'UY')
      and resolved.country_code = any(ch.country_codes)
    group by resolved.country_code, resolved.challenge_id
  ),
  challenge_metrics as materialized (
    select
      participant.country_code,
      participant.challenge_id,
      participant.title,
      participant.brand_name,
      participant.participants,
      participant.instagram_shares,
      participant.winners,
      coalesce(activity.validated_steps, 0)::bigint as validated_steps
    from challenge_participant_rollup participant
    left join challenge_activity_rollup activity
      on activity.country_code = participant.country_code
     and activity.challenge_id = participant.challenge_id
  ),
  challenge_totals as (
    select
      country_code,
      count(distinct challenge_id)::bigint as challenges,
      count(distinct user_id)::bigint as participant_users,
      count(*)::bigint as participations,
      count(*) filter (where instagram_shared)::bigint as instagram_shares,
      count(*) filter (where won)::bigint as winners
    from challenge_participant_country
    group by country_code
  ),
  challenge_step_totals as (
    select country_code, sum(validated_steps)::bigint as validated_steps
    from challenge_activity_rollup
    group by country_code
  ),
  challenge_ranked as (
    select
      metrics.*,
      row_number() over (
        partition by country_code
        order by participants desc, title
      ) as position
    from challenge_metrics metrics
  ),
  top_challenges as (
    select
      country_code,
      jsonb_agg(
        jsonb_build_object(
          'label', title,
          'brand', brand_name,
          'participants', participants,
          'instagramShares', instagram_shares,
          'winners', winners,
          'validatedSteps', validated_steps
        ) order by participants desc, title
      ) as rows
    from challenge_ranked
    where position <= 8
    group by country_code
  )
  select jsonb_object_agg(
    country.country_code,
    jsonb_build_object(
      'headline', jsonb_build_object(
        'redeemingUsers30d', coalesce(redemptions.redeeming_users_30d, 0),
        'repeatRedeemers', coalesce(redemptions.repeat_redeemers, 0)
      ),
      'engagement', jsonb_build_object(
        'appOpenDays30d', coalesce(activity.app_open_days_30d, 0),
        'averageOpenDaysPerActive', coalesce(activity.average_open_days_per_active, 0),
        'recurrentUsers30d', coalesce(activity.recurrent_users_30d, 0),
        'validatedSteps30d', coalesce(activity.validated_steps_30d, 0),
        'averageStepsPerActiveDay', coalesce(activity.average_steps_per_active_day, 0),
        'pasitosEarned30d', coalesce(activity.pasitos_earned_30d, 0),
        'pushReachableUsers', coalesce(push.reachable_users, 0)
      ),
      'challengePerformance', jsonb_build_object(
        'challenges', coalesce(challenge.challenges, 0),
        'participantUsers', coalesce(challenge.participant_users, 0),
        'participations', coalesce(challenge.participations, 0),
        'instagramShares', coalesce(challenge.instagram_shares, 0),
        'winners', coalesce(challenge.winners, 0),
        'validatedSteps', coalesce(challenge_steps.validated_steps, 0),
        'topChallenges', coalesce(top_challenge.rows, '[]'::jsonb)
      )
    )
  )
    into v_rows
  from countries country
  left join activity_totals activity using (country_code)
  left join push_totals push using (country_code)
  left join redemption_totals redemptions using (country_code)
  left join challenge_totals challenge using (country_code)
  left join challenge_step_totals challenge_steps using (country_code)
  left join top_challenges top_challenge using (country_code);

  -- Small separate write of the two snapshot rows.
  update public.brand_data_room_snapshots snapshot
     set payload = jsonb_set(
       snapshot.payload,
       '{headline}',
       coalesce(snapshot.payload -> 'headline', '{}'::jsonb) || (v_rows -> snapshot.country_code -> 'headline'),
       true
     ) || jsonb_build_object(
       'engagement', v_rows -> snapshot.country_code -> 'engagement',
       'challengePerformance', v_rows -> snapshot.country_code -> 'challengePerformance'
     ),
         refreshed_at = pg_catalog.now()
   where snapshot.country_code in ('AR', 'UY');
end;
$$;

revoke all on function public.refresh_brand_data_room_core_snapshots() from public, anon, authenticated;
revoke all on function public.refresh_brand_data_room_engagement_snapshots() from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_core_snapshots() to service_role;
grant execute on function public.refresh_brand_data_room_engagement_snapshots() to service_role;
