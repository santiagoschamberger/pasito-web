-- Add standard marketing audience metrics using completed calendar days.
-- The live app keeps emitting catalogue view/click events to Firebase and
-- Mixpanel; those are deliberately left null until a verifiable export is
-- connected, instead of presenting active users as advertising impressions.

alter function public.refresh_brand_data_room_snapshots()
  rename to refresh_brand_data_room_engagement_snapshots;

revoke all on function public.refresh_brand_data_room_engagement_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_engagement_snapshots()
  to service_role;

create or replace function public.refresh_brand_data_room_marketing_snapshots()
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '9min'
as $$
begin
  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  country_profiles as materialized (
    select p.id, p.country_code
    from public.profiles p
    where p.country_code in ('AR', 'UY')
  ),
  activity_60d as materialized (
    select cp.country_code, da.user_id, da.date
    from public.daily_activity da
    join country_profiles cp on cp.id = da.user_id
    where da.opened_app = true
      and da.date between current_date - 60 and current_date - 1
  ),
  completed_dates as (
    select generated_at::date as date
    from generate_series(
      current_date - 30,
      current_date - 1,
      interval '1 day'
    ) generated_at
  ),
  daily_active_rows as (
    select country_code, date, count(distinct user_id)::bigint as users
    from activity_60d
    where date >= current_date - 30
    group by country_code, date
  ),
  daily_active_complete as materialized (
    select
      country.country_code,
      day.date,
      coalesce(activity.users, 0)::bigint as users
    from countries country
    cross join completed_dates day
    left join daily_active_rows activity
      on activity.country_code = country.country_code
     and activity.date = day.date
  ),
  daily_active_trends as (
    select
      country_code,
      jsonb_agg(
        jsonb_build_object(
          'date', to_char(date, 'YYYY-MM-DD'),
          'count', users
        ) order by date
      ) as rows
    from daily_active_complete
    group by country_code
  ),
  activity_audience as (
    select
      country_code,
      count(distinct user_id) filter (
        where date = current_date - 1
      )::bigint as dau,
      count(distinct user_id) filter (
        where date = current_date - 2
      )::bigint as previous_dau,
      count(distinct user_id) filter (
        where date between current_date - 7 and current_date - 1
      )::bigint as wau,
      count(distinct user_id) filter (
        where date between current_date - 14 and current_date - 8
      )::bigint as previous_wau,
      count(distinct user_id) filter (
        where date between current_date - 30 and current_date - 1
      )::bigint as mau,
      count(distinct user_id) filter (
        where date between current_date - 60 and current_date - 31
      )::bigint as previous_mau
    from activity_60d
    group by country_code
  ),
  activity_summary as (
    select
      country_code,
      round(avg(users), 0)::bigint as average_dau,
      max(users)::bigint as peak_dau,
      sum(users)::bigint as active_person_days
    from daily_active_complete
    group by country_code
  ),
  notification_30d as materialized (
    select
      cp.country_code,
      nd.sent_at::date as date,
      nd.status
    from public.notification_deliveries nd
    join country_profiles cp on cp.id = nd.user_id
    where nd.status in ('sent', 'opened')
      and nd.sent_at >= current_date - interval '30 days'
      and nd.sent_at < current_date
  ),
  notification_summary as (
    select
      country_code,
      count(*)::bigint as sent_30d,
      count(*) filter (where status = 'opened')::bigint as opened_30d,
      count(*) filter (where date = current_date - 1)::bigint as sent_last_day
    from notification_30d
    group by country_code
  )
  update public.brand_data_room_snapshots snapshot
     set payload = snapshot.payload || jsonb_build_object(
       'marketing', jsonb_build_object(
         'dauLastCompleteDay', coalesce(audience.dau, 0),
         'averageDau30d', coalesce(summary.average_dau, 0),
         'peakDau30d', coalesce(summary.peak_dau, 0),
         'wau7d', coalesce(audience.wau, 0),
         'mau30d', coalesce(audience.mau, 0),
         'activePersonDays30d', coalesce(summary.active_person_days, 0),
         'stickinessDauMau', case
           when coalesce(audience.mau, 0) = 0 then 0
           else round(100.0 * summary.average_dau / audience.mau, 1)
         end,
         'dauChange1d', case
           when coalesce(audience.previous_dau, 0) = 0 then null
           else round(100.0 * (audience.dau - audience.previous_dau) / audience.previous_dau, 1)
         end,
         'wauChange7d', case
           when coalesce(audience.previous_wau, 0) = 0 then null
           else round(100.0 * (audience.wau - audience.previous_wau) / audience.previous_wau, 1)
         end,
         'mauChange30d', case
           when coalesce(audience.previous_mau, 0) = 0 then null
           else round(100.0 * (audience.mau - audience.previous_mau) / audience.previous_mau, 1)
         end,
         'pushSendsLastCompleteDay', coalesce(notification.sent_last_day, 0),
         'averagePushSendsPerDay', round(coalesce(notification.sent_30d, 0) / 30.0, 0),
         'pushSends30d', coalesce(notification.sent_30d, 0),
         'pushOpens30d', coalesce(notification.opened_30d, 0),
         'catalogImpressionsDaily', null,
         'catalogImpressions30d', null,
         'catalogClicksDaily', null,
         'catalogClicks30d', null,
         'catalogMeasurementStatus', 'pending_firebase_mixpanel_export'
       ),
       'dailyActiveTrend', coalesce(trend.rows, '[]'::jsonb)
     ),
         refreshed_at = now()
    from countries country
    left join activity_audience audience using (country_code)
    left join activity_summary summary using (country_code)
    left join notification_summary notification using (country_code)
    left join daily_active_trends trend using (country_code)
   where snapshot.country_code = country.country_code;
end;
$$;

revoke all on function public.refresh_brand_data_room_marketing_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_marketing_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_marketing_snapshots() is
  'Adds completed-day DAU, WAU, MAU, stickiness, growth and verified push metrics to current brand snapshots.';

create or replace function public.refresh_brand_data_room_snapshots()
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '9min'
as $$
begin
  perform public.refresh_brand_data_room_engagement_snapshots();
  perform public.refresh_brand_data_room_marketing_snapshots();
end;
$$;

revoke all on function public.refresh_brand_data_room_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_snapshots() is
  'Refreshes all private brand snapshots: core demographics, engagement and completed-day marketing metrics.';

select public.refresh_brand_data_room_marketing_snapshots();
