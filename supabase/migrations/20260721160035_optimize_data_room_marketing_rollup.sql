-- Compute DAU/WAU/MAU from one per-user rollup instead of six independent
-- COUNT(DISTINCT ...) filters over the 60-day activity window.

create or replace function public.refresh_brand_data_room_marketing_snapshots()
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '9min'
as $$
begin
  with
  bounds as materialized (
    select public.brand_data_room_reporting_date() as reporting_date
  ),
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
    cross join bounds b
    where da.opened_app = true
      and da.date between b.reporting_date - 60 and b.reporting_date - 1
  ),
  activity_by_user as materialized (
    select
      activity.country_code,
      activity.user_id,
      bool_or(activity.date = b.reporting_date - 1) as active_last_day,
      bool_or(activity.date = b.reporting_date - 2) as active_previous_day,
      bool_or(activity.date between b.reporting_date - 7 and b.reporting_date - 1) as active_last_7d,
      bool_or(activity.date between b.reporting_date - 14 and b.reporting_date - 8) as active_previous_7d,
      bool_or(activity.date between b.reporting_date - 30 and b.reporting_date - 1) as active_last_30d,
      bool_or(activity.date between b.reporting_date - 60 and b.reporting_date - 31) as active_previous_30d
    from activity_60d activity
    cross join bounds b
    group by activity.country_code, activity.user_id
  ),
  activity_audience as (
    select
      country_code,
      count(*) filter (where active_last_day)::bigint as dau,
      count(*) filter (where active_previous_day)::bigint as previous_dau,
      count(*) filter (where active_last_7d)::bigint as wau,
      count(*) filter (where active_previous_7d)::bigint as previous_wau,
      count(*) filter (where active_last_30d)::bigint as mau,
      count(*) filter (where active_previous_30d)::bigint as previous_mau
    from activity_by_user
    group by country_code
  ),
  completed_dates as (
    select generated_at::date as date
    from bounds b
    cross join generate_series(
      b.reporting_date - 30,
      b.reporting_date - 1,
      interval '1 day'
    ) generated_at
  ),
  daily_active_rows as (
    select activity.country_code, activity.date, count(*)::bigint as users
    from activity_60d activity
    cross join bounds b
    where activity.date >= b.reporting_date - 30
    group by activity.country_code, activity.date
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
    cross join bounds b
    where nd.status in ('sent', 'opened')
      and nd.sent_at >= b.reporting_date - interval '30 days'
      and nd.sent_at < b.reporting_date
  ),
  notification_summary as (
    select
      notification.country_code,
      count(*)::bigint as sent_30d,
      count(*) filter (where notification.status = 'opened')::bigint as opened_30d,
      count(*) filter (where notification.date = b.reporting_date - 1)::bigint as sent_last_day
    from notification_30d notification
    cross join bounds b
    group by notification.country_code
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
  'Adds completed-day DAU, WAU, MAU and push metrics using one per-user activity rollup.';
