export const TOMATE_EVENT = {
  slug: 'pasito-tomate-2026',
  name: 'Pasito Walking Club x TOMATE',
  dateLabel: 'Domingo 26 de julio de 2026',
  timeLabel: '10:30 a 16:30',
  venueLabel: 'TOMATE, Rosedal de Palermo',
  currency: 'ARS',
  maxTicketsPerOrder: 6,
} as const

export const TOMATE_EVENT_TERMS_PATH = '/terminos/evento-pasito'
export const TOMATE_EVENT_TERMS_VERSION = '2026-07'

export const TOMATE_TICKET_BONUSES = [
  { position: 1, label: 'Tanda 1 · 100 cupos', unitPrice: 35000, pasitos: 70, soldOut: true },
  { position: 2, label: 'Tanda 2 · 100 cupos', unitPrice: 45000, pasitos: 50, soldOut: false },
  { position: 3, label: 'Tanda 3 · cupo restante', unitPrice: 48000, pasitos: 20, soldOut: false },
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

export function tomateTicketTierIsSoldOut(
  position: number,
  inventory: TicketInventoryTier[],
): boolean {
  const liveTier = inventory.find((tier) => tier.position === position)
  if (liveTier) {
    return liveTier.capacity !== null
      && liveTier.available !== null
      && liveTier.available <= 0
  }

  return TOMATE_TICKET_BONUSES.find((tier) => tier.position === position)?.soldOut ?? false
}

export type EventTicket = {
  id: string
  code: string
  number: number
  status?: 'valid' | 'used' | 'void'
  checkedInAt?: string | null
}

export const tomateMoney = (amount: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: TOMATE_EVENT.currency,
    maximumFractionDigits: 0,
  }).format(amount)

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
