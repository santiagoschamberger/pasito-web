import 'server-only'

import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'

import {
  PASITO_CLUB_EVENT,
  PASITO_CLUB_RACE,
  PASITO_CLUB_TRAININGS,
  type DateInventory,
  type PricingOptionId,
} from '@/lib/pasito-club-event'
import { getTomateSupabase } from '@/lib/tomate-server'

export const PASITO_CLUB_BUYER_COOKIE = 'pasito_club_buyer'

export type ClubTicket = {
  id: string
  code: string
  number: number
  status: 'valid' | 'used' | 'void'
  position: number
  label: string
}

export type ClubOrderBundle = {
  order: {
    id: string
    paymentId: string
    email: string
    customerName: string | null
    amount: number
    quantity: number
    paymentStatus: string
    emailSentAt: string | null
  }
  tickets: ClubTicket[]
}

export type ClubIntent = {
  id: string
  quantity: number
  amount: number
  currency: string
  status: string
}

export type ClubContact = {
  email: string
  phone: string
  packSize: number
  includesRace: boolean
}

export type ReserveInput = {
  tierIds: number[]
  raceTierId: number | null
  amount: number
  packSize: number
  pricingOption: PricingOptionId
  email: string
  phone: string
  termsVersion: string
  clientKeyHash: string
  clientIpHash: string
}

export type ReserveResult = {
  status?: string
  intentId?: string
  quantity?: number
  amount?: number
  currency?: string
  expiresAt?: string
  tierIds?: number[]
}

export type ConfirmResult = {
  status?: 'confirmed' | 'duplicate' | 'invalid' | 'invalid_intent' | 'amount_mismatch'
  orderId?: string
  latePayment?: boolean
}

type ClubStore = {
  inventory(): Promise<DateInventory[]>
  reserve(input: ReserveInput): Promise<ReserveResult>
  cancel(intentId: string): Promise<string>
  loadIntent(intentId: string): Promise<ClubIntent | null>
  loadContact(intentId: string): Promise<ClubContact | null>
  confirm(intent: ClubIntent, paymentId: string, email: string, customerName: string | null): Promise<ConfirmResult>
  loadOrderByIntent(intentId: string): Promise<ClubOrderBundle | null>
  loadTicket(ticketId: string): Promise<{ ticket: ClubTicket; paymentStatus: string; quantity: number } | null>
  recordEmailAttempt(orderId: string, attempts: number, emailId: string | null, error: string | null): Promise<void>
}

/** In-memory checkout for local demos. Never available in production builds. */
export function pasitoClubMockMode(): boolean {
  return process.env.PASITO_CLUB_MOCK_CHECKOUT === '1'
    && process.env.NODE_ENV !== 'production'
    && process.env.VERCEL_ENV !== 'production'
}

type TierRow = { tier_id: number | string; tier_position: number; capacity: number | null; available: number | null }
type TicketRow = {
  id: string
  short_code: string
  ticket_number: number
  status: 'valid' | 'used' | 'void'
  event_ticket_tiers: { name: string; position: number } | { name: string; position: number }[] | null
}

function tierOf(row: TicketRow) {
  const tier = Array.isArray(row.event_ticket_tiers) ? row.event_ticket_tiers[0] : row.event_ticket_tiers
  return { label: tier?.name ?? 'Pasito Club', position: tier?.position ?? 0 }
}

function mapTicket(row: TicketRow): ClubTicket {
  return { id: row.id, code: row.short_code, number: row.ticket_number, status: row.status, ...tierOf(row) }
}

const supabaseStore: ClubStore = {
  async inventory() {
    const { data, error } = await getTomateSupabase().rpc('event_ticket_inventory', { p_event_slug: PASITO_CLUB_EVENT.slug })
    if (error) throw error
    return ((data ?? []) as TierRow[]).map((row) => ({
      position: Number(row.tier_position),
      tierId: Number(row.tier_id),
      capacity: row.capacity === null ? null : Number(row.capacity),
      available: row.available === null ? null : Number(row.available),
    }))
  },
  async reserve(input) {
    const { data, error } = await getTomateSupabase().rpc('pasito_club_reserve_pack', {
      p_event_slug: PASITO_CLUB_EVENT.slug,
      p_tier_ids: input.tierIds,
      p_race_tier_id: input.raceTierId,
      p_amount: input.amount,
      p_pack_size: input.packSize,
      p_pricing_option: input.pricingOption,
      p_email: input.email,
      p_phone: input.phone,
      p_terms_version: input.termsVersion,
      p_client_key_hash: input.clientKeyHash,
      p_client_ip_hash: input.clientIpHash,
    })
    if (error) throw error
    return (data ?? {}) as ReserveResult
  },
  async cancel(intentId) {
    const { data, error } = await getTomateSupabase().rpc('event_cancel_ticket_reservation', { p_intent_id: intentId })
    if (error) throw error
    return typeof data === 'string' ? data : 'unknown'
  },
  async loadIntent(intentId) {
    const { data, error } = await getTomateSupabase().from('event_checkout_intents')
      .select('id, quantity, amount, currency, status')
      .eq('id', intentId)
      .eq('event_slug', PASITO_CLUB_EVENT.slug)
      .maybeSingle()
    if (error) throw error
    return data as ClubIntent | null
  },
  async loadContact(intentId) {
    const { data, error } = await getTomateSupabase().from('pasito_club_ticket_contacts')
      .select('email, phone, pack_size, includes_race')
      .eq('intent_id', intentId)
      .maybeSingle()
    if (error) throw error
    return data ? { email: data.email, phone: data.phone, packSize: data.pack_size, includesRace: data.includes_race } : null
  },
  async confirm(intent, paymentId, email, customerName) {
    const { data, error } = await getTomateSupabase().rpc('event_confirm_ticket_order', {
      p_intent_id: intent.id,
      p_payment_id: paymentId,
      p_amount: intent.amount,
      p_currency: intent.currency,
      p_email: email,
      p_customer_name: customerName,
    })
    if (error) throw error
    return (data ?? {}) as ConfirmResult
  },
  async loadOrderByIntent(intentId) {
    const db = getTomateSupabase()
    const { data: order, error } = await db.from('event_ticket_orders')
      .select('id, rebill_payment_id, customer_email, customer_name, amount, quantity, payment_status, confirmation_email_sent_at')
      .eq('event_slug', PASITO_CLUB_EVENT.slug)
      .eq('checkout_intent_id', intentId)
      .maybeSingle()
    if (error) throw error
    if (!order) return null
    const { data: rows, error: ticketsError } = await db.from('event_tickets')
      .select('id, short_code, ticket_number, status, event_ticket_tiers(name, position)')
      .eq('order_id', order.id)
      .order('ticket_number')
    if (ticketsError) throw ticketsError
    return {
      order: {
        id: order.id,
        paymentId: order.rebill_payment_id,
        email: order.customer_email,
        customerName: order.customer_name,
        amount: order.amount,
        quantity: order.quantity,
        paymentStatus: order.payment_status,
        emailSentAt: order.confirmation_email_sent_at,
      },
      tickets: ((rows ?? []) as TicketRow[]).map(mapTicket),
    }
  },
  async loadTicket(ticketId) {
    const db = getTomateSupabase()
    const { data: row, error } = await db.from('event_tickets')
      .select('id, order_id, short_code, ticket_number, status, event_ticket_tiers(name, position)')
      .eq('id', ticketId)
      .maybeSingle()
    if (error || !row) return null
    const { data: order } = await db.from('event_ticket_orders')
      .select('event_slug, payment_status, quantity')
      .eq('id', row.order_id)
      .maybeSingle()
    if (!order || order.event_slug !== PASITO_CLUB_EVENT.slug) return null
    return { ticket: mapTicket(row as TicketRow), paymentStatus: order.payment_status, quantity: order.quantity }
  },
  async recordEmailAttempt(orderId, attempts, emailId, error) {
    const { error: rpcError } = await getTomateSupabase().rpc('event_record_confirmation_email_attempt', {
      p_order_id: orderId,
      p_attempt_count: attempts,
      p_email_id: emailId,
      p_error: error,
    })
    if (rpcError) throw rpcError
  },
}

type MockIntent = ClubIntent & {
  contact: ClubContact
  tierIds: number[]
  expiresAt: number
  clientKeyHash: string
  orderId?: string
}
type MockState = {
  intents: Map<string, MockIntent>
  orders: Map<string, ClubOrderBundle & { intentId: string }>
}

function mockState(): MockState {
  const holder = globalThis as typeof globalThis & { __pasitoClubMock?: MockState }
  holder.__pasitoClubMock ??= { intents: new Map(), orders: new Map() }
  return holder.__pasitoClubMock
}

const MOCK_TIERS = [
  ...PASITO_CLUB_TRAININGS.map((training) => ({
    position: training.position,
    tierId: 1000 + training.position,
    capacity: PASITO_CLUB_EVENT.capacityPerDate as number | null,
    label: `Pasito Club #${training.number} · ${training.shortLabel}`,
  })),
  { position: PASITO_CLUB_RACE.position, tierId: 1000 + PASITO_CLUB_RACE.position, capacity: null, label: `${PASITO_CLUB_RACE.name} · ${PASITO_CLUB_RACE.shortLabel}` },
]
// Demo-only occupancy so the scarcity states are visible locally.
const MOCK_BASE_SOLD: Record<number, number> = { 1: 187, 2: 164, 3: 92, 4: 41 }

function mockUsed(tierId: number): number {
  const state = mockState()
  const now = Date.now()
  let used = MOCK_BASE_SOLD[tierId - 1000] ?? 0
  for (const intent of state.intents.values()) {
    const active = intent.status === 'confirmed' || (intent.status === 'held' && intent.expiresAt > now)
    if (active && intent.tierIds.includes(tierId)) used += 1
  }
  return used
}

const mockStore: ClubStore = {
  async inventory() {
    return MOCK_TIERS.map((tier) => ({
      position: tier.position,
      tierId: tier.tierId,
      capacity: tier.capacity,
      available: tier.capacity === null ? null : Math.max(tier.capacity - mockUsed(tier.tierId), 0),
    }))
  },
  async reserve(input) {
    const state = mockState()
    for (const intent of state.intents.values()) {
      if (intent.clientKeyHash === input.clientKeyHash && intent.status === 'held') intent.status = 'cancelled'
    }
    const all = input.raceTierId ? [...input.tierIds, input.raceTierId] : input.tierIds
    const soldOut = all.filter((id) => {
      const tier = MOCK_TIERS.find((item) => item.tierId === id)
      return tier?.capacity != null && mockUsed(id) >= tier.capacity
    })
    if (soldOut.length) return { status: 'sold_out', tierIds: soldOut }
    const id = randomUUID()
    const expiresAt = Date.now() + 10 * 60_000
    state.intents.set(id, {
      id,
      quantity: all.length,
      amount: input.amount,
      currency: 'ARS',
      status: 'held',
      contact: { email: input.email, phone: input.phone, packSize: input.packSize, includesRace: Boolean(input.raceTierId) },
      tierIds: all,
      expiresAt,
      clientKeyHash: input.clientKeyHash,
    })
    return { status: 'reserved', intentId: id, quantity: all.length, amount: input.amount, currency: 'ARS', expiresAt: new Date(expiresAt).toISOString() }
  },
  async cancel(intentId) {
    const intent = mockState().intents.get(intentId)
    if (!intent) return 'not_found'
    if (intent.status === 'confirmed') return 'confirmed'
    intent.status = 'cancelled'
    return 'cancelled'
  },
  async loadIntent(intentId) {
    const intent = mockState().intents.get(intentId)
    return intent ? { id: intent.id, quantity: intent.quantity, amount: intent.amount, currency: intent.currency, status: intent.status } : null
  },
  async loadContact(intentId) {
    return mockState().intents.get(intentId)?.contact ?? null
  },
  async confirm(intent, paymentId, email, customerName) {
    const state = mockState()
    const stored = state.intents.get(intent.id)
    if (!stored) return { status: 'invalid_intent' }
    if (stored.orderId) return { status: 'duplicate', orderId: stored.orderId }
    const orderId = randomUUID()
    stored.status = 'confirmed'
    stored.orderId = orderId
    state.orders.set(orderId, {
      intentId: intent.id,
      order: { id: orderId, paymentId, email, customerName, amount: intent.amount, quantity: intent.quantity, paymentStatus: 'approved', emailSentAt: null },
      tickets: stored.tierIds.map((tierId, index) => {
        const tier = MOCK_TIERS.find((item) => item.tierId === tierId)!
        return { id: randomUUID(), code: randomBytes(5).toString('hex').toUpperCase(), number: index + 1, status: 'valid', position: tier.position, label: tier.label }
      }),
    })
    return { status: 'confirmed', orderId }
  },
  async loadOrderByIntent(intentId) {
    for (const bundle of mockState().orders.values()) if (bundle.intentId === intentId) return bundle
    return null
  },
  async loadTicket(ticketId) {
    for (const bundle of mockState().orders.values()) {
      const ticket = bundle.tickets.find((item) => item.id === ticketId)
      if (ticket) return { ticket, paymentStatus: bundle.order.paymentStatus, quantity: bundle.order.quantity }
    }
    return null
  },
  async recordEmailAttempt() {},
}

export function pasitoClubStore(): ClubStore {
  return pasitoClubMockMode() ? mockStore : supabaseStore
}

function privateHash(value: string): string {
  const secret = process.env.EVENT_TICKET_SIGNING_SECRET || process.env.REBILL_WEBHOOK_SECRET
  if (!secret) throw new Error('Falta EVENT_TICKET_SIGNING_SECRET.')
  return createHash('sha256').update(`${secret}:${value}`).digest('hex')
}

export function pasitoClubCheckoutIdentity(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown'
  const clientIpHash = privateHash(`${PASITO_CLUB_EVENT.slug}:ip:${ip}`)
  const existingBuyerId = request.cookies.get(PASITO_CLUB_BUYER_COOKIE)?.value
  const buyerId = existingBuyerId && /^[0-9a-f-]{36}$/i.test(existingBuyerId) ? existingBuyerId : randomUUID()
  return {
    buyerId,
    isNewBuyer: buyerId !== existingBuyerId,
    clientIpHash,
    clientKeyHash: privateHash(`${PASITO_CLUB_EVENT.slug}:buyer:${buyerId}:${clientIpHash}`),
  }
}
