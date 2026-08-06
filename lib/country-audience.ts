export type CountryCode = 'AR' | 'UY'

type CountDatum = {
  label: string
  count: number
}

export type CountryAudienceSnapshotRow = {
  country_code: string
  payload: unknown
  refreshed_at: string
}

export type CountryAudienceMetric = {
  code: CountryCode
  name: string
  registered: number
  active30d: number
  newUsers30d: number
  youngShare: number
  cities: CountDatum[]
  neighborhoods: CountDatum[]
  interests: Array<{ label: string; share: number }>
  refreshedAt: string
}

const COUNTRY_CONFIG: Record<CountryCode, { name: string; interests: string[] }> = {
  AR: {
    name: 'Argentina',
    interests: ['Gastronomía', 'Cafeterías', 'Cine', 'Deportes'],
  },
  UY: {
    name: 'Uruguay',
    interests: ['Gastronomía', 'Cafeterías', 'Cine', 'Deportes'],
  },
}

export const COUNTRY_AUDIENCE_FALLBACK: CountryAudienceMetric[] = [
  {
    code: 'AR',
    name: 'Argentina',
    registered: 688_182,
    active30d: 467_989,
    newUsers30d: 179_776,
    youngShare: 66,
    cities: [
      { label: 'CABA', count: 221_032 },
      { label: 'La Plata', count: 19_375 },
      { label: 'Córdoba', count: 17_082 },
      { label: 'Rosario', count: 10_495 },
    ],
    neighborhoods: [
      { label: 'Palermo', count: 73_144 },
      { label: 'Caballito', count: 26_013 },
      { label: 'Belgrano', count: 24_778 },
      { label: 'Recoleta', count: 24_719 },
    ],
    interests: [
      { label: 'Gastronomía', share: 83 },
      { label: 'Cafeterías', share: 81 },
      { label: 'Cine', share: 63 },
      { label: 'Deportes', share: 39 },
    ],
    refreshedAt: '2026-08-06T12:00:00.099875Z',
  },
  {
    code: 'UY',
    name: 'Uruguay',
    registered: 127_980,
    active30d: 104_799,
    newUsers30d: 49_622,
    youngShare: 65,
    cities: [
      { label: 'Montevideo', count: 100_792 },
      { label: 'Ciudad de la Costa', count: 5_291 },
      { label: 'Maldonado', count: 1_983 },
      { label: 'Canelones', count: 1_553 },
    ],
    neighborhoods: [
      { label: 'Pocitos', count: 10_033 },
      { label: 'Cordón', count: 8_354 },
      { label: 'Centro', count: 6_958 },
      { label: 'Malvín', count: 3_632 },
    ],
    interests: [
      { label: 'Gastronomía', share: 82 },
      { label: 'Cafeterías', share: 79 },
      { label: 'Cine', share: 63 },
      { label: 'Deportes', share: 46 },
    ],
    refreshedAt: '2026-08-06T12:00:00.099875Z',
  },
]

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readFiniteNumber(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readCountData(value: unknown): CountDatum[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    const row = asRecord(item)
    const label = row?.label
    const count = row?.count

    return typeof label === 'string' && typeof count === 'number' && Number.isFinite(count)
      ? [{ label, count }]
      : []
  })
}

function buildCountryMetric(
  code: CountryCode,
  row: CountryAudienceSnapshotRow,
): CountryAudienceMetric | null {
  const payload = asRecord(row.payload)
  const headline = asRecord(payload?.headline)
  const coverage = asRecord(payload?.dataCoverage)
  const locations = asRecord(payload?.locations)
  const registered = readFiniteNumber(headline, 'registeredUsers')
  const active30d = readFiniteNumber(headline, 'activeUsers30d')
  const newUsers30d = readFiniteNumber(headline, 'newUsers30d')
  const ageUsers = readFiniteNumber(coverage, 'ageUsers')
  const interestUsers = readFiniteNumber(coverage, 'interestUsers')
  const ageDistribution = readCountData(payload?.ageDistribution)
  const cities = readCountData(locations?.cities).slice(0, 4)
  const neighborhoods = readCountData(locations?.neighborhoods)
    .filter(({ label }) => !/^no vivo en\b/i.test(label))
    .slice(0, 4)
  const rawInterests = readCountData(payload?.interests)

  if (
    registered === null
    || active30d === null
    || newUsers30d === null
    || ageUsers === null
    || ageUsers <= 0
    || interestUsers === null
    || interestUsers <= 0
    || cities.length < 4
    || neighborhoods.length < 4
    || !row.refreshed_at
  ) {
    return null
  }

  const youngUsers = ageDistribution
    .filter(({ label }) => label === '18–24' || label === '25–34')
    .reduce((total, datum) => total + datum.count, 0)
  const interests = COUNTRY_CONFIG[code].interests.flatMap((label) => {
    const datum = rawInterests.find((interest) => interest.label.toLocaleLowerCase('es') === label.toLocaleLowerCase('es'))
    return datum ? [{ label, share: Math.round((datum.count / interestUsers) * 100) }] : []
  })

  if (youngUsers <= 0 || interests.length !== COUNTRY_CONFIG[code].interests.length) return null

  return {
    code,
    name: COUNTRY_CONFIG[code].name,
    registered,
    active30d,
    newUsers30d,
    youngShare: Math.round((youngUsers / ageUsers) * 100),
    cities,
    neighborhoods,
    interests,
    refreshedAt: row.refreshed_at,
  }
}

export function buildCountryAudienceMetrics(rows: CountryAudienceSnapshotRow[]): CountryAudienceMetric[] {
  return (Object.keys(COUNTRY_CONFIG) as CountryCode[]).map((code) => {
    const row = rows.find(({ country_code: countryCode }) => countryCode === code)
    const fallback = COUNTRY_AUDIENCE_FALLBACK.find((country) => country.code === code)!

    return row ? buildCountryMetric(code, row) ?? fallback : fallback
  })
}

const integerFormatter = new Intl.NumberFormat('es-AR')

export function formatCountryCount(value: number): string {
  return integerFormatter.format(value)
}

export function formatCompactCountryCount(value: number): string {
  if (value < 1_000) return formatCountryCount(value)

  return `${new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: value >= 100_000 ? 0 : 1,
  }).format(value / 1_000)} mil`
}

export function formatCountrySnapshotDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value))
}
