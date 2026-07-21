import { NextRequest, NextResponse } from 'next/server'

import { TOMATE_EVENT, TOMATE_EVENT_TERMS_VERSION, type TicketBreakdown } from '@/lib/tomate-event'
import { checkoutIdentity, getTomateSupabase, TOMATE_BUYER_COOKIE } from '@/lib/tomate-server'
import { createIntentToken } from '@/lib/tomate-ticket-security'

type ReservationResult = {
  status?: string
  intentId?: string
  quantity?: number
  subtotalAmount?: number
  discountAmount?: number
  amount?: number
  currency?: string
  promoCode?: string
  discountPercent?: number
  expiresAt?: string
  breakdown?: TicketBreakdown[]
}

export async function POST(request: NextRequest) {
  let body: { quantity?: unknown; promoCode?: unknown; termsAccepted?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > TOMATE_EVENT.maxTicketsPerOrder) {
    return NextResponse.json({ error: `Podés comprar entre 1 y ${TOMATE_EVENT.maxTicketsPerOrder} entradas.` }, { status: 400 })
  }
  if (body.termsAccepted !== true) {
    return NextResponse.json({ error: 'Tenés que aceptar las bases y condiciones del evento.' }, { status: 400 })
  }
  const promoCode = typeof body.promoCode === 'string' ? body.promoCode.trim().toUpperCase() : ''
  if (promoCode && !/^[A-Z0-9_-]{3,40}$/.test(promoCode)) {
    return NextResponse.json({ error: 'El código de descuento no es válido.' }, { status: 400 })
  }

  try {
    const identity = checkoutIdentity(request)
    const db = getTomateSupabase()
    const { data, error } = await db.rpc('event_reserve_tickets', {
      p_event_slug: TOMATE_EVENT.slug,
      p_quantity: quantity,
      p_client_key_hash: identity.clientKeyHash,
      p_client_ip_hash: identity.clientIpHash,
      p_promo_code: promoCode || null,
    })
    if (error) throw error

    const result = (data ?? {}) as ReservationResult
    if (result.status === 'rate_limited') {
      return NextResponse.json({ error: 'Hay demasiadas reservas abiertas desde esta conexión. Esperá unos minutos.' }, { status: 429 })
    }
    if (result.status === 'sold_out') {
      return NextResponse.json({ error: 'No quedan suficientes entradas para esa cantidad.' }, { status: 409 })
    }
    if (result.status === 'promo_invalid') {
      return NextResponse.json({ error: 'El código de descuento no es válido.' }, { status: 400 })
    }
    if (result.status === 'promo_exhausted') {
      return NextResponse.json({ error: 'El código de descuento ya alcanzó su límite de usos.' }, { status: 409 })
    }
    if (result.status !== 'reserved' || !result.intentId || !result.expiresAt || !result.amount) {
      throw new Error(`Respuesta de reserva inesperada: ${result.status ?? 'vacía'}`)
    }

    const { error: acceptanceError } = await db.from('event_checkout_intents').update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: TOMATE_EVENT_TERMS_VERSION,
    }).eq('id', result.intentId).select('id').single()
    if (acceptanceError) {
      await db.rpc('event_cancel_ticket_reservation', { p_intent_id: result.intentId })
      throw acceptanceError
    }

    const response = NextResponse.json({
      intentId: result.intentId,
      intentToken: createIntentToken(result.intentId),
      quantity: result.quantity,
      subtotalAmount: result.subtotalAmount,
      discountAmount: result.discountAmount,
      amount: result.amount,
      currency: result.currency,
      promoCode: result.promoCode,
      discountPercent: result.discountPercent,
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
