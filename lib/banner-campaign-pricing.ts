export const USD_TO_ARS_REFERENCE = 1_520
export const USD_TO_ARS_REFERENCE_DATE = '07/08/2026'
export const URUGUAY_CPM_PREMIUM = 1.15
export const ARGENTINA_AUGUST_2026_CPM_FACTOR = 0.85
export const BANNER_PRICE_VALID_UNTIL = '31 de agosto de 2026'
export const CAMPAIGN_ROUNDING_ARS = 50_000
export const CAMPAIGN_ROUNDING_USD = 50
export const EXPECTED_CTR = { low: 0.008, high: 0.017 } as const
export const BANNER_CPM_LEVELS_ARS = {
  homePrimary: 4_000,
  homeSecondary: 4_000,
  catalog: 4_000,
  catalogTab: 4_000,
} as const

function roundToIncrement(value: number, increment: number) {
  const rounded = Math.round(value / increment) * increment
  return increment < 1 ? Number(rounded.toFixed(2)) : rounded
}

function roundUpToIncrement(value: number, increment: number) {
  return Math.ceil(value / increment) * increment
}

export const MINIMUM_CAMPAIGN_ARS = roundUpToIncrement(
  500 * USD_TO_ARS_REFERENCE,
  CAMPAIGN_ROUNDING_ARS,
)
export const MINIMUM_CAMPAIGN_USD = 500

export const BANNER_PLACEMENTS = [
  {
    id: 'home',
    label: 'Inicio — debajo de Grupos',
    shortLabel: 'Inicio · Grupos',
    cpmArs: BANNER_CPM_LEVELS_ARS.homePrimary,
    dailyImpressions: { AR: 600_000, UY: 100_000 },
    description: 'La primera gran pieza comercial al entrar a Inicio.',
    location: 'Debajo de los grupos y antes de los contenidos destacados.',
    family: 'Inicio',
    previewSrc: '/marketing/banner-placements/home-below-groups.jpg',
    previewAlt: 'Banner principal de Pasito ubicado debajo de los grupos en Inicio',
  },
  {
    id: 'home_before_rewards',
    label: 'Inicio — antes de Premios',
    shortLabel: 'Inicio · Premios',
    cpmArs: BANNER_CPM_LEVELS_ARS.homeSecondary,
    dailyImpressions: { AR: 500_000, UY: 500_000 },
    description: 'Presencia contextual justo antes de explorar premios.',
    location: 'Entre Eventos y la sección Premios que te copan.',
    family: 'Inicio',
    previewSrc: '/marketing/banner-placements/home-before-rewards.jpg',
    previewAlt: 'Banner secundario de Pasito ubicado antes de Premios en Inicio',
  },
  {
    id: 'all',
    label: 'Catálogo — todas las tabs',
    shortLabel: 'Todo Catálogo',
    cpmArs: BANNER_CPM_LEVELS_ARS.catalog,
    dailyImpressions: { AR: 390_000, UY: 390_000 },
    description: 'Cobertura amplia mientras las personas exploran el catálogo.',
    location: 'Debajo de los filtros, en todas las tabs del Catálogo.',
    family: 'Catálogo',
    previewSrc: '/marketing/banner-placements/catalog.jpg',
    previewAlt: 'Banner general debajo de los filtros del Catálogo de Pasito',
  },
  {
    id: 'locales',
    label: 'Catálogo — tab Locales',
    shortLabel: 'Tab Locales',
    cpmArs: BANNER_CPM_LEVELS_ARS.catalogTab,
    dailyImpressions: { AR: 351_000, UY: 351_000 },
    description: 'Personas buscando opciones físicas cercanas.',
    location: 'Debajo de los filtros cuando la tab Locales está seleccionada.',
    family: 'Catálogo',
    previewSrc: '/marketing/banner-placements/catalog.jpg',
    previewAlt: 'Banner debajo de los filtros de la tab Locales de Pasito',
  },
  {
    id: 'online',
    label: 'Catálogo — tab Online',
    shortLabel: 'Tab Online',
    cpmArs: BANNER_CPM_LEVELS_ARS.catalogTab,
    dailyImpressions: { AR: 351_000, UY: 351_000 },
    description: 'Audiencia abierta a comprar o convertir digitalmente.',
    location: 'Debajo de los filtros cuando la tab Online está seleccionada.',
    family: 'Catálogo',
    previewSrc: '/marketing/banner-placements/catalog.jpg',
    previewAlt: 'Banner debajo de los filtros de la tab Online de Pasito',
  },
  {
    id: 'recompensas',
    label: 'Catálogo — tab Premios',
    shortLabel: 'Tab Premios',
    cpmArs: BANNER_CPM_LEVELS_ARS.catalogTab,
    dailyImpressions: { AR: 351_000, UY: 351_000 },
    description: 'Alta intención mientras la persona elige qué canjear.',
    location: 'Debajo de los filtros cuando la tab Premios está seleccionada.',
    family: 'Catálogo',
    previewSrc: '/marketing/banner-placements/catalog.jpg',
    previewAlt: 'Banner debajo de los filtros de la tab Premios de Pasito',
  },
  {
    id: 'descuentos',
    label: 'Catálogo — tab Descuentos',
    shortLabel: 'Tab Descuentos',
    cpmArs: BANNER_CPM_LEVELS_ARS.catalogTab,
    dailyImpressions: { AR: 351_000, UY: 351_000 },
    description: 'Usuarios explorando beneficios y oportunidades concretas.',
    location: 'Debajo de los filtros cuando la tab Descuentos está seleccionada.',
    family: 'Catálogo',
    previewSrc: '/marketing/banner-placements/catalog.jpg',
    previewAlt: 'Banner debajo de los filtros de la tab Descuentos de Pasito',
  },
  {
    id: 'reservas',
    label: 'Catálogo — tab Reservas',
    shortLabel: 'Tab Reservas',
    cpmArs: BANNER_CPM_LEVELS_ARS.catalogTab,
    dailyImpressions: { AR: 351_000, UY: 351_000 },
    description: 'La ubicación más próxima a una acción o transacción.',
    location: 'Debajo de los filtros cuando la tab Reservas está seleccionada.',
    family: 'Catálogo',
    previewSrc: '/marketing/banner-placements/catalog.jpg',
    previewAlt: 'Banner debajo de los filtros de la tab Reservas de Pasito',
  },
] as const

export const BANNER_PRIORITIES = [
  {
    id: 'rotation',
    label: 'Rotación estándar',
    multiplier: 1,
    clickMultiplier: 1,
    description: 'Comparte el carrusel con hasta dos marcas. Clicks proyectados en nivel base.',
  },
  {
    id: 'first',
    label: 'Primera posición',
    multiplier: 1.25,
    clickMultiplier: 1.1,
    description: 'Tu banner aparece primero y proyecta 10% más clicks sobre el mismo inventario diario.',
  },
  {
    id: 'exclusive',
    label: 'Exclusividad',
    multiplier: 1.5,
    clickMultiplier: 1.25,
    description: 'Una única marca en la superficie y 25% más clicks proyectados sobre el mismo inventario diario.',
  },
] as const

export const BANNER_MARKETS = [
  {
    id: 'AR',
    label: 'Argentina',
    currency: 'ARS',
    cpmFactor: ARGENTINA_AUGUST_2026_CPM_FACTOR,
    cpmRounding: 50,
    campaignRounding: CAMPAIGN_ROUNDING_ARS,
    minimumInvestment: MINIMUM_CAMPAIGN_ARS,
  },
  {
    id: 'UY',
    label: 'Uruguay',
    currency: 'USD',
    cpmFactor: URUGUAY_CPM_PREMIUM / USD_TO_ARS_REFERENCE,
    cpmRounding: 0.01,
    campaignRounding: CAMPAIGN_ROUNDING_USD,
    minimumInvestment: MINIMUM_CAMPAIGN_USD,
  },
] as const

export type BannerPlacementId = (typeof BANNER_PLACEMENTS)[number]['id']
export type BannerPriorityId = (typeof BANNER_PRIORITIES)[number]['id']
export type BannerMarketId = (typeof BANNER_MARKETS)[number]['id']

export type BannerPricingInput = {
  marketId: BannerMarketId
  placementId: BannerPlacementId
  priorityId: BannerPriorityId
  durationDays: number
}

export type BannerPricingResult = {
  currency: 'ARS' | 'USD'
  investment: number
  impressions: number
  dailyImpressions: number
  clicksLow: number
  clicksHigh: number
  listCpm: number
  effectiveCpm: number
  volumeSavings: number
  minimumInvestment: number
  minimumApplied: boolean
}

type VolumeTier = {
  maxImpressions: number
  discount: number
}

const VOLUME_TIERS: readonly VolumeTier[] = [
  { maxImpressions: 500_000, discount: 0 },
  { maxImpressions: 2_000_000, discount: 0.05 },
  { maxImpressions: 5_000_000, discount: 0.1 },
  { maxImpressions: Number.POSITIVE_INFINITY, discount: 0.15 },
]

function findById<T extends { id: string }>(items: readonly T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`Unknown banner pricing option: ${id}`)
  return item
}

function priceImpressions(impressions: number, listCpm: number) {
  let previousMax = 0
  let remaining = Math.max(0, impressions)
  let investment = 0

  for (const tier of VOLUME_TIERS) {
    if (remaining <= 0) break
    const tierWidth = tier.maxImpressions - previousMax
    const impressionsInTier = Math.min(remaining, tierWidth)
    investment += (impressionsInTier / 1_000) * listCpm * (1 - tier.discount)
    remaining -= impressionsInTier
    previousMax = tier.maxImpressions
  }

  return investment
}

export function calculateBannerPricing(input: BannerPricingInput): BannerPricingResult {
  const market = findById(BANNER_MARKETS, input.marketId)
  const placement = findById(BANNER_PLACEMENTS, input.placementId)
  const priority = findById(BANNER_PRIORITIES, input.priorityId)
  const durationDays = Math.max(1, Math.floor(input.durationDays || 1))
  const listCpm = roundToIncrement(
    placement.cpmArs * market.cpmFactor * priority.multiplier,
    market.cpmRounding,
  )

  const dailyImpressions = placement.dailyImpressions[market.id]
  const impressions = dailyImpressions * durationDays
  const requestedInvestment = priceImpressions(impressions, listCpm)
  const investment = Math.max(
    market.minimumInvestment,
    roundUpToIncrement(requestedInvestment, market.campaignRounding),
  )
  const minimumApplied = investment === market.minimumInvestment && requestedInvestment < market.minimumInvestment
  const listInvestment = (impressions / 1_000) * listCpm
  const volumeSavings = Math.max(0, listInvestment - investment)
  const effectiveCpm = impressions > 0 ? (investment / impressions) * 1_000 : listCpm

  return {
    currency: market.currency,
    investment,
    impressions,
    dailyImpressions,
    clicksLow: Math.floor(impressions * EXPECTED_CTR.low * priority.clickMultiplier),
    clicksHigh: Math.ceil(impressions * EXPECTED_CTR.high * priority.clickMultiplier),
    listCpm,
    effectiveCpm,
    volumeSavings,
    minimumInvestment: market.minimumInvestment,
    minimumApplied,
  }
}

export function getBannerPlacementCpm(placementId: BannerPlacementId, marketId: BannerMarketId) {
  const placement = findById(BANNER_PLACEMENTS, placementId)
  const market = findById(BANNER_MARKETS, marketId)

  return roundToIncrement(placement.cpmArs * market.cpmFactor, market.cpmRounding)
}

export function getBannerDailyImpressions(
  placementId: BannerPlacementId,
  marketId: BannerMarketId,
) {
  return findById(BANNER_PLACEMENTS, placementId).dailyImpressions[marketId]
}

export function getBannerPlacement(id: BannerPlacementId) {
  return findById(BANNER_PLACEMENTS, id)
}

export function getBannerPriority(id: BannerPriorityId) {
  return findById(BANNER_PRIORITIES, id)
}

export function getBannerMarket(id: BannerMarketId) {
  return findById(BANNER_MARKETS, id)
}
