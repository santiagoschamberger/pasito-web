-- Keep the push headline and its per-type breakdown on the same completed-day
-- reporting window used by the marketing metrics.

alter function public.refresh_brand_data_room_snapshots()
  rename to refresh_brand_data_room_audience_snapshots;

revoke all on function public.refresh_brand_data_room_audience_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_audience_snapshots()
  to service_role;

create or replace function public.refresh_brand_data_room_push_snapshots()
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
  notification_by_type as materialized (
    select
      cp.country_code,
      nd.type,
      count(*)::bigint as sent,
      count(*) filter (where nd.status = 'opened')::bigint as opened
    from public.notification_deliveries nd
    join country_profiles cp on cp.id = nd.user_id
    where nd.status in ('sent', 'opened')
      and nd.sent_at >= current_date - interval '30 days'
      and nd.sent_at < current_date
    group by cp.country_code, nd.type
  ),
  notification_totals as (
    select
      country_code,
      sum(sent)::bigint as sent,
      sum(opened)::bigint as opened
    from notification_by_type
    group by country_code
  ),
  notification_ranked as (
    select
      country_code,
      type,
      sent,
      opened,
      row_number() over (
        partition by country_code
        order by sent desc, type
      ) as position
    from notification_by_type
  ),
  notification_breakdowns as (
    select
      country_code,
      jsonb_agg(
        jsonb_build_object(
          'type', type,
          'sent', sent,
          'opened', opened
        ) order by sent desc, type
      ) as rows
    from notification_ranked
    where position <= 6
    group by country_code
  )
  update public.brand_data_room_snapshots snapshot
     set payload = jsonb_set(
       snapshot.payload,
       '{engagement}',
       coalesce(snapshot.payload -> 'engagement', '{}'::jsonb) || jsonb_build_object(
         'notificationsSent30d', coalesce(totals.sent, 0),
         'notificationsOpened30d', coalesce(totals.opened, 0)
       ),
       true
     ) || jsonb_build_object(
       'notificationBreakdown', coalesce(breakdown.rows, '[]'::jsonb)
     ),
         refreshed_at = now()
    from countries country
    left join notification_totals totals using (country_code)
    left join notification_breakdowns breakdown using (country_code)
   where snapshot.country_code = country.country_code;
end;
$$;

revoke all on function public.refresh_brand_data_room_push_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_push_snapshots()
  to service_role;

create or replace function public.refresh_brand_data_room_snapshots()
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '9min'
as $$
begin
  perform public.refresh_brand_data_room_audience_snapshots();
  perform public.refresh_brand_data_room_push_snapshots();
end;
$$;

revoke all on function public.refresh_brand_data_room_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_push_snapshots() is
  'Aligns push totals and per-type breakdowns to the same 30 completed calendar days.';

comment on function public.refresh_brand_data_room_snapshots() is
  'Refreshes demographics, engagement, completed-day audience metrics and aligned push reporting.';

select public.refresh_brand_data_room_push_snapshots();
