export const PASITO_CLUB_EVENT = {
  slug: 'pasito-club-2026',
  name: 'Pasito Club',
  currency: 'ARS',
  timeLabel: '19:00 hs',
  venueLabel: 'Thays Café, Buenos Aires',
  capacityPerDate: 200,
  salesClosed: false,
} as const

export const PASITO_CLUB_TERMS_PATH = '/terminos/pasito-club'
export const PASITO_CLUB_TERMS_VERSION = '2026-10'

export type PasitoClubTraining = {
  position: number
  number: number
  isoDate: string
  shortLabel: string
  longLabel: string
  activation: boolean
}

export const PASITO_CLUB_TRAININGS: PasitoClubTraining[] = [
  { position: 1, number: 1, isoDate: '2026-10-14', shortLabel: 'Mié 14/10', longLabel: 'Miércoles 14 de octubre', activation: false },
  { position: 2, number: 2, isoDate: '2026-10-21', shortLabel: 'Mié 21/10', longLabel: 'Miércoles 21 de octubre', activation: true },
  { position: 3, number: 3, isoDate: '2026-10-28', shortLabel: 'Mié 28/10', longLabel: 'Miércoles 28 de octubre', activation: false },
  { position: 4, number: 4, isoDate: '2026-11-04', shortLabel: 'Mié 04/11', longLabel: 'Miércoles 4 de noviembre', activation: false },
  { position: 5, number: 5, isoDate: '2026-11-11', shortLabel: 'Mié 11/11', longLabel: 'Miércoles 11 de noviembre', activation: false },
  { position: 6, number: 6, isoDate: '2026-11-18', shortLabel: 'Mié 18/11', longLabel: 'Miércoles 18 de noviembre', activation: true },
  { position: 7, number: 7, isoDate: '2026-11-25', shortLabel: 'Mié 25/11', longLabel: 'Miércoles 25 de noviembre', activation: false },
  { position: 8, number: 8, isoDate: '2026-12-02', shortLabel: 'Mié 02/12', longLabel: 'Miércoles 2 de diciembre', activation: false },
]

export const PASITO_CLUB_RACE = {
  position: 9,
  isoDate: '2026-12-06',
  shortLabel: 'Dom 06/12',
  longLabel: 'Domingo 6 de diciembre',
  name: 'Carrera Pasito Club',
  distances: ['3K', '5K'],
} as const

export type PricingOptionId = 'A' | 'B'

export type PasitoClubPack = {
  size: number
  price: number
  featured?: boolean
}

export const PASITO_CLUB_BASE_PRICE = 10000
export const PASITO_CLUB_RACE_MIN_PACK = 4

/**
 * Pricing is still being decided. Option A: single encuentro or 4 × $30.000.
 * Option B: packs of 2/4/6/8, cheaper per encuentro the more you buy.
 * Switch with NEXT_PUBLIC_PASITO_CLUB_PRICING=A (build-time) or edit the default.
 */
export const PASITO_CLUB_PRICING_OPTIONS: Record<PricingOptionId, PasitoClubPack[]> = {
  A: [
    { size: 1, price: 10000 },
    { size: 4, price: 30000, featured: true },
  ],
  B: [
    { size: 2, price: 19000 },
    { size: 4, price: 34000, featured: true },
    { size: 6, price: 48000 },
    { size: 8, price: 60000 },
  ],
}

export function resolvePricingOption(value: string | undefined): PricingOptionId {
  return value?.trim().toUpperCase() === 'A' ? 'A' : 'B'
}

export const PASITO_CLUB_PRICING_OPTION: PricingOptionId = resolvePricingOption(
  process.env.NEXT_PUBLIC_PASITO_CLUB_PRICING,
)

export function pasitoClubPacks(option: PricingOptionId = PASITO_CLUB_PRICING_OPTION): PasitoClubPack[] {
  return PASITO_CLUB_PRICING_OPTIONS[option]
}

export function findPack(size: number, option: PricingOptionId = PASITO_CLUB_PRICING_OPTION) {
  return pasitoClubPacks(option).find((pack) => pack.size === size) ?? null
}

export function packIncludesRace(size: number): boolean {
  return size >= PASITO_CLUB_RACE_MIN_PACK
}

export function packSavingsPercent(pack: PasitoClubPack): number {
  const full = pack.size * PASITO_CLUB_BASE_PRICE
  return Math.round(((full - pack.price) / full) * 100)
}

/** Sales for a date close when the training starts (19:00, Buenos Aires). */
export function trainingStartsAt(training: Pick<PasitoClubTraining, 'isoDate'>): Date {
  return new Date(`${training.isoDate}T19:00:00-03:00`)
}

export function trainingIsUpcoming(training: Pick<PasitoClubTraining, 'isoDate'>, now: Date = new Date()): boolean {
  return now.getTime() < trainingStartsAt(training).getTime()
}

export function raceIsUpcoming(now: Date = new Date()): boolean {
  return now.getTime() < new Date(`${PASITO_CLUB_RACE.isoDate}T07:00:00-03:00`).getTime()
}

export type DateInventory = {
  position: number
  tierId: number
  capacity: number | null
  available: number | null
}

/**
 * WhatsApp numbers are stored in E.164. Argentine mobiles typed locally
 * ("11 2345 6789", "011 15 2345-6789") become +54 9 …
 */
export function normalizeWhatsapp(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+') || raw.startsWith('00')) {
    if (raw.startsWith('00')) digits = digits.slice(2)
    if (digits.startsWith('54') && !digits.startsWith('549') && digits.length === 12) digits = `549${digits.slice(2)}`
    return /^[0-9]{8,15}$/.test(digits) ? `+${digits}` : null
  }
  if (digits.startsWith('549') && digits.length === 13) return `+${digits}`
  if (digits.startsWith('54') && digits.length === 12) return `+549${digits.slice(2)}`
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 12) {
    // Area code + "15" + number, e.g. 11 15 2345 6789.
    for (const areaLength of [2, 3, 4]) {
      if (digits.slice(areaLength, areaLength + 2) === '15') {
        const candidate = digits.slice(0, areaLength) + digits.slice(areaLength + 2)
        if (candidate.length === 10) return `+549${candidate}`
      }
    }
  }
  if (digits.length === 10) return `+549${digits}`
  return null
}

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
}

export const pasitoClubMoney = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: PASITO_CLUB_EVENT.currency,
    maximumFractionDigits: 0,
  }).format(amount)
