-- Expand the country/day Mixpanel aggregate into a broader, marketing-safe
-- dataset. Only totals and low-cardinality/content-name breakdowns are kept;
-- no raw event, distinct_id, device_id or user profile is persisted.

alter table public.brand_data_room_catalog_metrics_daily
  rename to brand_data_room_mixpanel_metrics_daily;

alter index public.brand_data_room_catalog_metrics_country_date_idx
  rename to brand_data_room_mixpanel_metrics_country_date_idx;

alter table public.brand_data_room_mixpanel_metrics_daily
  rename column exported_events to measured_events;

alter table public.brand_data_room_mixpanel_metrics_daily
  add column app_sessions bigint not null default 0 check (app_sessions >= 0),
  add column session_seconds bigint not null default 0 check (session_seconds >= 0),
  add column first_opens bigint not null default 0 check (first_opens >= 0),
  add column sign_ups bigint not null default 0 check (sign_ups >= 0),
  add column map_marker_taps bigint not null default 0 check (map_marker_taps >= 0),
  add column filter_changes bigint not null default 0 check (filter_changes >= 0),
  add column external_link_opens bigint not null default 0 check (external_link_opens >= 0),
  add column social_shares bigint not null default 0 check (social_shares >= 0),
  add column reservation_requests bigint not null default 0 check (reservation_requests >= 0),
  add column reservation_contact_opens bigint not null default 0 check (reservation_contact_opens >= 0);

comment on table public.brand_data_room_mixpanel_metrics_daily is
  'Server-only country/day aggregates returned by the Mixpanel Query API. No raw events or user identifiers are downloaded or stored.';
comment on column public.brand_data_room_mixpanel_metrics_daily.session_seconds is
  'Sum of Mixpanel automatic $ae_session_length values, measured in seconds.';
comment on column public.brand_data_room_mixpanel_metrics_daily.first_opens is
  'Automatic Mixpanel $ae_first_open events attributed to the country.';
comment on column public.brand_data_room_mixpanel_metrics_daily.measured_events is
  'Audit sum of the non-unique event aggregates synchronized for the day and country.';

create table public.brand_data_room_mixpanel_breakdowns (
  country_code text primary key check (country_code in ('AR', 'UY')),
  coverage_start_date date not null,
  data_through_date date not null,
  platform_sessions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(platform_sessions) = 'array'),
  catalog_surfaces jsonb not null default '[]'::jsonb
    check (jsonb_typeof(catalog_surfaces) = 'array'),
  catalog_tabs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(catalog_tabs) = 'array'),
  filter_types jsonb not null default '[]'::jsonb
    check (jsonb_typeof(filter_types) = 'array'),
  top_viewed_rewards jsonb not null default '[]'::jsonb
    check (jsonb_typeof(top_viewed_rewards) = 'array'),
  top_viewed_partners jsonb not null default '[]'::jsonb
    check (jsonb_typeof(top_viewed_partners) = 'array'),
  synced_at timestamptz not null default now(),
  check (coverage_start_date <= data_through_date)
);

alter table public.brand_data_room_mixpanel_breakdowns enable row level security;

revoke all on table public.brand_data_room_mixpanel_breakdowns
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.brand_data_room_mixpanel_breakdowns
  to service_role;

comment on table public.brand_data_room_mixpanel_breakdowns is
  'Current 30-day Mixpanel breakdowns by country. Values are aggregate counts and controlled content labels only.';

create or replace function public.refresh_brand_data_room_mixpanel_snapshots()
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
      min(metrics.metric_date) filter (
        where metrics.detail_views + metrics.catalog_clicks > 0
      ) as catalog_coverage_start_date,
      max(metrics.metric_date) as data_through_date,
      max(metrics.synced_at) as metrics_refreshed_at,
      coalesce(sum(metrics.detail_views), 0)::bigint as detail_views_30d,
      coalesce(sum(metrics.catalog_clicks), 0)::bigint as catalog_clicks_30d,
      coalesce(max(metrics.detail_views) filter (
        where metrics.metric_date = current_date - 1
      ), 0)::bigint as detail_views_daily,
      coalesce(max(metrics.catalog_clicks) filter (
        where metrics.metric_date = current_date - 1
      ), 0)::bigint as catalog_clicks_daily,
      coalesce(max(metrics.catalog_clickers) filter (
        where metrics.metric_date = current_date - 1
      ), 0)::bigint as catalog_clickers_daily,
      coalesce(sum(metrics.app_sessions), 0)::bigint as app_sessions_30d,
      coalesce(sum(metrics.session_seconds), 0)::bigint as session_seconds_30d,
      coalesce(sum(metrics.first_opens), 0)::bigint as first_opens_30d,
      coalesce(sum(metrics.sign_ups), 0)::bigint as sign_ups_30d,
      coalesce(sum(metrics.map_marker_taps), 0)::bigint as map_marker_taps_30d,
      coalesce(sum(metrics.filter_changes), 0)::bigint as filter_changes_30d,
      coalesce(sum(metrics.external_link_opens), 0)::bigint as external_link_opens_30d,
      coalesce(sum(metrics.social_shares), 0)::bigint as social_shares_30d,
      coalesce(sum(metrics.reservation_requests), 0)::bigint as reservation_requests_30d,
      coalesce(sum(metrics.reservation_contact_opens), 0)::bigint as reservation_contact_opens_30d
    from countries country
    left join public.brand_data_room_mixpanel_metrics_daily metrics
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
         'catalogClicksDaily', summary.catalog_clicks_daily,
         'catalogClicks30d', summary.catalog_clicks_30d,
         'catalogClickersDaily', summary.catalog_clickers_daily,
         'catalogCoverageStartDate', case
           when summary.catalog_coverage_start_date is null then null
           else to_char(summary.catalog_coverage_start_date, 'YYYY-MM-DD')
         end,
         'catalogDataThroughDate', case
           when summary.data_through_date is null then null
           else to_char(summary.data_through_date, 'YYYY-MM-DD')
         end,
         'catalogMetricsRefreshedAt', summary.metrics_refreshed_at,
         'catalogMeasurementStatus', case
           when summary.catalog_coverage_start_date is not null then 'connected'
           else 'pending_firebase_mixpanel_export'
         end,
         'mixpanelSessions30d', summary.app_sessions_30d,
         'mixpanelAverageSessionSeconds', case
           when summary.app_sessions_30d = 0 then null
           else round(summary.session_seconds_30d::numeric / summary.app_sessions_30d, 0)
         end,
         'mixpanelFirstOpens30d', summary.first_opens_30d,
         'mixpanelSignUps30d', summary.sign_ups_30d,
         'mixpanelMapMarkerTaps30d', summary.map_marker_taps_30d,
         'mixpanelFilterChanges30d', summary.filter_changes_30d,
         'mixpanelExternalLinkOpens30d', summary.external_link_opens_30d,
         'mixpanelSocialShares30d', summary.social_shares_30d,
         'mixpanelReservationRequests30d', summary.reservation_requests_30d,
         'mixpanelReservationContactOpens30d', summary.reservation_contact_opens_30d,
         'mixpanelPlatformSessions', coalesce(breakdown.platform_sessions, '[]'::jsonb),
         'mixpanelCatalogSurfaces', coalesce(breakdown.catalog_surfaces, '[]'::jsonb),
         'mixpanelCatalogTabs', coalesce(breakdown.catalog_tabs, '[]'::jsonb),
         'mixpanelFilterTypes', coalesce(breakdown.filter_types, '[]'::jsonb),
         'mixpanelTopViewedRewards', coalesce(breakdown.top_viewed_rewards, '[]'::jsonb),
         'mixpanelTopViewedPartners', coalesce(breakdown.top_viewed_partners, '[]'::jsonb),
         'mixpanelCoverageStartDate', case
           when summary.coverage_start_date is null then null
           else to_char(summary.coverage_start_date, 'YYYY-MM-DD')
         end,
         'mixpanelDataThroughDate', case
           when summary.data_through_date is null then null
           else to_char(summary.data_through_date, 'YYYY-MM-DD')
         end,
         'mixpanelMetricsRefreshedAt', greatest(summary.metrics_refreshed_at, breakdown.synced_at),
         'mixpanelBehaviorStatus', case
           when summary.covered_days > 0 and breakdown.country_code is not null then 'connected'
           else 'pending'
         end
       ),
       true
     ),
         refreshed_at = now()
    from summaries summary
    left join public.brand_data_room_mixpanel_breakdowns breakdown
      on breakdown.country_code = summary.country_code
   where snapshot.country_code = summary.country_code;
end;
$$;

revoke all on function public.refresh_brand_data_room_mixpanel_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_mixpanel_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_mixpanel_snapshots() is
  'Merges private Mixpanel audience, discovery, intent and content aggregates into brand snapshots.';

-- Keep the prior RPC as a compatibility wrapper for older deployments.
create or replace function public.refresh_brand_data_room_catalog_metrics_snapshots()
returns void
language plpgsql
security invoker
set search_path = ''
set statement_timeout = '2min'
as $$
begin
  perform public.refresh_brand_data_room_mixpanel_snapshots();
end;
$$;

revoke all on function public.refresh_brand_data_room_catalog_metrics_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_catalog_metrics_snapshots()
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
  perform public.refresh_brand_data_room_mixpanel_snapshots();
end;
$$;

revoke all on function public.refresh_brand_data_room_snapshots()
  from public, anon, authenticated;
grant execute on function public.refresh_brand_data_room_snapshots()
  to service_role;

comment on function public.refresh_brand_data_room_snapshots() is
  'Refreshes demographics, engagement, push and private Mixpanel marketing snapshots.';

select public.refresh_brand_data_room_mixpanel_snapshots();
