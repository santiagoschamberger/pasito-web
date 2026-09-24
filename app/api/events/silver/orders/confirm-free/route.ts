import { NextRequest, NextResponse } from 'next/server'

import { SILVER_EVENT, type EventTicket } from '@/lib/silver-event'
import {
  EmailDeliveryError,
  emailDeliveryErrorMessage,
  retryEmailDelivery,
} from '@/lib/email-retry'
import { getTomateSupabase } from '@/lib/tomate-server'
import { requestOrigin } from '@/lib/silver-server'
import { sendSilverTicketsEmail } from '@/lib/silver-ticket-email'
import { createTicketToken, readIntentToken } from '@/lib/tomate-ticket-security'

type ConfirmResult = {
  status?: 'confirmed' | 'duplicate' | 'invalid' | 'invalid_intent' | 'amount_mismatch'
  orderId?: string
  latePayment?: boolean
}

type IntentRow = {
  id: string
  event_slug: string
  quantity: number
  amount: number
  currency: string
  status: string
  expires_at: string
  terms_accepted_at: string | null
}

type OrderRow = {
  id: string
  rebill_payment_id: string
  customer_email: string
  customer_name: string | null
  quantity: number
  amount: number
  confirmation_email_sent_at: string | null
}

type TicketRow = {
  id: string
  short_code: string
  ticket_number: number
  status: 'valid' | 'used' | 'void'
  checked_in_at: string | null
}

function freePaymentId(intentId: string): string {
  return `free_${intentId}`
}

async function loadOrder(paymentId: string): Promise<{ order: OrderRow; tickets: EventTicket[] }> {
  const db = getTomateSupabase()
  const { data: order, error: orderError } = await db
    .from('event_ticket_orders')
    .select('id, rebill_payment_id, customer_email, customer_name, quantity, amount, confirmation_email_sent_at')
    .eq('event_slug', SILVER_EVENT.slug)
    .eq('rebill_payment_id', paymentId)
    .single()
  if (orderError || !order) throw orderError ?? new Error('No se encontró la orden confirmada.')

  const { data: rows, error: ticketsError } = await db
    .from('event_tickets')
    .select('id, short_code, ticket_number, status, checked_in_at')
    .eq('order_id', order.id)
    .order('ticket_number')
  if (ticketsError) throw ticketsError

  return {
    order: order as OrderRow,
    tickets: ((rows ?? []) as TicketRow[]).map((ticket) => ({
      id: ticket.id,
      code: ticket.short_code,
      number: ticket.ticket_number,
      status: ticket.status,
      checkedInAt: ticket.checked_in_at,
    })),
  }
}

export async function POST(request: NextRequest) {
  let body: { intentToken?: unknown; email?: unknown; customerName?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400 })
  }

  const intentId = typeof body.intentToken === 'string' ? readIntentToken(body.intentToken) : null
  if (!intentId) {
    return NextResponse.json({ error: 'Token de intención inválido.' }, { status: 403 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Ingresá un email válido para recibir las entradas.' }, { status: 400 })
  }

  const customerName = typeof body.customerName === 'string'
    ? body.customerName.trim().slice(0, 120)
    : ''

  const db = getTomateSupabase()
  try {
    const { data: rawIntent, error: intentError } = await db
      .from('event_checkout_intents')
      .select('id, event_slug, quantity, amount, currency, status, expires_at, terms_accepted_at')
      .eq('id', intentId)
      .eq('event_slug', SILVER_EVENT.slug)
      .maybeSingle()
    if (intentError) throw intentError
    if (!rawIntent) return NextResponse.json({ error: 'La reserva no existe.' }, { status: 404 })

    const intent = rawIntent as IntentRow
    if (intent.amount !== 0) {
      return NextResponse.json({ error: 'Esta reserva requiere pago.' }, { status: 400 })
    }
    if (!intent.terms_accepted_at) {
      return NextResponse.json({ error: 'Tenés que aceptar las bases y condiciones del evento.' }, { status: 400 })
    }
    if (intent.status === 'confirmed') {
      const paymentId = freePaymentId(intent.id)
      const bundle = await loadOrder(paymentId)
      const origin = requestOrigin(request)
      return NextResponse.json({
        ok: true,
        result: 'duplicate',
        emailPending: Boolean(!bundle.order.confirmation_email_sent_at),
        tickets: bundle.tickets.map((ticket) => ({
          code: ticket.code,
          number: ticket.number,
          url: `${origin}/silver/ticket/${createTicketToken(ticket.id)}`,
        })),
      }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
    }
    if (intent.status !== 'held' || new Date(intent.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'La reserva venció. Generá una nueva con el código.' }, { status: 409 })
    }

    const paymentId = freePaymentId(intent.id)
    const { data, error } = await db.rpc('event_confirm_ticket_order', {
      p_intent_id: intent.id,
      p_payment_id: paymentId,
      p_amount: 0,
      p_currency: intent.currency,
      p_email: email,
      p_customer_name: customerName || null,
    })
    if (error) throw error
    const result = (data ?? {}) as ConfirmResult
    if (result.status !== 'confirmed' && result.status !== 'duplicate') {
      const status = result.status === 'amount_mismatch' ? 400 : 409
      return NextResponse.json({
        error: 'No pudimos confirmar la entrada gratuita.',
        result: result.status,
      }, { status })
    }

    const bundle = await loadOrder(paymentId)
    const origin = requestOrigin(request)

    let emailPending = Boolean(!bundle.order.confirmation_email_sent_at)
    if (emailPending) {
      let sendAttempts = 0
      try {
        const delivery = await retryEmailDelivery(() => sendSilverTicketsEmail({
          origin,
          kind: 'confirmation',
          pasitosRewards: [],
          orders: [{
            id: bundle.order.id,
            paymentId: bundle.order.rebill_payment_id,
            customerEmail: bundle.order.customer_email,
            customerName: bundle.order.customer_name,
            amount: bundle.order.amount,
            quantity: bundle.order.quantity,
            tickets: bundle.tickets,
          }],
        }))
        sendAttempts = delivery.attempts
        const { error: emailTrackingError } = await db.rpc('event_record_confirmation_email_attempt', {
          p_order_id: bundle.order.id,
          p_attempt_count: delivery.attempts,
          p_email_id: delivery.value.id,
          p_error: null,
        })
        if (emailTrackingError) throw emailTrackingError
        emailPending = false
      } catch (error) {
        const attemptCount = error instanceof EmailDeliveryError ? error.attempts : Math.max(sendAttempts, 1)
        const errorMessage = emailDeliveryErrorMessage(error)
        console.error('[silver/orders/confirm-free] No se pudo enviar o registrar el email:', errorMessage)
        const { error: trackingError } = await db.rpc('event_record_confirmation_email_attempt', {
          p_order_id: bundle.order.id,
          p_attempt_count: attemptCount,
          p_email_id: null,
          p_error: errorMessage,
        })
        if (trackingError) {
          console.error('[silver/orders/confirm-free] No se pudo registrar el intento de email:', trackingError)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      result: result.status,
      latePayment: Boolean(result.latePayment),
      emailPending,
      tickets: bundle.tickets.map((ticket) => ({
        code: ticket.code,
        number: ticket.number,
        url: `${origin}/silver/ticket/${createTicketToken(ticket.id)}`,
      })),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('[silver/orders/confirm-free] No se pudo confirmar la orden gratuita:', error)
    return NextResponse.json({ error: 'No pudimos registrar la entrada gratuita. Probá nuevamente.' }, { status: 500 })
  }
}
