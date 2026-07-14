-- Add explainable timeline context to the DAU chart. Challenge dates come
-- from first-party app configuration; the World Cup marker is an editorial
-- context event and is intentionally labelled separately from app activity.

create or replace function public.refresh_brand_data_room_activity_timeline_snapshots()
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '2min'
as $$
begin
  with
  countries(country_code) as (
    values ('AR'::text), ('UY'::text)
  ),
  challenge_events as (
    select
      country.country_code,
      challenge.start_date as event_date,
      'challenge_start'::text as kind,
      challenge.title as label,
      nullif(pg_catalog.btrim(challenge.brand_name), '') as detail
    from countries country
    join public.challenges challenge
      on country.country_code = any(
        coalesce(challenge.country_codes, array[challenge.country_code])
      )
    where challenge.is_active = true
      and challenge.start_date between public.brand_data_room_reporting_date() - 30
                                   and public.brand_data_room_reporting_date() - 1

    union all

    select
      country.country_code,
      challenge.end_date as event_date,
      'challenge_end'::text as kind,
      challenge.title as label,
      nullif(pg_catalog.btrim(challenge.brand_name), '') as detail
    from countries country
    join public.challenges challenge
      on country.country_code = any(
        coalesce(challenge.country_codes, array[challenge.country_code])
      )
    where challenge.is_active = true
      and challenge.end_date between public.brand_data_room_reporting_date() - 30
                                 and public.brand_data_room_reporting_date() - 1
  ),
  editorial_events(country_code, event_date, kind, label, detail) as (
    values (
      'AR'::text,
      date '2026-07-11',
      'context'::text,
      'Argentina vs. Suiza',
      'Mundial 2026 · Cuartos de final · 22:00'
    )
  ),
  visible_events as (
    select country_code, event_date, kind, label, detail
    from challenge_events

    union all

    select country_code, event_date, kind, label, detail
    from editorial_events
    where event_date between public.brand_data_room_reporting_date() - 30
                         and public.brand_data_room_reporting_date() - 1
  ),
  timelines as (
    select
      country_code,
      jsonb_agg(
        jsonb_build_object(
          'date', pg_catalog.to_char(event_date, 'YYYY-MM-DD'),
          'kind', kind,
          'label', label,
          'detail', detail
        )
        order by event_date,
          case kind when 'challenge_start' then 1 when 'challenge_end' then 2 else 3 end,
          label
      ) as rows
    from visible_events
    group by country_code
  )
  update public.brand_data_room_snapshots snapshot
     set payload = pg_catalog.jsonb_set(
       snapshot.payload,
       '{activityTimeline}',
       coalesce(timeline.rows, '[]'::jsonb),
       true
     ),
         refreshed_at = pg_catalog.now()
    from countries country
    left join timelines timeline using (country_code)
   where snapshot.country_code = country.country_code;
end;
$$;

revoke all on function public.refresh_brand_data_room_activity_timeline_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_activity_timeline_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_activity_timeline_snapshots() is
  'Adds first-party challenge milestones and explicitly-labelled editorial context to private brand snapshots.';

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
  perform public.refresh_brand_data_room_mixpanel_snapshots();
  perform public.refresh_brand_data_room_activity_timeline_snapshots();
end;
$$;

revoke all on function public.refresh_brand_data_room_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_snapshots() is
  'Refreshes demographics, engagement, push, private Mixpanel marketing metrics and activity timeline snapshots.';

select public.refresh_brand_data_room_activity_timeline_snapshots();
