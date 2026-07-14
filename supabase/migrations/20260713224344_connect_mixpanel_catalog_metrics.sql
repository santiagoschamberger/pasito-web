-- Store only country/day aggregates from Mixpanel. Raw events and identifiers
-- are processed in the Edge Function and are never persisted in Postgres.

create table if not exists public.brand_data_room_catalog_metrics_daily (
  metric_date date not null,
  country_code text not null check (country_code in ('AR', 'UY')),
  detail_views bigint not null default 0 check (detail_views >= 0),
  detail_viewers bigint not null default 0 check (detail_viewers >= 0),
  catalog_clicks bigint not null default 0 check (catalog_clicks >= 0),
  catalog_clickers bigint not null default 0 check (catalog_clickers >= 0),
  exported_events bigint not null default 0 check (exported_events >= 0),
  source text not null default 'mixpanel' check (source = 'mixpanel'),
  synced_at timestamptz not null default now(),
  primary key (metric_date, country_code)
);

create index if not exists brand_data_room_catalog_metrics_country_date_idx
  on public.brand_data_room_catalog_metrics_daily (country_code, metric_date desc);

alter table public.brand_data_room_catalog_metrics_daily enable row level security;

revoke all on table public.brand_data_room_catalog_metrics_daily
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.brand_data_room_catalog_metrics_daily
  to service_role;

comment on table public.brand_data_room_catalog_metrics_daily is
  'Server-only country/day aggregates from Mixpanel. No raw events or user identifiers are stored.';
comment on column public.brand_data_room_catalog_metrics_daily.detail_views is
  'reward_viewed + partner_viewed events attributed to the country by Mixpanel.';
comment on column public.brand_data_room_catalog_metrics_daily.catalog_clicks is
  'card_tap events on catalog list or map surfaces; excludes clicks inside detail pages.';

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
      coalesce(max(metrics.detail_viewers) filter (
        where metrics.metric_date = current_date - 1
      ), 0)::bigint as detail_viewers_daily,
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
       snapshot.payload,
       '{marketing}',
       coalesce(snapshot.payload -> 'marketing', '{}'::jsonb) || jsonb_build_object(
         'catalogDetailViewsDaily', summary.detail_views_daily,
         'catalogDetailViews30d', summary.detail_views_30d,
         'catalogDetailViewersDaily', summary.detail_viewers_daily,
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
  'Merges verified Mixpanel catalog detail views and catalog clicks into the private brand snapshots.';

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
  perform public.refresh_brand_data_room_catalog_metrics_snapshots();
end;
$$;

revoke all on function public.refresh_brand_data_room_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_snapshots() is
  'Refreshes demographics, engagement, marketing, push and connected catalog analytics snapshots.';

-- Invoke the private Edge Function five minutes before each full data-room
-- refresh. Both values are provisioned in Vault during deployment.
do $$
begin
  perform cron.unschedule('brand-data-room-catalog-sync-five-times-daily');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'brand-data-room-catalog-sync-five-times-daily',
  '55 1,6,11,16,21 * * *',
  $cron$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'brand_data_room_sync_project_url'
      ) || '/functions/v1/sync-catalog-analytics',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'brand_data_room_mixpanel_sync_token'
        )
      ),
      body := jsonb_build_object('source', 'cron'),
      timeout_milliseconds := 120000
    ) as request_id;
  $cron$
);

select public.refresh_brand_data_room_catalog_metrics_snapshots();
