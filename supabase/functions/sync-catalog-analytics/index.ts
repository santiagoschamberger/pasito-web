import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

type CountryCode = 'AR' | 'UY'
type QueryType = 'general' | 'unique'

type CountDatum = {
  label: string
  count: number
}

type DailyMetric = {
  metric_date: string
  country_code: CountryCode
  detail_views: number
  catalog_clicks: number
  catalog_clickers: number
  app_sessions: number
  session_seconds: number
  first_opens: number
  sign_ups: number
  map_marker_taps: number
  filter_changes: number
  external_link_opens: number
  social_shares: number
  reservation_requests: number
  reservation_contact_opens: number
  measured_events: number
  source: 'mixpanel'
  synced_at: string
}

type BreakdownMetric = {
  country_code: CountryCode
  coverage_start_date: string
  data_through_date: string
  platform_sessions: CountDatum[]
  catalog_surfaces: CountDatum[]
  catalog_tabs: CountDatum[]
  filter_types: CountDatum[]
  top_viewed_rewards: CountDatum[]
  top_viewed_partners: CountDatum[]
  synced_at: string
}

type StoredMetricDate = {
  metric_date: string
  country_code: CountryCode
}

type SegmentationResponse = {
  data?: {
    series?: string[]
    values?: Record<string, Record<string, number>>
  }
}

type NumericResponse = {
  results?: Record<string, number>
}

type NamedQuery = {
  key: string
  event: string
  type?: QueryType
  where?: string
}

type BreakdownQuery = {
  column: keyof Pick<
    BreakdownMetric,
    | 'platform_sessions'
    | 'catalog_surfaces'
    | 'catalog_tabs'
    | 'filter_types'
    | 'top_viewed_rewards'
    | 'top_viewed_partners'
  >
  event: string
  property: string
  limit: number
  where?: string
}

const COUNTRIES: CountryCode[] = ['AR', 'UY']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS_PER_REQUEST = 30
const MAX_CONCURRENT_QUERIES = 5
const REPORTING_TIME_ZONE = 'America/Argentina/Buenos_Aires'
const MIXPANEL_COUNTRY_EXPRESSION = 'properties["mp_country_code"]'
const CATALOG_CLICK_SURFACES = [
  'catalog_locales',
  'catalog_online',
  'catalog_recompensas',
  'catalog_reservas',
  'catalog_descuentos',
  'partners_map',
] as const
const CATALOG_CLICK_WHERE = CATALOG_CLICK_SURFACES
  .map((surface) => `properties["surface"] == "${surface}"`)
  .join(' or ')
const DAILY_QUERIES: NamedQuery[] = [
  { key: 'rewardViews', event: 'reward_viewed' },
  { key: 'partnerViews', event: 'partner_viewed' },
  { key: 'catalogClicks', event: 'card_tap', where: CATALOG_CLICK_WHERE },
  { key: 'catalogClickers', event: 'card_tap', type: 'unique', where: CATALOG_CLICK_WHERE },
  { key: 'appSessions', event: '$ae_session' },
  { key: 'firstOpens', event: '$ae_first_open' },
  { key: 'signUps', event: 'sign_up' },
  { key: 'mapMarkerTaps', event: 'map_marker_tap' },
  { key: 'filterChanges', event: 'filter_changed' },
  { key: 'externalLinkOpens', event: 'external_link_opened' },
  { key: 'redemptionShares', event: 'instagram_share' },
  { key: 'challengeShares', event: 'challenge_ig_shared' },
  { key: 'reservationRequests', event: 'reservation_requested' },
  { key: 'reservationContactOpens', event: 'reservation_contact_opened' },
]
const BREAKDOWN_QUERIES: BreakdownQuery[] = [
  { column: 'platform_sessions', event: '$ae_session', property: 'platform', limit: 4 },
  {
    column: 'catalog_surfaces',
    event: 'card_tap',
    property: 'surface',
    limit: CATALOG_CLICK_SURFACES.length,
    where: CATALOG_CLICK_WHERE,
  },
  { column: 'catalog_tabs', event: 'catalog_tab_changed', property: 'tab', limit: 8 },
  { column: 'filter_types', event: 'filter_changed', property: 'filter_type', limit: 8 },
  { column: 'top_viewed_rewards', event: 'reward_viewed', property: 'reward_title', limit: 8 },
  { column: 'top_viewed_partners', event: 'partner_viewed', property: 'partner_name', limit: 8 },
]

function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder()
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  let mismatch = leftBytes.length ^ rightBytes.length
  const length = Math.max(leftBytes.length, rightBytes.length)

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0)
  }

  return mismatch === 0
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatReportingDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORTING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function addUtcDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return formatUtcDate(parsed)
}

function dateRange(fromDate: string, toDate: string): string[] {
  if (!DATE_PATTERN.test(fromDate) || !DATE_PATTERN.test(toDate)) {
    throw new Error('Dates must use YYYY-MM-DD')
  }

  const dates: string[] = []
  for (let date = fromDate; date <= toDate; date = addUtcDays(date, 1)) {
    dates.push(date)
    if (dates.length > MAX_DAYS_PER_REQUEST) {
      throw new Error(`A sync request may cover at most ${MAX_DAYS_PER_REQUEST} days`)
    }
  }

  if (dates.length === 0) throw new Error('fromDate must be on or before toDate')
  return dates
}

function basicAuthorization(username: string, secret: string): string {
  const bytes = new TextEncoder().encode(`${username}:${secret}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

function propertyExpression(property: string): string {
  if (!/^[A-Za-z0-9_$]+$/.test(property)) throw new Error('Invalid Mixpanel property name')
  return `properties["${property}"]`
}

function countryWhere(countryCode: CountryCode): string {
  return `${MIXPANEL_COUNTRY_EXPRESSION} == "${countryCode}"`
}

function combineWhere(...clauses: Array<string | undefined>): string | undefined {
  const present = clauses.filter((clause): clause is string => Boolean(clause))
  return present.length ? present.map((clause) => `(${clause})`).join(' and ') : undefined
}

async function mixpanelQuery(
  path: string,
  params: URLSearchParams,
): Promise<unknown> {
  const response = await fetch(`https://mixpanel.com/api/query${path}?${params}`, {
    headers: {
      authorization: basicAuthorization(
        env('MIXPANEL_SERVICE_ACCOUNT_USERNAME'),
        env('MIXPANEL_SERVICE_ACCOUNT_SECRET'),
      ),
      accept: 'application/json',
    },
  })
  if (!response.ok) {
    const upstreamBody = await response.text()
    let upstreamMessage = upstreamBody
    try {
      const parsed = JSON.parse(upstreamBody) as { error?: unknown; message?: unknown }
      if (typeof parsed.error === 'string') upstreamMessage = parsed.error
      else if (typeof parsed.message === 'string') upstreamMessage = parsed.message
    } catch {
      // Some upstream failures are plain text; preserve their compact form.
    }
    upstreamMessage = upstreamMessage.replace(/\s+/g, ' ').trim().slice(0, 240)
    throw new Error(
      `Mixpanel query ${path} failed with HTTP ${response.status}${upstreamMessage ? `: ${upstreamMessage}` : ''}`,
    )
  }
  return response.json()
}

async function querySegmentation({
  event,
  fromDate,
  toDate,
  type = 'general',
  on = MIXPANEL_COUNTRY_EXPRESSION,
  where,
  limit = 100,
}: {
  event: string
  fromDate: string
  toDate: string
  type?: QueryType
  on?: string
  where?: string
  limit?: number
}): Promise<SegmentationResponse> {
  const params = new URLSearchParams({
    project_id: env('MIXPANEL_PROJECT_ID'),
    event,
    from_date: fromDate,
    to_date: toDate,
    on,
    unit: 'day',
    type,
    limit: String(limit),
  })
  if (where) params.set('where', where)

  const payload = await mixpanelQuery('/segmentation', params) as SegmentationResponse
  if (!payload.data?.values || typeof payload.data.values !== 'object') {
    throw new Error('Mixpanel segmentation query returned an invalid response')
  }
  return payload
}

async function queryNumericSum({
  event,
  numericProperty,
  countryCode,
  fromDate,
  toDate,
}: {
  event: string
  numericProperty: string
  countryCode: CountryCode
  fromDate: string
  toDate: string
}): Promise<NumericResponse> {
  const params = new URLSearchParams({
    project_id: env('MIXPANEL_PROJECT_ID'),
    event,
    from_date: fromDate,
    to_date: toDate,
    on: propertyExpression(numericProperty),
    where: countryWhere(countryCode),
    unit: 'day',
  })
  const payload = await mixpanelQuery('/segmentation/sum', params) as NumericResponse
  if (!payload.results || typeof payload.results !== 'object') {
    throw new Error('Mixpanel numeric query returned an invalid response')
  }
  return payload
}

async function runInBatches<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let index = 0; index < items.length; index += MAX_CONCURRENT_QUERIES) {
    const batch = items.slice(index, index + MAX_CONCURRENT_QUERIES)
    results.push(...await Promise.all(batch.map(worker)))
  }
  return results
}

function segmentationValue(
  payload: SegmentationResponse,
  series: string,
  date: string,
): number {
  const value = payload.data?.values?.[series]?.[date] ?? 0
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

function numericValue(payload: NumericResponse, date: string): number {
  const value = payload.results?.[date] ?? 0
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
}

function breakdownRows(payload: SegmentationResponse, limit: number): CountDatum[] {
  const ignoredLabels = new Set(['', '$undefined', 'undefined', '(not set)', 'null'])
  return Object.entries(payload.data?.values ?? {})
    .map(([label, dailyValues]) => ({
      label: label.trim(),
      count: Object.values(dailyValues).reduce((total, value) => total + (Number(value) || 0), 0),
    }))
    .filter((row) => row.count > 0 && !ignoredLabels.has(row.label.toLowerCase()))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit)
    .map((row) => ({ ...row, count: Math.round(row.count) }))
}

async function queryDailyMetrics(fromDate: string, toDate: string): Promise<{
  payloads: Record<string, SegmentationResponse>
  sessionSeconds: Record<CountryCode, NumericResponse>
}> {
  const queryResults = await runInBatches(DAILY_QUERIES, async (query) => ({
    key: query.key,
    payload: await querySegmentation({
      event: query.event,
      fromDate,
      toDate,
      type: query.type,
      where: query.where,
    }),
  }))
  const payloads = Object.fromEntries(queryResults.map((result) => [result.key, result.payload]))

  const durationResults = await runInBatches(COUNTRIES, async (countryCode) => ({
    countryCode,
    payload: await queryNumericSum({
      event: '$ae_session',
      numericProperty: '$ae_session_length',
      countryCode,
      fromDate,
      toDate,
    }),
  }))
  const sessionSeconds = Object.fromEntries(
    durationResults.map((result) => [result.countryCode, result.payload]),
  ) as Record<CountryCode, NumericResponse>

  return { payloads, sessionSeconds }
}

async function queryBreakdowns(
  fromDate: string,
  toDate: string,
  syncedAt: string,
): Promise<BreakdownMetric[]> {
  const queries = COUNTRIES.flatMap((countryCode) => BREAKDOWN_QUERIES.map((query) => ({
    countryCode,
    query,
  })))
  const results = await runInBatches(queries, async ({ countryCode, query }) => ({
    countryCode,
    column: query.column,
    rows: breakdownRows(
      await querySegmentation({
        event: query.event,
        fromDate,
        toDate,
        on: propertyExpression(query.property),
        where: combineWhere(countryWhere(countryCode), query.where),
        limit: query.limit,
      }),
      query.limit,
    ),
  }))

  return COUNTRIES.map((countryCode) => {
    const byColumn = Object.fromEntries(
      results
        .filter((result) => result.countryCode === countryCode)
        .map((result) => [result.column, result.rows]),
    )
    return {
      country_code: countryCode,
      coverage_start_date: fromDate,
      data_through_date: toDate,
      platform_sessions: byColumn.platform_sessions ?? [],
      catalog_surfaces: byColumn.catalog_surfaces ?? [],
      catalog_tabs: byColumn.catalog_tabs ?? [],
      filter_types: byColumn.filter_types ?? [],
      top_viewed_rewards: byColumn.top_viewed_rewards ?? [],
      top_viewed_partners: byColumn.top_viewed_partners ?? [],
      synced_at: syncedAt,
    }
  })
}

async function queryMetrics(
  fromDate: string,
  toDate: string,
): Promise<{ daily: DailyMetric[]; breakdowns: BreakdownMetric[] }> {
  const syncedAt = new Date().toISOString()
  const { payloads, sessionSeconds } = await queryDailyMetrics(fromDate, toDate)
  const daily = dateRange(fromDate, toDate).flatMap((date) => COUNTRIES.map((countryCode) => {
    const value = (key: string) => segmentationValue(payloads[key], countryCode, date)
    const detailViews = value('rewardViews') + value('partnerViews')
    const catalogClicks = value('catalogClicks')
    const socialShares = value('redemptionShares') + value('challengeShares')
    const measuredEvents = detailViews
      + catalogClicks
      + value('appSessions')
      + value('firstOpens')
      + value('signUps')
      + value('mapMarkerTaps')
      + value('filterChanges')
      + value('externalLinkOpens')
      + socialShares
      + value('reservationRequests')
      + value('reservationContactOpens')

    return {
      metric_date: date,
      country_code: countryCode,
      detail_views: detailViews,
      catalog_clicks: catalogClicks,
      catalog_clickers: value('catalogClickers'),
      app_sessions: value('appSessions'),
      session_seconds: numericValue(sessionSeconds[countryCode], date),
      first_opens: value('firstOpens'),
      sign_ups: value('signUps'),
      map_marker_taps: value('mapMarkerTaps'),
      filter_changes: value('filterChanges'),
      external_link_opens: value('externalLinkOpens'),
      social_shares: socialShares,
      reservation_requests: value('reservationRequests'),
      reservation_contact_opens: value('reservationContactOpens'),
      measured_events: measuredEvents,
      source: 'mixpanel' as const,
      synced_at: syncedAt,
    }
  }))
  // Daily rows may refresh only the last few completed dates, while the
  // decision-oriented rankings must always represent a full rolling month.
  const breakdowns = await queryBreakdowns(addUtcDays(toDate, -29), toDate, syncedAt)
  return { daily, breakdowns }
}

async function supabaseRequest(path: string, init: RequestInit): Promise<Response> {
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
  return fetch(`${env('SUPABASE_URL')}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      ...(init.headers ?? {}),
    },
  })
}

async function upsertRows(path: string, rows: unknown[]): Promise<void> {
  const response = await supabaseRequest(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!response.ok) throw new Error(`Aggregate upsert failed with HTTP ${response.status}`)
}

async function refreshSnapshots(): Promise<void> {
  const response = await supabaseRequest(
    '/rest/v1/rpc/refresh_brand_data_room_mixpanel_snapshots',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    },
  )
  if (!response.ok) throw new Error(`Snapshot refresh failed with HTTP ${response.status}`)
}

async function assertRollingCoverage(dataThroughDate: string): Promise<void> {
  const coverageStartDate = addUtcDays(dataThroughDate, -(MAX_DAYS_PER_REQUEST - 1))
  const expectedDates = dateRange(coverageStartDate, dataThroughDate)
  const params = new URLSearchParams({ select: 'metric_date,country_code' })
  params.append('metric_date', `gte.${coverageStartDate}`)
  params.append('metric_date', `lte.${dataThroughDate}`)
  const response = await supabaseRequest(
    `/rest/v1/brand_data_room_mixpanel_metrics_daily?${params}`,
    { method: 'GET' },
  )
  if (!response.ok) throw new Error(`Rolling coverage check failed with HTTP ${response.status}`)

  const rows = await response.json() as StoredMetricDate[]
  for (const countryCode of COUNTRIES) {
    const storedDates = new Set(
      rows
        .filter((row) => row.country_code === countryCode)
        .map((row) => row.metric_date),
    )
    const missingDates = expectedDates.filter((date) => !storedDates.has(date))
    if (missingDates.length > 0) {
      throw new Error(
        `Rolling coverage incomplete for ${countryCode}: ${missingDates.length} of ${expectedDates.length} dates missing`,
      )
    }
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const expectedToken = env('BRAND_DATA_ROOM_MIXPANEL_SYNC_TOKEN')
  const suppliedToken = request.headers.get('x-sync-token') ?? ''
  if (!constantTimeEqual(suppliedToken, expectedToken)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await request.json().catch(() => ({})) as {
      fromDate?: unknown
      toDate?: unknown
    }
    const yesterday = addUtcDays(formatReportingDate(new Date()), -1)
    const fromDate = typeof body.fromDate === 'string' ? body.fromDate : addUtcDays(yesterday, -2)
    const toDate = typeof body.toDate === 'string' ? body.toDate : yesterday
    if (toDate > yesterday) throw new Error('Only completed dates may be synchronized')

    const dates = dateRange(fromDate, toDate)
    const results = await queryMetrics(fromDate, toDate)
    await upsertRows(
      '/rest/v1/brand_data_room_mixpanel_metrics_daily?on_conflict=metric_date%2Ccountry_code',
      results.daily,
    )
    await upsertRows(
      '/rest/v1/brand_data_room_mixpanel_breakdowns?on_conflict=country_code',
      results.breakdowns,
    )
    // Never replace a complete public snapshot with a partial backfill. The
    // daily rows and breakdowns can finish loading first, but the dashboard is
    // published only when both countries have the full rolling window.
    await assertRollingCoverage(toDate)
    await refreshSnapshots()

    console.log('Mixpanel marketing analytics synchronized', {
      fromDate,
      toDate,
      countries: COUNTRIES,
      dailyAggregateRows: results.daily.length,
      breakdownAggregateRows: results.breakdowns.length,
    })

    return jsonResponse({
      ok: true,
      dates,
      dailyAggregateRows: results.daily.length,
      breakdownAggregateRows: results.breakdowns.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected sync failure'
    console.error('Mixpanel marketing analytics synchronization failed', { message })
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
