-- Make the brand data-room marketing refresh incremental.
--
-- Root cause of the intraday timeouts: every run of
-- refresh_brand_data_room_marketing_snapshots() re-read 60 days of
-- daily_activity (several million index entries plus heap fetches), joined
-- them against a materialized copy of every AR/UY profile (~1.25M rows) and
-- spilled a per-user hash aggregate to disk (~4 GB temp per call). The cron
-- session timeout is 2 minutes, and the function-level statement_timeout does
-- not extend an already running top-level statement, so 4 runs a day failed.
--
-- New model:
--   * brand_data_room_marketing_daily keeps one small aggregate row per
--     country and completed day (DAU, push sends/opens, and the distinct 7/30
--     day audience ending on that day).
--   * The intraday/daily snapshot refresh only recomputes the last few
--     completed days (late syncs / late push opens) and reads everything else
--     from that table. It never scans more than a handful of days.
--   * The distinct WAU/MAU audience (the only part that needs a 30-day scan)
--     is computed per completed day by a separate job, at most twice a day,
--     without materializing profiles and without spilling to disk. Previous
--     windows are read from history instead of being rescanned.
--
-- No new indexes are needed: the existing covering indexes
-- idx_daily_activity_opened_date_user and
-- idx_notification_deliveries_sent_at_user_status serve every scan, and the
-- country of each user is resolved with primary-key lookups on profiles.

create table if not exists public.brand_data_room_marketing_daily (
  country_code text not null check (country_code in ('AR', 'UY')),
  date date not null,
  active_users bigint not null default 0 check (active_users >= 0),
  push_sent bigint not null default 0 check (push_sent >= 0),
  push_opened bigint not null default 0 check (push_opened >= 0),
  -- Distinct users active in [date - 6, date] and [date - 29, date].
  -- Null until refresh_brand_data_room_audience_windows() has run for the day.
  wau_7d bigint check (wau_7d is null or wau_7d >= 0),
  mau_30d bigint check (mau_30d is null or mau_30d >= 0),
  activity_refreshed_at timestamptz,
  push_refreshed_at timestamptz,
  audience_refreshed_at timestamptz,
  primary key (country_code, date)
);

alter table public.brand_data_room_marketing_daily enable row level security;

revoke all on table public.brand_data_room_marketing_daily
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.brand_data_room_marketing_daily
  to service_role;

comment on table public.brand_data_room_marketing_daily is
  'Server-only per-country daily aggregates for the brand data room (no user identifiers).';

-- DAU per country and completed reporting day (America/Argentina/Buenos_Aires
-- dates, as stored in daily_activity). Bounded to 8 days per call.
create or replace function public.refresh_brand_data_room_daily_active_users(
  p_from date,
  p_to date
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 7 then
    raise exception 'refresh_brand_data_room_daily_active_users: range must be 1..8 days (got % .. %)', p_from, p_to;
  end if;

  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  days as (
    select generated_at::date as date
    from pg_catalog.generate_series(p_from, p_to, interval '1 day') generated_at
  ),
  activity as (
    -- (user_id, date) is unique in daily_activity, so each row is one active
    -- person-day. Country comes from a primary-key lookup per row instead of
    -- hashing the whole profiles table.
    select
      (select p.country_code from public.profiles p where p.id = da.user_id) as country_code,
      da.date
    from public.daily_activity da
    where da.opened_app = true
      and da.date between p_from and p_to
  ),
  active_rows as (
    select country_code, date, count(*)::bigint as users
    from activity
    -- No country filter here: a filter on the lookup would make PostgreSQL
    -- evaluate it twice per row. The left join below keeps AR/UY only.
    group by country_code, date
  )
  insert into public.brand_data_room_marketing_daily as target (
    country_code, date, active_users, activity_refreshed_at
  )
  select
    country.country_code,
    day.date,
    coalesce(active.users, 0),
    pg_catalog.now()
  from countries country
  cross join days day
  left join active_rows active
    on active.country_code = country.country_code
   and active.date = day.date
  on conflict (country_code, date) do update
     set active_users = excluded.active_users,
         activity_refreshed_at = excluded.activity_refreshed_at;
end;
$$;

-- Push sends/opens per country and UTC day (same bucketing as the previous
-- rollup, which used sent_at::date in the UTC database timezone). Bounded to
-- 8 days per call.
create or replace function public.refresh_brand_data_room_daily_push(
  p_from date,
  p_to date
)
returns void
language plpgsql
set search_path = ''
set work_mem = '64MB'
as $$
begin
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 7 then
    raise exception 'refresh_brand_data_room_daily_push: range must be 1..8 days (got % .. %)', p_from, p_to;
  end if;

  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  days as (
    select generated_at::date as date
    from pg_catalog.generate_series(p_from, p_to, interval '1 day') generated_at
  ),
  per_user_day as (
    select
      nd.user_id,
      (nd.sent_at at time zone 'UTC')::date as date,
      count(*)::bigint as sent,
      count(*) filter (where nd.status = 'opened')::bigint as opened
    from public.notification_deliveries nd
    where nd.status in ('sent', 'opened')
      and nd.sent_at >= (p_from::timestamp at time zone 'UTC')
      and nd.sent_at < ((p_to + 1)::timestamp at time zone 'UTC')
    group by nd.user_id, (nd.sent_at at time zone 'UTC')::date
  ),
  push_rows as (
    select country_code, date, sum(sent)::bigint as sent, sum(opened)::bigint as opened
    from (
      select
        (select p.country_code from public.profiles p where p.id = u.user_id) as country_code,
        u.date,
        u.sent,
        u.opened
      from per_user_day u
    ) resolved
    group by country_code, date
  )
  insert into public.brand_data_room_marketing_daily as target (
    country_code, date, push_sent, push_opened, push_refreshed_at
  )
  select
    country.country_code,
    day.date,
    coalesce(push.sent, 0),
    coalesce(push.opened, 0),
    pg_catalog.now()
  from countries country
  cross join days day
  left join push_rows push
    on push.country_code = country.country_code
   and push.date = day.date
  on conflict (country_code, date) do update
     set push_sent = excluded.push_sent,
         push_opened = excluded.push_opened,
         push_refreshed_at = excluded.push_refreshed_at;
end;
$$;

-- Distinct 7-day and 30-day audience ending on p_date (inclusive). This is the
-- only 30-day scan left; it aggregates by user first (no profiles hash, no
-- materialized CTEs) with enough work_mem to stay in memory.
create or replace function public.refresh_brand_data_room_audience_window(
  p_date date
)
returns void
language plpgsql
set search_path = ''
set work_mem = '128MB'
as $$
begin
  if p_date is null or p_date >= public.brand_data_room_reporting_date() then
    raise exception 'refresh_brand_data_room_audience_window: % is not a completed reporting day', p_date;
  end if;

  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  per_user as (
    select
      da.user_id,
      bool_or(da.date >= p_date - 6) as active_7d
    from public.daily_activity da
    where da.opened_app = true
      and da.date between p_date - 29 and p_date
    group by da.user_id
  ),
  audience as (
    select
      country_code,
      count(*) filter (where active_7d)::bigint as wau,
      count(*)::bigint as mau
    from (
      select
        (select p.country_code from public.profiles p where p.id = u.user_id) as country_code,
        u.active_7d
      from per_user u
    ) resolved
    group by country_code
  )
  insert into public.brand_data_room_marketing_daily as target (
    country_code, date, wau_7d, mau_30d, audience_refreshed_at
  )
  select
    country.country_code,
    p_date,
    coalesce(audience.wau, 0),
    coalesce(audience.mau, 0),
    pg_catalog.now()
  from countries country
  left join audience using (country_code)
  on conflict (country_code, date) do update
     set wau_7d = excluded.wau_7d,
         mau_30d = excluded.mau_30d,
         audience_refreshed_at = excluded.audience_refreshed_at;
end;
$$;

-- Scheduled audience job: recompute the distinct audience window ending on
-- the last completed day.
create or replace function public.refresh_brand_data_room_audience_windows()
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.refresh_brand_data_room_audience_window(
    public.brand_data_room_reporting_date() - 1
  );
end;
$$;

-- Cold-start helper: the change metrics compare against the windows ending 7
-- and 30 days earlier, which are normally already stored from those days. If
-- one is missing, compute at most one per call so every statement stays
-- bounded. Once 30 days of history exist this is a cheap no-op.
create or replace function public.backfill_brand_data_room_audience_anchor()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_last date := public.brand_data_room_reporting_date() - 1;
  v_anchor date;
begin
  foreach v_anchor in array array[v_last - 7, v_last - 30] loop
    if not exists (
      select 1
      from public.brand_data_room_marketing_daily d
      where d.date = v_anchor
        and d.mau_30d is not null
    ) then
      perform public.refresh_brand_data_room_audience_window(v_anchor);
      return;
    end if;
  end loop;
end;
$$;

-- Snapshot refresh used by the intraday and daily cron jobs. It recomputes
-- only recent completed days (late syncs and late push opens), backfills at
-- most a few missing days, and builds the payload from the daily table.
create or replace function public.refresh_brand_data_room_marketing_snapshots()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_reporting_date date := public.brand_data_room_reporting_date();
  v_last date := v_reporting_date - 1;
  v_missing date;
  v_backfilled integer := 0;
begin
  -- Yesterday's activity can still change after midnight (offline syncs);
  -- push opens keep arriving for a few days.
  perform public.refresh_brand_data_room_daily_active_users(v_last, v_last);
  perform public.refresh_brand_data_room_daily_push(v_last - 2, v_last);

  -- Bounded self-healing for days that were never computed (cold start or a
  -- missed run): at most 3 days per run.
  for v_missing in
    select day::date
    from pg_catalog.generate_series(v_last - 30, v_last - 2, interval '1 day') day
    where not exists (
      select 1
      from public.brand_data_room_marketing_daily d
      where d.date = day::date
        and d.activity_refreshed_at is not null
        and d.push_refreshed_at is not null
    )
    order by day desc
    limit 3
  loop
    perform public.refresh_brand_data_room_daily_active_users(v_missing, v_missing);
    perform public.refresh_brand_data_room_daily_push(v_missing, v_missing);
    v_backfilled := v_backfilled + 1;
  end loop;

  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  completed_dates as (
    select generated_at::date as date
    from pg_catalog.generate_series(v_last - 29, v_last, interval '1 day') generated_at
  ),
  daily as (
    select
      country.country_code,
      day.date,
      coalesce(d.active_users, 0)::bigint as users,
      coalesce(d.push_sent, 0)::bigint as push_sent,
      coalesce(d.push_opened, 0)::bigint as push_opened
    from countries country
    cross join completed_dates day
    left join public.brand_data_room_marketing_daily d
      on d.country_code = country.country_code
     and d.date = day.date
  ),
  activity_summary as (
    select
      country_code,
      round(avg(users), 0)::bigint as average_dau,
      max(users)::bigint as peak_dau,
      sum(users)::bigint as active_person_days,
      sum(push_sent)::bigint as sent_30d,
      sum(push_opened)::bigint as opened_30d,
      max(users) filter (where date = v_last)::bigint as dau,
      max(push_sent) filter (where date = v_last)::bigint as sent_last_day
    from daily
    group by country_code
  ),
  previous_day as (
    select d.country_code, d.active_users as previous_dau
    from public.brand_data_room_marketing_daily d
    where d.date = v_last - 1
  ),
  latest_audience as (
    -- Normally the window ending yesterday; if today's audience job has not
    -- run yet, fall back to the most recent computed day.
    select distinct on (d.country_code)
      d.country_code,
      d.date,
      d.wau_7d,
      d.mau_30d
    from public.brand_data_room_marketing_daily d
    where d.date between v_last - 7 and v_last
      and d.mau_30d is not null
    order by d.country_code, d.date desc
  ),
  audience as (
    select
      latest.country_code,
      latest.wau_7d as wau,
      latest.mau_30d as mau,
      previous_week.wau_7d as previous_wau,
      previous_month.mau_30d as previous_mau
    from latest_audience latest
    left join public.brand_data_room_marketing_daily previous_week
      on previous_week.country_code = latest.country_code
     and previous_week.date = latest.date - 7
    left join public.brand_data_room_marketing_daily previous_month
      on previous_month.country_code = latest.country_code
     and previous_month.date = latest.date - 30
  ),
  daily_active_trends as (
    select
      country_code,
      jsonb_agg(
        jsonb_build_object(
          'date', pg_catalog.to_char(date, 'YYYY-MM-DD'),
          'count', users
        ) order by date
      ) as rows
    from daily
    group by country_code
  )
  update public.brand_data_room_snapshots snapshot
     set payload = snapshot.payload || jsonb_build_object(
       'marketing', jsonb_build_object(
         'dauLastCompleteDay', coalesce(summary.dau, 0),
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
           when coalesce(previous_day.previous_dau, 0) = 0 then null
           else round(100.0 * (summary.dau - previous_day.previous_dau) / previous_day.previous_dau, 1)
         end,
         'wauChange7d', case
           when coalesce(audience.previous_wau, 0) = 0 then null
           else round(100.0 * (audience.wau - audience.previous_wau) / audience.previous_wau, 1)
         end,
         'mauChange30d', case
           when coalesce(audience.previous_mau, 0) = 0 then null
           else round(100.0 * (audience.mau - audience.previous_mau) / audience.previous_mau, 1)
         end,
         'pushSendsLastCompleteDay', coalesce(summary.sent_last_day, 0),
         'averagePushSendsPerDay', round(coalesce(summary.sent_30d, 0) / 30.0, 0),
         'pushSends30d', coalesce(summary.sent_30d, 0),
         'pushOpens30d', coalesce(summary.opened_30d, 0),
         'catalogImpressionsDaily', null,
         'catalogImpressions30d', null,
         'catalogClicksDaily', null,
         'catalogClicks30d', null,
         'catalogMeasurementStatus', 'pending_firebase_mixpanel_export'
       ),
       'dailyActiveTrend', coalesce(trend.rows, '[]'::jsonb)
     ),
         refreshed_at = pg_catalog.now()
    from countries country
    left join activity_summary summary using (country_code)
    left join previous_day using (country_code)
    left join audience using (country_code)
    left join daily_active_trends trend using (country_code)
   where snapshot.country_code = country.country_code;
end;
$$;

revoke all on function public.refresh_brand_data_room_daily_active_users(date, date) from public, anon, authenticated;
revoke all on function public.refresh_brand_data_room_daily_push(date, date) from public, anon, authenticated;
revoke all on function public.refresh_brand_data_room_audience_window(date) from public, anon, authenticated;
revoke all on function public.refresh_brand_data_room_audience_windows() from public, anon, authenticated;
revoke all on function public.backfill_brand_data_room_audience_anchor() from public, anon, authenticated;
revoke all on function public.refresh_brand_data_room_marketing_snapshots() from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_daily_active_users(date, date) to service_role;
grant execute on function public.refresh_brand_data_room_daily_push(date, date) to service_role;
grant execute on function public.refresh_brand_data_room_audience_window(date) to service_role;
grant execute on function public.refresh_brand_data_room_audience_windows() to service_role;
grant execute on function public.backfill_brand_data_room_audience_anchor() to service_role;
grant execute on function public.refresh_brand_data_room_marketing_snapshots() to service_role;

-- Distinct WAU/MAU: after the day closes (08:40 ART, before the 09:00 daily
-- snapshot) and once more in the evening (19:40 ART) so late syncs converge.
-- The anchor backfill runs as its own job so each statement keeps its own
-- bounded budget and a slow backfill can never roll back the main window.
do $$
begin
  perform cron.unschedule('refresh-brand-data-room-audience-windows');
exception
  when others then null;
end;
$$;

do $$
begin
  perform cron.unschedule('backfill-brand-data-room-audience-anchors');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'refresh-brand-data-room-audience-windows',
  '40 11,22 * * *',
  $cron$
    set statement_timeout = '5min';
    select public.refresh_brand_data_room_audience_windows();
    select public.refresh_brand_data_room_marketing_snapshots();
  $cron$
);

select cron.schedule(
  'backfill-brand-data-room-audience-anchors',
  '50 11,22 * * *',
  $cron$
    set statement_timeout = '5min';
    select public.backfill_brand_data_room_audience_anchor();
    select public.refresh_brand_data_room_marketing_snapshots();
  $cron$
);
