import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCountryAudienceMetrics,
  formatCompactCountryCount,
  formatCountrySnapshotDate,
  type CountryAudienceSnapshotRow,
} from '../lib/country-audience.ts'

const rows: CountryAudienceSnapshotRow[] = [
  {
    country_code: 'AR',
    refreshed_at: '2026-08-06T12:00:00.000Z',
    payload: {
      headline: { registeredUsers: 688_182, activeUsers30d: 467_989, newUsers30d: 179_776 },
      dataCoverage: { ageUsers: 100, interestUsers: 200 },
      ageDistribution: [
        { label: '18–24', count: 40 },
        { label: '25–34', count: 26 },
        { label: '35–44', count: 34 },
      ],
      locations: {
        cities: [
          { label: 'CABA', count: 221_032 },
          { label: 'La Plata', count: 19_375 },
          { label: 'Córdoba', count: 17_082 },
          { label: 'Rosario', count: 10_495 },
        ],
        neighborhoods: [
          { label: 'Palermo', count: 73_144 },
          { label: 'No vivo en CABA', count: 37_383 },
          { label: 'Caballito', count: 26_013 },
          { label: 'Belgrano', count: 24_778 },
          { label: 'Recoleta', count: 24_719 },
        ],
      },
      interests: [
        { label: 'Gastronomía', count: 166 },
        { label: 'Cafeterías', count: 161 },
        { label: 'Cine', count: 126 },
        { label: 'Deportes', count: 79 },
      ],
    },
  },
]

test('deriva las métricas públicas desde el snapshot agregado', () => {
  const [argentina] = buildCountryAudienceMetrics(rows)

  assert.equal(argentina.registered, 688_182)
  assert.equal(argentina.active30d, 467_989)
  assert.equal(argentina.newUsers30d, 179_776)
  assert.equal(argentina.youngShare, 66)
  assert.deepEqual(argentina.neighborhoods.map(({ label }) => label), ['Palermo', 'Caballito', 'Belgrano', 'Recoleta'])
  assert.deepEqual(argentina.interests, [
    { label: 'Gastronomía', share: 83 },
    { label: 'Cafeterías', share: 81 },
    { label: 'Cine', share: 63 },
    { label: 'Deportes', share: 40 },
  ])
})

test('mantiene un fallback completo cuando falta un país', () => {
  const [, uruguay] = buildCountryAudienceMetrics(rows)

  assert.equal(uruguay.code, 'UY')
  assert.equal(uruguay.registered, 127_980)
  assert.equal(uruguay.refreshedAt, '2026-08-06T12:00:00.099875Z')
})

test('formatea cifras y fecha para la presentación comercial', () => {
  assert.equal(formatCompactCountryCount(221_032), '221 mil')
  assert.equal(formatCompactCountryCount(19_375), '19,4 mil')
  assert.equal(formatCountrySnapshotDate('2026-08-06T12:00:00.000Z'), '6 de agosto de 2026')
})
