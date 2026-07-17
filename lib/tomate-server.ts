import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

import { TOMATE_EVENT } from '@/lib/tomate-event'

export const TOMATE_BUYER_COOKIE = 'tomate_buyer'

let client: SupabaseClient | null = null

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
