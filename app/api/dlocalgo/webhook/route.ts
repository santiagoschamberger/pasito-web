import { NextRequest, NextResponse } from 'next/server'
import { verifyDlocalGoNotification, getDlocalGoPayment } from '@/lib/uruguay-dlocal'
import { getWalkingClubUySupabase, requestOrigin } from '@/lib/uruguay-walking-club-server'
import { WALKING_CLUB_UY_EVENT, isUuid } from '@/lib/uruguay-walking-club-event'
import { confirmWalkingClubUyOrder } from '@/lib/uruguay-order-confirmation'

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text()
    if (!verifyDlocalGoNotification(raw, request.headers.get('authorization'))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    let body: { payment_id?: unknown }
    try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    if (typeof body.payment_id !== 'string' || !/^DP-[\w-]{1,180}$/.test(body.payment_id)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 })
    }
    const payment = await getDlocalGoPayment(body.payment_id)
    console.info('[dlocalgo/webhook] verified', { paymentId: body.payment_id, status: payment.status, linkedReservation: isUuid(payment.order_id) })
    if (!isUuid(payment.order_id)) return NextResponse.json({ ok: true })
    const db = getWalkingClubUySupabase()
    const { data: intent, error } = await db.from('event_checkout_intents')
      .select('id, payment_provider_id').eq('id', payment.order_id)
      .eq('event_slug', WALKING_CLUB_UY_EVENT.slug).maybeSingle()
    if (error) throw error
    console.info('[dlocalgo/webhook] reservation', { paymentId: body.payment_id, found: Boolean(intent) })
    if (!intent) return NextResponse.json({ ok: true })
    // A verified notification can recover a payment created before a network timeout.
    if (intent.payment_provider_id?.startsWith('creating:')) {
      const { error: attachError } = await db.from('event_checkout_intents')
        .update({ payment_provider_id: payment.id }).eq('id', intent.id)
        .eq('payment_provider_id', intent.payment_provider_id)
      if (attachError) throw attachError
    } else if (intent.payment_provider_id !== payment.id) throw new Error('Payment does not match reservation')
    if (payment.status === 'PAID') {
      const result = await confirmWalkingClubUyOrder(intent.id, requestOrigin(request), payment.id)
      console.info('[dlocalgo/webhook] fulfillment', { paymentId: body.payment_id, emailPending: result.emailPending })
      if (result.emailPending) return NextResponse.json({ error: 'Email pending' }, { status: 503 })
    } else if (payment.status === 'REFUNDED' || payment.status === 'CANCELLED') {
      const { error: updateError } = await db.rpc('event_update_order_payment', {
        p_payment_id: `dlocalgo:${payment.id}`, p_payment_status: payment.status.toLowerCase(),
      })
      if (updateError) throw updateError
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[dlocalgo/webhook]', error)
    return NextResponse.json({ error: 'Please retry' }, { status: 503 })
  }
}
