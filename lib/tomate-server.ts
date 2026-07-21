import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

import { TOMATE_EVENT, type TicketInventoryTier } from '@/lib/tomate-event'

export const TOMATE_BUYER_COOKIE = 'tomate_buyer'

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

export function getTomateSupabase(): SupabaseClient {
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

export async function getTomateTicketInventory(): Promise<TicketInventoryTier[]> {
  const { data, error } = await getTomateSupabase().rpc('event_ticket_inventory', {
    p_event_slug: TOMATE_EVENT.slug,
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

export function requestIpHash(request: NextRequest, scope: string = TOMATE_EVENT.slug): string {
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
  const existingBuyerId = request.cookies.get(TOMATE_BUYER_COOKIE)?.value
  const buyerId = existingBuyerId && /^[0-9a-f-]{36}$/i.test(existingBuyerId)
    ? existingBuyerId
    : randomUUID()

  return {
    buyerId,
    clientKeyHash: privateHash(`${TOMATE_EVENT.slug}:buyer:${buyerId}:${requestIpHash(request)}`),
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
