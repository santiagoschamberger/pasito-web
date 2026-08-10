import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ARGENTINA_AUGUST_2026_CPM_FACTOR,
  BANNER_MARKETS,
  BANNER_PLACEMENTS,
  BANNER_PRIORITIES,
  MINIMUM_CAMPAIGN_ARS,
  MINIMUM_CAMPAIGN_USD,
  USD_TO_ARS_REFERENCE,
  URUGUAY_CPM_PREMIUM,
  calculateBannerPricing,
  getBannerPlacementCpm,
} from '../lib/banner-campaign-pricing.ts'

const baseInput = {
  marketId: 'AR' as const,
  placementId: 'home' as const,
  priorityId: 'rotation' as const,
  durationDays: 7,
}

test('usa el inventario diario informado para cada ubicación', () => {
  assert.deepEqual(
    BANNER_PLACEMENTS.map(({ dailyImpressions }) => dailyImpressions),
    [600_000, 500_000, 390_000, 351_000, 351_000, 351_000, 351_000, 351_000],
  )
})

test('la duración define impresiones, clicks e inversión manteniendo el ritmo diario', () => {
  const oneDay = calculateBannerPricing({ ...baseInput, durationDays: 1 })
  const sevenDays = calculateBannerPricing(baseInput)

  assert.equal(oneDay.dailyImpressions, 600_000)
  assert.equal(sevenDays.dailyImpressions, 600_000)
  assert.equal(oneDay.impressions, 600_000)
  assert.equal(sevenDays.impressions, 4_200_000)
  assert.equal(oneDay.clicksLow, 4_800)
  assert.equal(sevenDays.clicksLow, 33_600)
  assert.ok(sevenDays.investment > oneDay.investment)
})

test('calcula automáticamente el presupuesto con tarifa progresiva por volumen', () => {
  const result = calculateBannerPricing(baseInput)

  assert.equal(result.currency, 'ARS')
  assert.equal(result.investment, 13_300_000)
  assert.equal(result.impressions, 4_200_000)
  assert.equal(result.clicksLow, 33_600)
  assert.equal(result.clicksHigh, 71_400)
  assert.equal(result.volumeSavings, 980_000)
})

test('usa un CPM base común y deja que el inventario defina el precio por ubicación', () => {
  assert.deepEqual(
    BANNER_PLACEMENTS.map((placement) => placement.cpmArs),
    [4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000],
  )
  const home = calculateBannerPricing(baseInput)
  const secondary = calculateBannerPricing({ ...baseInput, placementId: 'home_before_rewards' })
  const catalog = calculateBannerPricing({ ...baseInput, placementId: 'all' })
  const tab = calculateBannerPricing({ ...baseInput, placementId: 'locales' })

  assert.equal(getBannerPlacementCpm('home', 'AR'), 3_400)
  assert.equal(ARGENTINA_AUGUST_2026_CPM_FACTOR, 0.85)
  assert.ok(home.investment > secondary.investment)
  assert.ok(secondary.investment > catalog.investment)
  assert.ok(catalog.investment > tab.investment)
  assert.equal(MINIMUM_CAMPAIGN_ARS, 800_000)
  assert.equal(MINIMUM_CAMPAIGN_USD, 500)
})

test('prioridad conserva el inventario pero aumenta inversión y clicks proyectados', () => {
  const rotation = calculateBannerPricing(baseInput)
  const first = calculateBannerPricing({ ...baseInput, priorityId: 'first' })
  const exclusive = calculateBannerPricing({ ...baseInput, priorityId: 'exclusive' })

  assert.deepEqual(
    [rotation.impressions, first.impressions, exclusive.impressions],
    [4_200_000, 4_200_000, 4_200_000],
  )
  assert.ok(first.investment > rotation.investment)
  assert.ok(exclusive.investment > first.investment)
  assert.deepEqual(
    [rotation.clicksLow, first.clicksLow, exclusive.clicksLow],
    [33_600, 36_960, 42_000],
  )
})

test('Uruguay conserva su tarifa vigente frente a la tarifa argentina de agosto', () => {
  const argentinaEquivalentCpmUsd = BANNER_PLACEMENTS[0].cpmArs / USD_TO_ARS_REFERENCE
  const uruguayCpm = getBannerPlacementCpm('home', 'UY')
  const result = calculateBannerPricing({ ...baseInput, marketId: 'UY' })

  assert.equal(uruguayCpm, 3.03)
  assert.ok(Math.abs(uruguayCpm - (argentinaEquivalentCpmUsd * URUGUAY_CPM_PREMIUM)) <= 0.005)
  assert.equal(result.currency, 'USD')
  assert.equal(result.investment, 11_850)
  assert.equal(result.impressions, 4_200_000)
  assert.equal(result.clicksLow, 33_600)
})

test('todas las combinaciones mantienen moneda, inventario y valores finitos', () => {
  for (const market of BANNER_MARKETS) {
    for (const placement of BANNER_PLACEMENTS) {
      for (const priority of BANNER_PRIORITIES) {
        const result = calculateBannerPricing({
          marketId: market.id,
          placementId: placement.id,
          priorityId: priority.id,
          durationDays: 14,
        })

        assert.equal(result.currency, market.currency)
        assert.equal(result.dailyImpressions, placement.dailyImpressions)
        assert.equal(result.impressions, placement.dailyImpressions * 14)
        assert.ok(Number.isFinite(result.investment))
        assert.ok(Number.isFinite(result.clicksLow))
        assert.ok(result.clicksHigh >= result.clicksLow)
      }
    }
  }
})
