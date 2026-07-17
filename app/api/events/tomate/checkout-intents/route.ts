import { NextRequest, NextResponse } from 'next/server'

import { TOMATE_EVENT, type TicketBreakdown } from '@/lib/tomate-event'
import { checkoutIdentity, getTomateSupabase, TOMATE_BUYER_COOKIE } from '@/lib/tomate-server'
import { createIntentToken } from '@/lib/tomate-ticket-security'

type ReservationResult = {
  status?: string
  intentId?: string
  quantity?: number
  amount?: number
  currency?: string
  expiresAt?: string
  breakdown?: TicketBreakdown[]
}

export async function POST(request: NextRequest) {
  let body: { quantity?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > TOMATE_EVENT.maxTicketsPerOrder) {
    return NextResponse.json({ error: `Podés comprar entre 1 y ${TOMATE_EVENT.maxTicketsPerOrder} entradas.` }, { status: 400 })
  }

  try {
    const identity = checkoutIdentity(request)
    const { data, error } = await getTomateSupabase().rpc('event_reserve_tickets', {
      p_event_slug: TOMATE_EVENT.slug,
      p_quantity: quantity,
      p_client_key_hash: identity.clientKeyHash,
      p_client_ip_hash: identity.clientIpHash,
    })
    if (error) throw error

    const result = (data ?? {}) as ReservationResult
    if (result.status === 'rate_limited') {
      return NextResponse.json({ error: 'Hay demasiadas reservas abiertas desde esta conexión. Esperá unos minutos.' }, { status: 429 })
    }
    if (result.status === 'sold_out') {
      return NextResponse.json({ error: 'No quedan suficientes entradas para esa cantidad.' }, { status: 409 })
    }
    if (result.status !== 'reserved' || !result.intentId || !result.expiresAt || !result.amount) {
      throw new Error(`Respuesta de reserva inesperada: ${result.status ?? 'vacía'}`)
    }

    const response = NextResponse.json({
      intentId: result.intentId,
      intentToken: createIntentToken(result.intentId),
      quantity: result.quantity,
      amount: result.amount,
      currency: result.currency,
      expiresAt: result.expiresAt,
      breakdown: result.breakdown ?? [],
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })

    if (identity.isNewBuyer) {
      response.cookies.set(TOMATE_BUYER_COOKIE, identity.buyerId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 90 * 24 * 60 * 60,
      })
    }
    return response
  } catch (error) {
    console.error('[tomate/checkout-intents] No se pudo reservar:', error)
    return NextResponse.json({ error: 'No pudimos reservar las entradas. Probá nuevamente.' }, { status: 500 })
  }
}
