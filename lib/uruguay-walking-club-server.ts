import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

import { WALKING_CLUB_UY_EVENT, type TicketInventoryTier } from '@/lib/uruguay-walking-club-event'

export const WALKING_CLUB_UY_BUYER_COOKIE = 'walking_club_uy_buyer'

let client: SupabaseClient | null = null

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

export function getWalkingClubUySupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Falta la configuración de Supabase.')

  if (!client) {
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export async function getWalkingClubUyTicketInventory(): Promise<TicketInventoryTier[]> {
  const { data, error } = await getWalkingClubUySupabase().rpc('event_ticket_inventory', {
    p_event_slug: WALKING_CLUB_UY_EVENT.slug,
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
  const secret = process.env.EVENT_TICKET_SIGNING_SECRET || process.env.DLOCALGO_WEBHOOK_SECRET
  if (!secret) throw new Error('Falta EVENT_TICKET_SIGNING_SECRET.')
  return createHash('sha256').update(`${secret}:${value}`).digest('hex')
}

export function requestIpHash(request: NextRequest, scope: string = WALKING_CLUB_UY_EVENT.slug): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown'
  return privateHash(`${scope}:ip:${ip}`)
}

export function checkoutIdentity(request: NextRequest): {
  buyerId: string
  clientKeyHash: string
  clientIpHash: string
  isNewBuyer: boolean
} {
  const existingBuyerId = request.cookies.get(WALKING_CLUB_UY_BUYER_COOKIE)?.value
  const buyerId = existingBuyerId && /^[0-9a-f-]{36}$/i.test(existingBuyerId)
    ? existingBuyerId
    : randomUUID()

  return {
    buyerId,
    clientKeyHash: privateHash(`${WALKING_CLUB_UY_EVENT.slug}:buyer:${buyerId}:${requestIpHash(request)}`),
    clientIpHash: requestIpHash(request),
    isNewBuyer: !existingBuyerId,
  }
}

export function requestOrigin(request: NextRequest): string {
  if (process.env.NODE_ENV === 'production') {
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pasito.app')
    // New payment callbacks go directly to the canonical host. Existing apex
    // callbacks are kept working by the webhook exception in next.config.mjs.
    if (origin.hostname === 'pasito.app') origin.hostname = 'www.pasito.app'
    return origin.origin
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const protocol = forwardedProto || (host?.includes('localhost') ? 'http' : 'https')
  return host ? `${protocol}://${host}` : 'https://pasito.app'
}
