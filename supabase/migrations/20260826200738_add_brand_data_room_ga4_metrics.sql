-- Store only aggregate Google Analytics 4 reporting metrics for the private
-- brand data room. Raw GA4 events, device identifiers and user identifiers
-- remain in Google Analytics and are never copied into Supabase.

create table public.brand_data_room_ga4_metrics (
  scope text primary key check (scope in ('ALL', 'AR', 'UY')),
  period_start date not null,
  period_end date not null,
  active_users bigint not null check (active_users >= 0),
  new_users bigint not null check (new_users >= 0),
  sessions bigint not null check (sessions >= 0),
  first_opens bigint not null check (first_opens >= 0),
  average_session_seconds numeric,
  screen_page_views bigint not null check (screen_page_views >= 0),
  source text not null default 'ga4' check (source = 'ga4'),
  refreshed_at timestamptz not null default now(),
  check (period_start <= period_end),
  check (average_session_seconds is null or average_session_seconds >= 0)
);

alter table public.brand_data_room_ga4_metrics enable row level security;

revoke all on table public.brand_data_room_ga4_metrics
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.brand_data_room_ga4_metrics
  to service_role;

comment on table public.brand_data_room_ga4_metrics is
  'Server-only 30-day GA4 aggregates for ALL, Argentina and Uruguay. No raw events or identifiers are stored.';
