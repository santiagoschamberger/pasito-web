export const WALKING_CLUB_UY_EVENT = {
  slug: 'pasito-walking-club-uy-2026',
  name: 'Pasito Walking Club',
  dateLabel: 'Sábado 10 de octubre de 2026',
  timeLabel: '10:30 a 15:00',
  venueLabel: 'Casa Fauno, Parque Rodó',
  currency: 'UYU',
  capacity: 200,
  salesClosed: false,
  maxTicketsPerOrder: 6,
} as const

export const WALKING_CLUB_UY_TERMS_PATH = '/terminos/walking-club-uy'
export const WALKING_CLUB_UY_TERMS_VERSION = '2026-10'

export const WALKING_CLUB_UY_TICKET_TIERS = [
  { position: 1, label: 'Tanda 1', unitPrice: 1190, capacity: 100, soldOut: false },
  { position: 2, label: 'Tanda 2', unitPrice: 1290, capacity: 70, soldOut: false },
  { position: 3, label: 'Tanda 3', unitPrice: 1390, capacity: 30, soldOut: false },
] as const

export type TicketBreakdown = {
  tierId: number
  position: number
  name: string
  unitPrice: number
  quantity: number
}

export type TicketInventoryTier = {
  tierId: number
  position: number
  name: string
  unitPrice: number
  capacity: number | null
  sold: number
  held: number
  available: number | null
}

export function walkingClubUyTicketTierIsSoldOut(
  position: number,
  inventory: TicketInventoryTier[],
): boolean {
  const liveTier = inventory.find((tier) => tier.position === position)
  if (liveTier) {
    return liveTier.capacity !== null
      && liveTier.available !== null
      && liveTier.available <= 0
  }

  return WALKING_CLUB_UY_TICKET_TIERS.find((tier) => tier.position === position)?.soldOut ?? false
}

export function walkingClubUyEventIsSoldOut(inventory: TicketInventoryTier[]): boolean {
  if (WALKING_CLUB_UY_EVENT.salesClosed) return true

  return WALKING_CLUB_UY_TICKET_TIERS.every(
    (tier) => walkingClubUyTicketTierIsSoldOut(tier.position, inventory),
  )
}

export type EventTicket = {
  id: string
  code: string
  number: number
  status?: 'valid' | 'used' | 'void'
  checkedInAt?: string | null
}

export const walkingClubUyMoney = (amount: number) =>
  new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: WALKING_CLUB_UY_EVENT.currency,
    maximumFractionDigits: 0,
  }).format(amount)

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
