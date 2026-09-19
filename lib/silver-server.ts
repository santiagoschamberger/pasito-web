import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'

import { SILVER_EVENT, type TicketInventoryTier } from '@/lib/silver-event'
import { getTomateSupabase } from '@/lib/tomate-server'

export const SILVER_BUYER_COOKIE = 'silver_buyer'

type InventoryRow = {
  tier_id: number | string
  tier_position: number
  tier_name: string
  unit_price: number
  capacity: number | null
  sold: number
  held: number
  available: number | null
}

export async function getSilverTicketInventory(): Promise<TicketInventoryTier[]> {
  const { data, error } = await getTomateSupabase().rpc('event_ticket_inventory', {
    p_event_slug: SILVER_EVENT.slug,
  })
  if (error) throw error

  return ((data ?? []) as InventoryRow[]).map((row) => ({
    tierId: Number(row.tier_id),
    position: Number(row.tier_position),
    name: row.tier_name,
    unitPrice: Number(row.unit_price),
    capacity: row.capacity === null ? null : Number(row.capacity),
    sold: Number(row.sold),
    held: Number(row.held),
    available: row.available === null ? null : Number(row.available),
  }))
}

function privateHash(value: string): string {
  const secret = process.env.EVENT_TICKET_SIGNING_SECRET || process.env.REBILL_WEBHOOK_SECRET
  if (!secret) throw new Error('Falta EVENT_TICKET_SIGNING_SECRET.')
  return createHash('sha256').update(`${secret}:${value}`).digest('hex')
}

function requestIpHash(request: NextRequest, scope: string = SILVER_EVENT.slug): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown'
  return privateHash(`${scope}:ip:${ip}`)
}

export function silverCheckoutIdentity(request: NextRequest): {
  buyerId: string
  clientKeyHash: string
  clientIpHash: string
  isNewBuyer: boolean
} {
  const existingBuyerId = request.cookies.get(SILVER_BUYER_COOKIE)?.value
  const buyerId = existingBuyerId && /^[0-9a-f-]{36}$/i.test(existingBuyerId)
    ? existingBuyerId
    : randomUUID()

  return {
    buyerId,
    clientKeyHash: privateHash(`${SILVER_EVENT.slug}:buyer:${buyerId}:${requestIpHash(request)}`),
    clientIpHash: requestIpHash(request),
    isNewBuyer: !existingBuyerId,
  }
}

export function requestOrigin(request: NextRequest): string {
  if (process.env.NODE_ENV === 'production') {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'https://pasito.app').replace(/\/$/, '')
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https')
  return host ? `${protocol}://${host}` : 'https://pasito.app'
}
