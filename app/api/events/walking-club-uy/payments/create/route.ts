import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { WALKING_CLUB_UY_EVENT, isUuid } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase, requestOrigin } from '@/lib/uruguay-walking-club-server'
import { readIntentToken, createIntentToken } from '@/lib/tomate-ticket-security'
import { createDlocalGoPayment, getDlocalGoPayment, DlocalGoApiError, dlocalGoPaymentMatchesIntent } from '@/lib/uruguay-dlocal'

export async function POST(request: NextRequest) {
  let body: { intentId?: unknown; intentToken?: unknown }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
  const intentId = typeof body.intentId === 'string' ? body.intentId.trim() : ''
  if (!isUuid(intentId)) return NextResponse.json({ error: 'Reserva inválida.' }, { status: 400 })

  try {
    if (typeof body.intentToken !== 'string' || readIntentToken(body.intentToken) !== intentId) {
      return NextResponse.json({ error: 'Token de reserva inválido.' }, { status: 403 })
    }
    const db = getWalkingClubUySupabase()
    const { data: intent, error } = await db.from('event_checkout_intents')
      .select('id, amount, currency, quantity, status, expires_at, terms_accepted_at, payment_provider_id')
      .eq('id', intentId).eq('event_slug', WALKING_CLUB_UY_EVENT.slug).maybeSingle()
    if (error) throw error
    if (!intent) return NextResponse.json({ error: 'No encontramos esa reserva.' }, { status: 404 })
    if (intent.status !== 'held' || Date.parse(intent.expires_at) <= Date.now() || !intent.terms_accepted_at) {
      return NextResponse.json({ error: 'La reserva venció. Volvé a elegir tus entradas.' }, { status: 409 })
    }
    if (intent.currency !== 'UYU' || intent.amount <= 0) {
      return NextResponse.json({ error: 'La reserva no tiene un importe válido en pesos uruguayos.' }, { status: 409 })
    }
    if (intent.payment_provider_id) {
      if (intent.payment_provider_id.startsWith('creating:')) {
        return NextResponse.json({ error: 'Estamos verificando el inicio del pago. No vuelvas a pagar; probá nuevamente en unos instantes.' }, { status: 409 })
      }
      const payment = await getDlocalGoPayment(intent.payment_provider_id)
      if (!dlocalGoPaymentMatchesIntent(payment, intent)) throw new Error('Payment does not match reservation')
      if (payment.status === 'PAID') {
        return NextResponse.json({ redirectUrl: `${requestOrigin(request)}/walking-club-uy/payment-success?intent_id=${intentId}&token=${createIntentToken(intentId)}` })
      }
      if (payment.status !== 'PENDING' || !payment.redirect_url) {
        return NextResponse.json({ error: 'Este pago ya no está disponible. Volvé a elegir tus entradas.' }, { status: 409 })
      }
      return NextResponse.json({ redirectUrl: payment.redirect_url })
    }

    // Atomic claim prevents double clicks or concurrent requests creating two charges.
    const claim = `creating:${randomUUID()}`
    const { data: claimed, error: claimError } = await db.from('event_checkout_intents')
      .update({ payment_provider: 'dlocalgo', payment_provider_id: claim })
      .eq('id', intentId).eq('status', 'held').gt('expires_at', new Date().toISOString())
      .is('payment_provider_id', null).select('id').maybeSingle()
    if (claimError) throw claimError
    if (!claimed) return NextResponse.json({ error: 'El pago ya se está iniciando. Esperá unos instantes.' }, { status: 409 })

    const origin = requestOrigin(request)
    let payment
    try {
      payment = await createDlocalGoPayment({
        amount: intent.amount, currency: 'UYU', country: 'UY', orderId: intentId,
        description: `${WALKING_CLUB_UY_EVENT.name} - ${intent.quantity} entrada(s)`,
        successUrl: `${origin}/walking-club-uy/payment-success?intent_id=${intentId}&token=${createIntentToken(intentId)}`,
        backUrl: `${origin}/walking-club-uy#comprar`,
        notificationUrl: `${origin}/api/dlocalgo/webhook`,
        expirationMinutes: Math.max(1, Math.ceil((Date.parse(intent.expires_at) - Date.now()) / 60_000)),
      })
    } catch (cause) {
      // Only release a definitely rejected request. Timeouts can hide a created payment.
      if (cause instanceof DlocalGoApiError && cause.status >= 400 && cause.status < 500) {
        await db.from('event_checkout_intents').update({ payment_provider_id: null })
          .eq('id', intentId).eq('payment_provider_id', claim)
      }
      throw cause
    }
    const { data: saved, error: saveError } = await db.from('event_checkout_intents')
      .update({ payment_provider_id: payment.paymentId }).eq('id', intentId)
      .eq('payment_provider_id', claim).select('id').maybeSingle()
    if (saveError || !saved) throw saveError || new Error('Payment could not be attached to reservation')
    return NextResponse.json({ redirectUrl: payment.redirectUrl }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[walking-club-uy/payments/create]', error)
    return NextResponse.json({ error: 'No pudimos iniciar el pago. Probá nuevamente en unos minutos.' }, { status: 502 })
  }
}
