export const SILVER_EVENT = {
  slug: 'silver-walks-2026-09',
  name: 'Silver Walks by Nutren',
  dateLabel: 'Domingo 27 de septiembre de 2026',
  timeLabel: '09:30 a 13:00',
  venueLabel: 'Augusta, Palermo',
  venueAddress: 'Av. Ernesto Tornquist 6385, CABA',
  currency: 'ARS',
  capacity: 200,
  salesClosed: false,
  maxTicketsPerOrder: 6,
} as const

export const SILVER_EVENT_TERMS_PATH = '/terminos/silver-walks'
export const SILVER_EVENT_TERMS_VERSION = '2026-09'

export const SILVER_TICKET_TIERS = [
  { position: 1, label: 'Entrada general', unitPrice: 45000, capacity: 200 },
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

function silverTicketTierIsSoldOut(
  position: number,
  inventory: TicketInventoryTier[],
): boolean {
  const liveTier = inventory.find((tier) => tier.position === position)
  if (liveTier) {
    return liveTier.capacity !== null
      && liveTier.available !== null
      && liveTier.available <= 0
  }

  return SILVER_TICKET_TIERS.find((tier) => tier.position === position) === undefined
}

export function silverEventIsSoldOut(inventory: TicketInventoryTier[]): boolean {
  if (SILVER_EVENT.salesClosed) return true

  return SILVER_TICKET_TIERS.every(
    (tier) => silverTicketTierIsSoldOut(tier.position, inventory),
  )
}

export type EventTicket = {
  id: string
  code: string
  number: number
  status?: 'valid' | 'used' | 'void'
  checkedInAt?: string | null
}

export const silverMoney = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: SILVER_EVENT.currency,
    maximumFractionDigits: 0,
  }).format(amount)

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
