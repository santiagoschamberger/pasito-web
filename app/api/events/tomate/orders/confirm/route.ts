import { NextRequest, NextResponse } from 'next/server'

import { TOMATE_EVENT, type EventTicket } from '@/lib/tomate-event'
import { getRebillPayment, rebillCustomerName, type RebillPayment } from '@/lib/tomate-rebill'
import { getTomateSupabase, requestOrigin } from '@/lib/tomate-server'
import { sendTomateTicketsEmail } from '@/lib/tomate-ticket-email'
import { createTicketToken } from '@/lib/tomate-ticket-security'

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

async function loadOrder(paymentId: string): Promise<{ order: OrderRow; tickets: EventTicket[] }> {
  const db = getTomateSupabase()
  const { data: order, error: orderError } = await db
    .from('event_ticket_orders')
    .select('id, rebill_payment_id, customer_email, customer_name, quantity, amount, confirmation_email_sent_at')
    .eq('event_slug', TOMATE_EVENT.slug)
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

function e2ePayment(paymentId: string, intent: IntentRow): RebillPayment | null {
  if (process.env.NODE_ENV === 'production' || process.env.TOMATE_E2E_MODE !== '1') return null
  if (!/^e2e_pay_[a-z0-9_-]{8,80}$/i.test(paymentId)) return null
  return {
    id: paymentId,
    status: 'approved',
    amount: intent.amount,
    currency: intent.currency,
    metadata: {
      eventSlug: intent.event_slug,
      checkoutIntentId: intent.id,
      quantity: String(intent.quantity),
    },
    customer: {
      email: process.env.TOMATE_E2E_EMAIL || 'entrada-e2e@pasito.app',
      firstName: 'Prueba',
      lastName: 'E2E',
    },
  }
}

export async function POST(request: NextRequest) {
  let body: { paymentId?: unknown; intentId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400 })
  }

  const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : ''
  const intentId = typeof body.intentId === 'string' ? body.intentId.trim() : ''
  if (!paymentId || paymentId.length > 200 || !/^[0-9a-f-]{36}$/i.test(intentId)) {
    return NextResponse.json({ error: 'Confirmación inválida.' }, { status: 400 })
  }

  const db = getTomateSupabase()
  try {
    const { data: rawIntent, error: intentError } = await db
      .from('event_checkout_intents')
      .select('id, event_slug, quantity, amount, currency')
      .eq('id', intentId)
      .eq('event_slug', TOMATE_EVENT.slug)
      .maybeSingle()
    if (intentError) throw intentError
    if (!rawIntent) return NextResponse.json({ error: 'La reserva no existe.' }, { status: 404 })
    const intent = rawIntent as IntentRow

    let payment: RebillPayment
    try {
      payment = e2ePayment(paymentId, intent) ?? await getRebillPayment(paymentId)
    } catch (error) {
      console.error('[tomate/orders] Rebill no pudo verificar el pago:', error)
      return NextResponse.json({ error: 'No pudimos verificar el pago todavía.' }, { status: 502 })
    }

    if (payment.status !== 'approved') {
      return NextResponse.json({ error: 'El pago todavía no está aprobado.' }, { status: 402 })
    }
    const metadata = payment.metadata
    if (
      Number(payment.amount) !== Number(intent.amount)
      || payment.currency?.toUpperCase() !== intent.currency
      || metadata?.eventSlug !== TOMATE_EVENT.slug
      || metadata?.checkoutIntentId !== intent.id
      || String(metadata?.quantity) !== String(intent.quantity)
    ) {
      return NextResponse.json({ error: 'El pago no coincide con la reserva.' }, { status: 400 })
    }

    const email = payment.customer?.email?.trim().toLowerCase() ?? ''
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'El pago no incluye un email válido para enviar las entradas.' }, { status: 409 })
    }
    const customerName = rebillCustomerName(payment)

    const { data, error } = await db.rpc('event_confirm_ticket_order', {
      p_intent_id: intent.id,
      p_payment_id: paymentId,
      p_amount: intent.amount,
      p_currency: intent.currency,
      p_email: email,
      p_customer_name: customerName,
    })
    if (error) throw error
    const result = (data ?? {}) as ConfirmResult
    if (result.status !== 'confirmed' && result.status !== 'duplicate') {
      const status = result.status === 'amount_mismatch' ? 400 : 409
      return NextResponse.json({ error: 'El pago fue recibido, pero la reserva requiere revisión.', result: result.status }, { status })
    }

    const bundle = await loadOrder(paymentId)
    let emailPending = Boolean(!bundle.order.confirmation_email_sent_at)
    const isE2e = Boolean(e2ePayment(paymentId, intent))
    const shouldSendEmail = !isE2e || process.env.TOMATE_E2E_SEND_EMAIL === '1'
    if (emailPending && shouldSendEmail) {
      try {
        const sent = await sendTomateTicketsEmail({
          origin: requestOrigin(request),
          kind: 'confirmation',
          orders: [{
            id: bundle.order.id,
            paymentId: bundle.order.rebill_payment_id,
            customerEmail: bundle.order.customer_email,
            customerName: bundle.order.customer_name,
            amount: bundle.order.amount,
            quantity: bundle.order.quantity,
            tickets: bundle.tickets,
          }],
        })
        const { error: emailTrackingError } = await db.from('event_ticket_orders').update({
          confirmation_email_sent_at: new Date().toISOString(),
          confirmation_email_id: sent.id,
          updated_at: new Date().toISOString(),
        }).eq('id', bundle.order.id)
        if (emailTrackingError) console.error('[tomate/orders] No se pudo registrar el email:', emailTrackingError)
        emailPending = false
      } catch (error) {
        console.error('[tomate/orders] No se pudo enviar el email:', error)
      }
    } else if (isE2e) {
      emailPending = false
    }

    return NextResponse.json({
      ok: true,
      result: result.status,
      latePayment: Boolean(result.latePayment),
      emailPending,
      tickets: bundle.tickets.map((ticket) => ({
        code: ticket.code,
        number: ticket.number,
        url: `${requestOrigin(request)}/evento-pasito/ticket/${createTicketToken(ticket.id)}`,
      })),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    console.error('[tomate/orders] No se pudo confirmar la orden:', error)
    return NextResponse.json({ error: 'No pudimos registrar la compra. No vuelvas a pagar; escribinos para revisarla.' }, { status: 500 })
  }
}
