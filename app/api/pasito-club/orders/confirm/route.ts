import { getTomateSupabase } from '@/lib/tomate-server'
import { assertIntentAccount, checkOrderAccount, bindNewOrderAccount } from '@/lib/rebill-routing'
import { NextRequest, NextResponse } from 'next/server'

import { EmailDeliveryError, emailDeliveryErrorMessage, retryEmailDelivery } from '@/lib/email-retry'
import { PASITO_CLUB_EVENT } from '@/lib/pasito-club-event'
import { pasitoClubMockMode, pasitoClubStore, type ClubIntent } from '@/lib/pasito-club-server'
import { pasitoClubTicketLinks, sendPasitoClubTicketsEmail } from '@/lib/pasito-club-ticket-email'
import { isRebillPaymentAmountValid } from '@/lib/rebill-payment-validation'
import { getRebillPayment, rebillCustomerName, type RebillPayment } from '@/lib/tomate-rebill'
import { requestOrigin } from '@/lib/tomate-server'

const headers = { 'Cache-Control': 'no-store, max-age=0' }

/** Test payments never reach Rebill: only outside production, with e2e or mock mode on. */
function testPayment(paymentId: string, intent: ClubIntent): RebillPayment | null {
  if (process.env.NODE_ENV === 'production') return null
  if (process.env.TOMATE_E2E_MODE !== '1' && !pasitoClubMockMode()) return null
  if (!/^e2e_pay_[a-z0-9_-]{8,80}$/i.test(paymentId)) return null
  return {
    id: paymentId,
    status: 'approved',
    amount: intent.amount,
    currency: intent.currency,
    metadata: { eventSlug: PASITO_CLUB_EVENT.slug, checkoutIntentId: intent.id, quantity: String(intent.quantity) },
    customer: { firstName: 'Prueba', lastName: 'E2E' },
  }
}

export async function POST(request: NextRequest) {
  let body: { paymentId?: unknown; intentId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400, headers })
  }
  const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : ''
  const intentId = typeof body.intentId === 'string' ? body.intentId.trim() : ''
  if (!paymentId || paymentId.length > 200 || !/^[0-9a-f-]{36}$/i.test(intentId)) {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400, headers })
  }

  const store = pasitoClubStore()
  try {
    const intent = await store.loadIntent(intentId)
    if (!intent) return NextResponse.json({ error: 'La reserva no existe.' }, { status: 404, headers })

    const fakePayment = testPayment(paymentId, intent)
    let payment: RebillPayment
    try {
      payment = fakePayment ?? await getRebillPayment(paymentId, intent.rebill_account, request)
    } catch (error) {
      console.error('[pasito-club/orders] Rebill no pudo verificar el pago:', error)
      return NextResponse.json({ error: 'No pudimos verificar el pago todavía.' }, { status: 502, headers })
    }
    assertIntentAccount(intent, payment)
    if (payment.status !== 'approved') {
      return NextResponse.json({ error: 'El pago todavía no está aprobado.' }, { status: 402, headers })
    }
    const metadata = payment.metadata
    if (
      !isRebillPaymentAmountValid(payment.amount, intent.amount, payment.installments)
      || payment.currency?.toUpperCase() !== intent.currency
      || metadata?.eventSlug !== PASITO_CLUB_EVENT.slug
      || metadata?.checkoutIntentId !== intent.id
      || String(metadata?.quantity) !== String(intent.quantity)
    ) {
      return NextResponse.json({ error: 'El pago no coincide con la reserva.' }, { status: 400, headers })
    }

    // The email typed in our form is the one we promised to send the QRs to;
    // Rebill's customer email is only a fallback.
    const contact = await store.loadContact(intent.id)
    const email = contact?.email ?? payment.customer?.email?.trim().toLowerCase() ?? ''
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'La compra no tiene un email válido para enviar las entradas.' }, { status: 409, headers })
    }

    if (!fakePayment) await checkOrderAccount(getTomateSupabase(), 'event_ticket_orders', payment)
    const result = await store.confirm(intent, paymentId, email, rebillCustomerName(payment))
    if (result.status !== 'confirmed' && result.status !== 'duplicate') {
      const status = result.status === 'amount_mismatch' ? 400 : 409
      return NextResponse.json({ error: 'El pago fue recibido, pero la reserva requiere revisión.', result: result.status }, { status, headers })
    }

    if (!fakePayment) await bindNewOrderAccount(getTomateSupabase(), 'event_ticket_orders', payment, intent)
    const bundle = await store.loadOrderByIntent(intent.id)
    if (!bundle) throw new Error('No se encontró la orden confirmada.')
    const origin = requestOrigin(request)

    let emailPending = !bundle.order.emailSentAt
    if (fakePayment) {
      emailPending = false
    } else if (emailPending) {
      let attempts = 0
      try {
        const delivery = await retryEmailDelivery(() => sendPasitoClubTicketsEmail({ origin, bundle }))
        attempts = delivery.attempts
        await store.recordEmailAttempt(bundle.order.id, delivery.attempts, delivery.value.id, null)
        emailPending = false
      } catch (error) {
        const attemptCount = error instanceof EmailDeliveryError ? error.attempts : Math.max(attempts, 1)
        const message = emailDeliveryErrorMessage(error)
        console.error('[pasito-club/orders] No se pudo enviar el email:', message)
        await store.recordEmailAttempt(bundle.order.id, attemptCount, null, message)
          .catch((trackingError) => console.error('[pasito-club/orders] No se pudo registrar el email:', trackingError))
      }
    }

    return NextResponse.json({
      ok: true,
      result: result.status,
      latePayment: Boolean(result.latePayment),
      emailPending,
      email,
      tickets: pasitoClubTicketLinks(origin, bundle.tickets),
    }, { headers })
  } catch (error) {
    console.error('[pasito-club/orders] No se pudo confirmar la orden:', error)
    return NextResponse.json({ error: 'No pudimos registrar la compra. No vuelvas a pagar; escribinos para revisarla.' }, { status: 500, headers })
  }
}
