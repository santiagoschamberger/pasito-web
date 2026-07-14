-- Extend the private brand snapshot with verified engagement and activation
-- metrics. The original demographic/redemption refresh remains isolated as a
-- core function; this wrapper enriches its JSON payload without duplicating
-- the already-applied migration.

alter function public.refresh_brand_data_room_snapshots()
  rename to refresh_brand_data_room_core_snapshots;

revoke all on function public.refresh_brand_data_room_core_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_core_snapshots()
  to service_role;

create or replace function public.refresh_brand_data_room_snapshots()
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '9min'
as $$
begin
  perform public.refresh_brand_data_room_core_snapshots();

  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  country_profiles as materialized (
    select p.id, p.country_code
    from public.profiles p
    where p.country_code in ('AR', 'UY')
  ),
  activity_30d as materialized (
    select
      cp.country_code,
      da.user_id,
      da.date,
      da.validated_steps,
      da.pasitos_earned
    from public.daily_activity da
    join country_profiles cp on cp.id = da.user_id
    where da.date >= current_date - 29
      and da.opened_app = true
  ),
  activity_by_user as materialized (
    select country_code, user_id, count(*)::bigint as open_days
    from activity_30d
    group by country_code, user_id
  ),
  activity_totals as (
    select
      a.country_code,
      count(*)::bigint as app_open_days_30d,
      count(distinct a.user_id)::bigint as active_users_30d,
      coalesce(sum(a.validated_steps), 0)::bigint as validated_steps_30d,
      coalesce(sum(a.pasitos_earned), 0)::bigint as pasitos_earned_30d,
      round(avg(a.validated_steps), 0)::bigint as average_steps_per_active_day
    from activity_30d a
    group by a.country_code
  ),
  activity_frequency as (
    select
      country_code,
      round(avg(open_days), 1) as average_open_days_per_active,
      count(*) filter (where open_days >= 8)::bigint as recurrent_users_30d
    from activity_by_user
    group by country_code
  ),
  daily_active_rows as (
    select country_code, date, count(distinct user_id)::bigint as users
    from activity_30d
    group by country_code, date
  ),
  daily_active_trends as (
    select
      country_code,
      jsonb_agg(
        jsonb_build_object('date', to_char(date, 'YYYY-MM-DD'), 'count', users)
        order by date
      ) as rows
    from daily_active_rows
    group by country_code
  ),
  push_totals as (
    select cp.country_code, count(distinct d.user_id)::bigint as reachable_users
    from public.user_push_devices d
    join country_profiles cp on cp.id = d.user_id
    where d.disabled_at is null
      and d.permission_status = 'granted'
    group by cp.country_code
  ),
  notification_by_type as materialized (
    select
      cp.country_code,
      nd.type,
      count(*)::bigint as sent,
      count(*) filter (where nd.status = 'opened')::bigint as opened
    from public.notification_deliveries nd
    join country_profiles cp on cp.id = nd.user_id
    where nd.status in ('sent', 'opened')
      and nd.sent_at >= now() - interval '30 days'
    group by cp.country_code, nd.type
  ),
  notification_totals as (
    select country_code, sum(sent)::bigint as sent, sum(opened)::bigint as opened
    from notification_by_type
    group by country_code
  ),
  notification_ranked as (
    select
      country_code,
      type,
      sent,
      opened,
      row_number() over (partition by country_code order by sent desc, type) as position
    from notification_by_type
  ),
  notification_breakdowns as (
    select
      country_code,
      jsonb_agg(
        jsonb_build_object('type', type, 'sent', sent, 'opened', opened)
        order by sent desc, type
      ) as rows
    from notification_ranked
    where position <= 6
    group by country_code
  ),
  redemption_by_user as materialized (
    select
      r.country_code,
      c.user_id,
      count(*)::bigint as redemptions,
      count(*) filter (where c.used_at >= now() - interval '30 days')::bigint as recent_redemptions
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
      cp.country_code,
      ch.id as challenge_id,
      ch.title,
      ch.brand_name,
      participant.user_id,
      participant.instagram_shared,
      participant.won
    from public.challenge_participants participant
    join public.challenges ch on ch.id = participant.challenge_id
    join country_profiles cp on cp.id = participant.user_id
    where cp.country_code = any(ch.country_codes)
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
      cp.country_code,
      activity.challenge_id,
      coalesce(sum(activity.validated_steps), 0)::bigint as validated_steps
    from public.challenge_participant_activity_snapshots activity
    join public.challenges ch on ch.id = activity.challenge_id
    join country_profiles cp on cp.id = activity.user_id
    where cp.country_code = any(ch.country_codes)
    group by cp.country_code, activity.challenge_id
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
  update public.brand_data_room_snapshots snapshot
     set payload = jsonb_set(
       snapshot.payload,
       '{headline}',
       coalesce(snapshot.payload -> 'headline', '{}'::jsonb) || jsonb_build_object(
         'redeemingUsers30d', coalesce(redemptions.redeeming_users_30d, 0),
         'repeatRedeemers', coalesce(redemptions.repeat_redeemers, 0)
       ),
       true
     ) || jsonb_build_object(
       'engagement', jsonb_build_object(
         'appOpenDays30d', coalesce(activity.app_open_days_30d, 0),
         'averageOpenDaysPerActive', coalesce(frequency.average_open_days_per_active, 0),
         'recurrentUsers30d', coalesce(frequency.recurrent_users_30d, 0),
         'validatedSteps30d', coalesce(activity.validated_steps_30d, 0),
         'averageStepsPerActiveDay', coalesce(activity.average_steps_per_active_day, 0),
         'pasitosEarned30d', coalesce(activity.pasitos_earned_30d, 0),
         'pushReachableUsers', coalesce(push.reachable_users, 0),
         'notificationsSent30d', coalesce(notifications.sent, 0),
         'notificationsOpened30d', coalesce(notifications.opened, 0)
       ),
       'dailyActiveTrend', coalesce(active_trend.rows, '[]'::jsonb),
       'notificationBreakdown', coalesce(notification_breakdown.rows, '[]'::jsonb),
       'challengePerformance', jsonb_build_object(
         'challenges', coalesce(challenge.challenges, 0),
         'participantUsers', coalesce(challenge.participant_users, 0),
         'participations', coalesce(challenge.participations, 0),
         'instagramShares', coalesce(challenge.instagram_shares, 0),
         'winners', coalesce(challenge.winners, 0),
         'validatedSteps', coalesce(challenge_steps.validated_steps, 0),
         'topChallenges', coalesce(top_challenge.rows, '[]'::jsonb)
       )
     ),
         refreshed_at = now()
    from countries country
    left join activity_totals activity using (country_code)
    left join activity_frequency frequency using (country_code)
    left join daily_active_trends active_trend using (country_code)
    left join push_totals push using (country_code)
    left join notification_totals notifications using (country_code)
    left join notification_breakdowns notification_breakdown using (country_code)
    left join redemption_totals redemptions using (country_code)
    left join challenge_totals challenge using (country_code)
    left join challenge_step_totals challenge_steps using (country_code)
    left join top_challenges top_challenge using (country_code)
   where snapshot.country_code = country.country_code;
end;
$$;

revoke all on function public.refresh_brand_data_room_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_snapshots() is
  'Refreshes private brand snapshots with demographics, redemption, activity, push, and challenge aggregates.';

-- Populate the new fields immediately; the existing five-times-daily cron
-- continues to call this function by name.
select public.refresh_brand_data_room_snapshots();
