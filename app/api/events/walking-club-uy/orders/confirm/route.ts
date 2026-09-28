import { NextRequest, NextResponse } from 'next/server'

import { WALKING_CLUB_UY_EVENT, isUuid } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase } from '@/lib/uruguay-walking-club-server'
import {
  getDlocalGoPayment,
  dlocalGoCustomerName,
  isDlocalGoPaymentAmountValid,
  normalizeDlocalGoStatus,
  type DlocalGoPayment,
} from '@/lib/uruguay-dlocal'

/**
 * Confirms a dLocal Go payment after the user returns from the hosted checkout.
 * This endpoint verifies the payment status and creates the order if approved.
 */

type IntentRow = {
  id: string
  amount: number
  quantity: number
  customer_email: string | null
  payment_provider_id: string | null
}

type OrderRow = {
  id: string
  dlocalgo_payment_id: string
  customer_email: string
  customer_name: string | null
  quantity: number
  amount: number
  confirmation_email_sent_at: string | null
}

export async function POST(request: NextRequest) {
  let body: { paymentId?: unknown; intentId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : ''
  const intentId = typeof body.intentId === 'string' ? body.intentId.trim() : ''

  if (!paymentId) {
    return NextResponse.json({ error: 'Falta el identificador del pago.' }, { status: 400 })
  }
  if (!isUuid(intentId)) {
    return NextResponse.json({ error: 'Identificador de intención inválido.' }, { status: 400 })
  }

  try {
    const db = getWalkingClubUySupabase()

    const { data: existingOrder, error: lookupError } = await db
      .from('event_ticket_orders')
      .select('id, dlocalgo_payment_id, customer_email, customer_name, quantity, amount, confirmation_email_sent_at')
      .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
      .eq('dlocalgo_payment_id', paymentId)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existingOrder) {
      const order = existingOrder as unknown as OrderRow
      const { data: tickets, error: ticketsError } = await db
        .from('event_tickets')
        .select('id, code, ticket_number')
        .eq('order_id', order.id)
        .order('ticket_number')

      if (ticketsError) throw ticketsError

      return NextResponse.json({
        emailPending: !order.confirmation_email_sent_at,
        tickets: (tickets ?? []).map((ticket) => ({
          code: ticket.code,
          number: ticket.ticket_number,
          url: `/walking-club-uy/ticket/${ticket.id}`,
        })),
      })
    }

    const payment: DlocalGoPayment = await getDlocalGoPayment(paymentId)
    const status = normalizeDlocalGoStatus(payment.status)

    if (status !== 'approved') {
      return NextResponse.json({ error: 'El pago aún no fue aprobado.' }, { status: 402 })
    }

    const { data: intent, error: intentError } = await db
      .from('event_checkout_intents')
      .select('id, amount, quantity, customer_email, payment_provider_id')
      .eq('id', intentId)
      .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
      .maybeSingle()

    if (intentError) throw intentError
    if (!intent) {
      return NextResponse.json({ error: 'No encontramos esa reserva.' }, { status: 404 })
    }

    const typedIntent = intent as unknown as IntentRow

    if (!isDlocalGoPaymentAmountValid(payment.amount, typedIntent.amount)) {
      throw new Error('Payment amount mismatch')
    }

    const customerName = dlocalGoCustomerName(payment)
    const { data: orderData, error: orderError } = await db.rpc('event_confirm_order', {
      p_event_slug: WALKING_CLUB_UY_EVENT.slug,
      p_payment_id: paymentId,
      p_intent_id: intentId,
      p_customer_email: payment.payer?.email || typedIntent.customer_email || '',
      p_customer_name: customerName,
    })

    if (orderError) throw orderError

    const orderId = (orderData as { order_id?: string })?.order_id
    if (!orderId) {
      throw new Error('No order ID returned')
    }

    const { data: newOrder } = await db
      .from('event_ticket_orders')
      .select('id, dlocalgo_payment_id, customer_email, customer_name, quantity, amount, confirmation_email_sent_at')
      .eq('id', orderId)
      .single()

    const { data: newTickets } = await db
      .from('event_tickets')
      .select('id, code, ticket_number')
      .eq('order_id', orderId)
      .order('ticket_number')

    return NextResponse.json({
      emailPending: !(newOrder as unknown as OrderRow)?.confirmation_email_sent_at,
      tickets: (newTickets ?? []).map((ticket) => ({
        code: ticket.code,
        number: ticket.ticket_number,
        url: `/walking-club-uy/ticket/${ticket.id}`,
      })),
    })
  } catch (error) {
    console.error('[walking-club-uy/orders/confirm] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No pudimos confirmar el pago.' },
      { status: 500 }
    )
  }
}
