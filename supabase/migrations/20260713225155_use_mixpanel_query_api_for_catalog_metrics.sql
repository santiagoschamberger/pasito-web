-- The Raw Export contains hundreds of thousands of rows per day and exceeds
-- Edge Runtime CPU limits. Use Mixpanel's calculated Query API instead and
-- retain only totals plus the exact unique clicker count it returns.

alter table public.brand_data_room_catalog_metrics_daily
  drop column if exists detail_viewers;

comment on table public.brand_data_room_catalog_metrics_daily is
  'Server-only country/day aggregates returned by the Mixpanel Query API. No raw events or user identifiers are downloaded or stored.';
comment on column public.brand_data_room_catalog_metrics_daily.exported_events is
  'Audit total equal to detail_views + catalog_clicks for the calculated query response.';

create or replace function public.refresh_brand_data_room_catalog_metrics_snapshots()
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
  summaries as (
    select
      country.country_code,
      count(metrics.metric_date) as covered_days,
      min(metrics.metric_date) as coverage_start_date,
      max(metrics.metric_date) as data_through_date,
      max(metrics.synced_at) as metrics_refreshed_at,
      coalesce(sum(metrics.detail_views) filter (
        where metrics.metric_date between current_date - 30 and current_date - 1
      ), 0)::bigint as detail_views_30d,
      coalesce(sum(metrics.catalog_clicks) filter (
        where metrics.metric_date between current_date - 30 and current_date - 1
      ), 0)::bigint as catalog_clicks_30d,
      coalesce(max(metrics.detail_views) filter (
        where metrics.metric_date = current_date - 1
      ), 0)::bigint as detail_views_daily,
      coalesce(max(metrics.catalog_clicks) filter (
        where metrics.metric_date = current_date - 1
      ), 0)::bigint as catalog_clicks_daily,
      coalesce(max(metrics.catalog_clickers) filter (
        where metrics.metric_date = current_date - 1
      ), 0)::bigint as catalog_clickers_daily
    from countries country
    left join public.brand_data_room_catalog_metrics_daily metrics
      on metrics.country_code = country.country_code
     and metrics.metric_date between current_date - 30 and current_date - 1
    group by country.country_code
  )
  update public.brand_data_room_snapshots snapshot
     set payload = jsonb_set(
       snapshot.payload #- '{marketing,catalogDetailViewersDaily}',
       '{marketing}',
       coalesce(snapshot.payload -> 'marketing', '{}'::jsonb) || jsonb_build_object(
         'catalogDetailViewsDaily', summary.detail_views_daily,
         'catalogDetailViews30d', summary.detail_views_30d,
         'catalogClicksDaily', summary.catalog_clicks_daily,
         'catalogClicks30d', summary.catalog_clicks_30d,
         'catalogClickersDaily', summary.catalog_clickers_daily,
         'catalogCoverageStartDate', case
           when summary.coverage_start_date is null then null
           else to_char(summary.coverage_start_date, 'YYYY-MM-DD')
         end,
         'catalogDataThroughDate', case
           when summary.data_through_date is null then null
           else to_char(summary.data_through_date, 'YYYY-MM-DD')
         end,
         'catalogMetricsRefreshedAt', summary.metrics_refreshed_at,
         'catalogMeasurementStatus', case
           when summary.covered_days > 0 then 'connected'
           else 'pending_firebase_mixpanel_export'
         end
       ),
       true
     ),
         refreshed_at = now()
    from summaries summary
   where snapshot.country_code = summary.country_code;
end;
$$;

revoke all on function public.refresh_brand_data_room_catalog_metrics_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_catalog_metrics_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_catalog_metrics_snapshots() is
  'Merges Mixpanel calculated catalog detail views, catalog clicks and unique daily clickers into private brand snapshots.';

select public.refresh_brand_data_room_catalog_metrics_snapshots();
