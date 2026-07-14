-- Argentina and Uruguay share UTC-03. Postgres current_date follows UTC in
-- this project, which advances the reporting window at 21:00 local time.
-- Keep every "completed day" metric anchored to the audience's calendar.

create or replace function public.brand_data_room_reporting_date()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (pg_catalog.now() at time zone 'America/Argentina/Buenos_Aires')::date;
$$;

revoke all on function public.brand_data_room_reporting_date()
  from public, anon, authenticated;
grant execute on function public.brand_data_room_reporting_date()
  to service_role;

comment on function public.brand_data_room_reporting_date() is
  'Current calendar date in the shared Argentina/Uruguay reporting timezone.';

-- Recreate the already-defined private refresh functions with the local
-- reporting date. Keeping the replacement here avoids duplicating hundreds of
-- lines of aggregation SQL and remains deterministic in a clean migration run.
do $$
declare
  function_record record;
  function_definition text;
begin
  for function_record in
    select procedure.oid
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'refresh_brand_data_room_core_snapshots',
        'refresh_brand_data_room_engagement_snapshots',
        'refresh_brand_data_room_marketing_snapshots',
        'refresh_brand_data_room_push_snapshots',
        'refresh_brand_data_room_mixpanel_snapshots'
      )
  loop
    function_definition := pg_catalog.pg_get_functiondef(function_record.oid);
    function_definition := pg_catalog.regexp_replace(
      function_definition,
      '\mcurrent_date\M',
      'public.brand_data_room_reporting_date()',
      'gi'
    );
    execute function_definition;
  end loop;
end;
$$;
