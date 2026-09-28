import { NextRequest, NextResponse } from 'next/server'

import { WALKING_CLUB_UY_EVENT, isUuid } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase, requestOrigin } from '@/lib/uruguay-walking-club-server'
import { readIntentToken } from '@/lib/tomate-ticket-security'
import { createDlocalGoPayment } from '@/lib/uruguay-dlocal'

export async function POST(request: NextRequest) {
  let body: { intentId?: unknown; intentToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const intentId = typeof body.intentId === 'string' ? body.intentId.trim() : ''
  const tokenId = typeof body.intentToken === 'string' ? readIntentToken(body.intentToken) : null

  if (!isUuid(intentId)) {
    return NextResponse.json({ error: 'Identificador de intención inválido.' }, { status: 400 })
  }

  if (!tokenId || tokenId !== intentId) {
    return NextResponse.json({ error: 'Token de intención inválido.' }, { status: 403 })
  }

  try {
    const db = getWalkingClubUySupabase()
    
    // Verify the reservation exists and is valid
    const { data: intent, error: intentError } = await db
      .from('event_checkout_intents')
      .select('id, amount, currency, quantity, customer_email')
      .eq('id', intentId)
      .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
      .maybeSingle()

    if (intentError) throw intentError
    if (!intent) {
      return NextResponse.json({ error: 'No encontramos esa reserva.' }, { status: 404 })
    }

    const origin = requestOrigin(request)
    
    // Create payment in dLocal Go
    const payment = await createDlocalGoPayment({
      amount: intent.amount,
      currency: intent.currency,
      country: 'UY',
      orderId: intentId,
      description: `${WALKING_CLUB_UY_EVENT.name} - ${intent.quantity} entrada${intent.quantity > 1 ? 's' : ''}`,
      successUrl: `${origin}/walking-club-uy/payment-success?intent_id=${intentId}`,
      backUrl: `${origin}/walking-club-uy#comprar`,
      notificationUrl: `${origin}/api/dlocalgo/webhook/${process.env.DLOCALGO_WEBHOOK_SECRET || 'secret'}`,
      payerEmail: intent.customer_email || undefined,
    })

    // Store the dLocal Go payment ID in the intent
    const { error: updateError } = await db
      .from('event_checkout_intents')
      .update({ 
        payment_provider_id: payment.paymentId,
        payment_provider: 'dlocalgo',
      })
      .eq('id', intentId)

    if (updateError) {
      console.error('[walking-club-uy/payments/create] No se pudo actualizar el intent:', updateError)
    }

    return NextResponse.json({ redirectUrl: payment.redirectUrl })
  } catch (error) {
    console.error('[walking-club-uy/payments/create] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No pudimos crear el pago.' },
      { status: 500 }
    )
  }
}
