import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const migration = readFileSync(
  new URL('../supabase/migrations/20260713190200_brand_data_room.sql', import.meta.url),
  'utf8',
)
const engagementMigration = readFileSync(
  new URL('../supabase/migrations/20260713204055_enrich_brand_data_room_engagement.sql', import.meta.url),
  'utf8',
)
const marketingMigration = readFileSync(
  new URL('../supabase/migrations/20260713210723_add_brand_data_room_marketing_metrics.sql', import.meta.url),
  'utf8',
)
const pushMigration = readFileSync(
  new URL('../supabase/migrations/20260713211958_align_brand_data_room_completed_push_window.sql', import.meta.url),
  'utf8',
)
const catalogMetricsMigration = readFileSync(
  new URL('../supabase/migrations/20260713224344_connect_mixpanel_catalog_metrics.sql', import.meta.url),
  'utf8',
)
const catalogSyncFunction = readFileSync(
  new URL('../supabase/functions/sync-catalog-analytics/index.ts', import.meta.url),
  'utf8',
)
const catalogQueryMigration = readFileSync(
  new URL('../supabase/migrations/20260713225155_use_mixpanel_query_api_for_catalog_metrics.sql', import.meta.url),
  'utf8',
)
const mixpanelMarketingMigration = readFileSync(
  new URL('../supabase/migrations/20260713233500_expand_mixpanel_marketing_signals.sql', import.meta.url),
  'utf8',
)
const reportingTimezoneMigration = readFileSync(
  new URL('../supabase/migrations/20260714002000_align_data_room_reporting_timezone.sql', import.meta.url),
  'utf8',
)
const activityTimelineMigration = readFileSync(
  new URL('../supabase/migrations/20260714003750_add_data_room_activity_timeline.sql', import.meta.url),
  'utf8',
)
const page = readFileSync(new URL('../app/datos/[slug]/page.tsx', import.meta.url), 'utf8')
const dashboard = readFileSync(new URL('../app/datos/[slug]/DataRoomDashboard.tsx', import.meta.url), 'utf8')
const config = readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
const accessRoute = readFileSync(new URL('../app/api/data-room/access/route.ts', import.meta.url), 'utf8')

test('brand data snapshots refresh exactly five times per day', () => {
  assert.match(migration, /'0 2,7,12,17,22 \* \* \*'/)
  assert.match(migration, /refresh_brand_data_room_snapshots/)
})

test('brand data-room tables stay server-only and aggregate small groups', () => {
  assert.match(migration, /enable row level security/g)
  assert.match(migration, /revoke all on table[\s\S]*from public, anon, authenticated/)
  assert.match(migration, /having count\(\*\) >= 20/g)
})

test('brand data pages are excluded from search and HTTP caches', () => {
  assert.match(page, /index: false/)
  assert.match(page, /follow: false/)
  assert.match(config, /X-Robots-Tag/)
  assert.match(config, /private, no-store/)
})

test('the HttpOnly session cookie is available to the page-view API', () => {
  assert.match(accessRoute, /httpOnly: true/)
  assert.match(accessRoute, /path: '\/'/)
})

test('brand engagement uses verified first-party sources and Pasito branding', () => {
  assert.match(engagementMigration, /public\.daily_activity/)
  assert.match(engagementMigration, /public\.notification_deliveries/)
  assert.match(engagementMigration, /public\.challenge_participants/)
  assert.match(engagementMigration, /public\.challenge_participant_activity_snapshots/)
  assert.match(engagementMigration, /security invoker/i)
  assert.match(engagementMigration, /revoke all on function public\.refresh_brand_data_room_snapshots/)
  assert.match(marketingMigration, /current_date - 30[\s\S]*current_date - 1/)
  assert.match(marketingMigration, /averageDau30d/)
  assert.match(marketingMigration, /wau7d/)
  assert.match(marketingMigration, /mau30d/)
  assert.match(marketingMigration, /stickinessDauMau/)
  assert.match(marketingMigration, /catalogImpressionsDaily', null/)
  assert.match(marketingMigration, /pending_firebase_mixpanel_export/)
  assert.match(marketingMigration, /perform public\.refresh_brand_data_room_engagement_snapshots\(\)/)
  assert.match(marketingMigration, /perform public\.refresh_brand_data_room_marketing_snapshots\(\)/)
  assert.match(pushMigration, /nd\.sent_at >= current_date - interval '30 days'/)
  assert.match(pushMigration, /nd\.sent_at < current_date/)
  assert.match(pushMigration, /notificationsSent30d/)
  assert.match(pushMigration, /notificationBreakdown/)
  assert.match(pushMigration, /perform public\.refresh_brand_data_room_audience_snapshots\(\)/)
  assert.match(pushMigration, /perform public\.refresh_brand_data_room_push_snapshots\(\)/)
  assert.match(catalogMetricsMigration, /brand_data_room_catalog_metrics_daily/)
  assert.match(catalogMetricsMigration, /enable row level security/)
  assert.match(catalogMetricsMigration, /revoke all on table public\.brand_data_room_catalog_metrics_daily/)
  assert.match(catalogMetricsMigration, /perform public\.refresh_brand_data_room_catalog_metrics_snapshots\(\)/)
  assert.match(catalogMetricsMigration, /'55 1,6,11,16,21 \* \* \*'/)
  assert.match(catalogSyncFunction, /MIXPANEL_SERVICE_ACCOUNT_SECRET/)
  assert.match(catalogSyncFunction, /mixpanel\.com\/api\/query/)
  assert.match(catalogSyncFunction, /mp_country_code/)
  assert.match(catalogSyncFunction, /CATALOG_CLICK_SURFACES/)
  assert.doesNotMatch(catalogSyncFunction, /api\/2\.0\/export/)
  assert.match(catalogQueryMigration, /drop column if exists detail_viewers/)
  assert.match(catalogQueryMigration, /No raw events or user identifiers are downloaded or stored/)
  assert.match(mixpanelMarketingMigration, /brand_data_room_mixpanel_metrics_daily/)
  assert.match(mixpanelMarketingMigration, /brand_data_room_mixpanel_breakdowns/)
  assert.match(mixpanelMarketingMigration, /enable row level security/)
  assert.match(mixpanelMarketingMigration, /revoke all on table public\.brand_data_room_mixpanel_breakdowns/)
  assert.match(mixpanelMarketingMigration, /mixpanelSessions30d/)
  assert.match(mixpanelMarketingMigration, /mixpanelAverageSessionSeconds/)
  assert.match(mixpanelMarketingMigration, /mixpanelTopViewedRewards/)
  assert.match(mixpanelMarketingMigration, /perform public\.refresh_brand_data_room_mixpanel_snapshots\(\)/)
  assert.match(catalogSyncFunction, /MAX_CONCURRENT_QUERIES = 5/)
  assert.match(catalogSyncFunction, /assertRollingCoverage/)
  assert.match(catalogSyncFunction, /Rolling coverage incomplete/)
  assert.match(catalogSyncFunction, /await assertRollingCoverage\(toDate\)[\s\S]*await refreshSnapshots\(\)/)
  assert.match(catalogSyncFunction, /segmentation\/sum/)
  assert.match(catalogSyncFunction, /\$ae_session/)
  assert.match(catalogSyncFunction, /\$ae_first_open/)
  assert.match(catalogSyncFunction, /map_marker_tap/)
  assert.match(catalogSyncFunction, /filter_changed/)
  assert.match(catalogSyncFunction, /external_link_opened/)
  assert.match(catalogSyncFunction, /reservation_requested/)
  assert.doesNotMatch(catalogSyncFunction, /distinct_id|device_id/)
  assert.match(catalogSyncFunction, /America\/Argentina\/Buenos_Aires/)
  assert.match(reportingTimezoneMigration, /brand_data_room_reporting_date/)
  assert.match(reportingTimezoneMigration, /America\/Argentina\/Buenos_Aires/)
  assert.match(activityTimelineMigration, /public\.challenges/)
  assert.match(activityTimelineMigration, /challenge_start/)
  assert.match(activityTimelineMigration, /challenge_end/)
  assert.match(activityTimelineMigration, /Argentina vs\. Suiza/)
  assert.match(activityTimelineMigration, /security invoker/i)
  assert.match(activityTimelineMigration, /revoke all on function public\.refresh_brand_data_room_activity_timeline_snapshots/)
  assert.match(activityTimelineMigration, /perform public\.refresh_brand_data_room_activity_timeline_snapshots\(\)/)
  assert.match(dashboard, /logo-lime\.svg/)
  assert.match(dashboard, /Audiencia de marketing/)
  assert.match(dashboard, /DAU promedio/)
  assert.match(dashboard, /WAU · 7 días/)
  assert.match(dashboard, /MAU · 30 días/)
  assert.match(dashboard, /Vistas de detalle y clicks de catálogo/)
  assert.match(dashboard, /catalogPeriodLabel/)
  assert.match(dashboard, /el histórico todavía se está completando/)
  assert.match(dashboard, /Comportamiento e intención/)
  assert.match(dashboard, /Sesiones en la app/)
  assert.match(dashboard, /Primeras aperturas/)
  assert.match(dashboard, /Premios más vistos/)
  assert.match(dashboard, /Comercios más vistos/)
  assert.match(dashboard, /sin guardar eventos ni identificadores personales/)
  assert.match(dashboard, /Pasos validados/)
  assert.match(dashboard, /Activaciones de marca/)
  assert.match(dashboard, /no equivale a una impresión publicitaria/)
  assert.match(dashboard, /Eventos para interpretar la curva/)
  assert.match(dashboard, /por sí solos no prueban causalidad/)
})
