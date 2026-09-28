import { NextRequest, NextResponse } from 'next/server'

import { WALKING_CLUB_UY_EVENT, isUuid } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase } from '@/lib/uruguay-walking-club-server'
import {
  getDlocalPayment,
  dlocalCustomerName,
  isDlocalPaymentAmountValid,
  type DlocalPayment,
} from '@/lib/uruguay-dlocal'

/**
 * TODO: Complete Dlocal payment confirmation flow
 * 
 * This endpoint is scaffolded to mirror the Tomate/Rebill pattern.
 * Once Dlocal integration is complete, this will:
 * 1. Verify the payment with Dlocal API
 * 2. Create the order in the database
 * 3. Generate QR ticket codes
 * 4. Send confirmation email
 * 
 * Required environment variables:
 * - DLOCAL_SECRET_KEY: For payment verification
 * - EVENT_TICKET_SIGNING_SECRET: For QR code generation
 * - RESEND_API_KEY: For email sending
 */

type IntentRow = {
  id: string
  amount: number
  quantity: number
  customer_email?: string | null
}

type OrderRow = {
  id: string
  dlocal_payment_id: string
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
      .select('id, dlocal_payment_id, customer_email, customer_name, quantity, amount, confirmation_email_sent_at')
      .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
      .eq('dlocal_payment_id', paymentId)
      .maybeSingle()

    if (lookupError) throw lookupError

    if (existingOrder) {
      // Payment already processed - return existing tickets
      const { data: tickets, error: ticketsError } = await db
        .from('event_tickets')
        .select('id, code, ticket_number')
        .eq('order_id', existingOrder.id)
        .order('ticket_number')

      if (ticketsError) throw ticketsError

      return NextResponse.json({
        emailPending: !existingOrder.confirmation_email_sent_at,
        tickets: (tickets ?? []).map((ticket) => ({
          code: ticket.code,
          number: ticket.ticket_number,
          url: `/walking-club-uy/ticket/${ticket.id}`,
        })),
      })
    }

    // TODO: Verify payment with Dlocal
    // For now, throw an error indicating Dlocal integration is needed
    throw new Error('Dlocal payment verification not yet implemented. Configure DLOCAL_SECRET_KEY and complete getDlocalPayment in lib/uruguay-dlocal.ts')

    // Once Dlocal is integrated, the flow would be:
    // 
    // const payment: DlocalPayment = await getDlocalPayment(paymentId)
    // 
    // const { data: intent, error: intentError } = await db
    //   .from('event_checkout_intents')
    //   .select('id, amount, quantity, customer_email')
    //   .eq('id', intentId)
    //   .eq('event_slug', WALKING_CLUB_UY_EVENT.slug)
    //   .maybeSingle()
    // 
    // if (intentError) throw intentError
    // if (!intent) {
    //   return NextResponse.json({ error: 'No encontramos esa reserva.' }, { status: 404 })
    // }
    // 
    // if (!isDlocalPaymentAmountValid(payment.amount, intent.amount, payment.installments)) {
    //   throw new Error('Payment amount mismatch')
    // }
    // 
    // const { data: order, error: orderError } = await db.rpc('event_confirm_order', {
    //   p_event_slug: WALKING_CLUB_UY_EVENT.slug,
    //   p_payment_id: paymentId,
    //   p_intent_id: intentId,
    //   p_customer_email: payment.payer?.email || intent.customer_email || '',
    //   p_customer_name: dlocalCustomerName(payment),
    // })
    // 
    // if (orderError) throw orderError
    // 
    // // Send confirmation email and return tickets
    // return NextResponse.json({ ... })

  } catch (error) {
    console.error('[walking-club-uy/orders/confirm] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No pudimos confirmar el pago.' },
      { status: 500 }
    )
  }
}
