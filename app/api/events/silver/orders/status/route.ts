import { NextRequest, NextResponse } from 'next/server'

import { SILVER_EVENT } from '@/lib/silver-event'
import { requestOrigin } from '@/lib/silver-server'
import { getTomateSupabase } from '@/lib/tomate-server'
import { createTicketToken, readIntentToken } from '@/lib/tomate-ticket-security'

const headers = { 'Cache-Control': 'no-store, max-age=0' }

// APM success events may omit paymentId. Recover the webhook-confirmed order
// using the signed reservation token; a bare intent ID must never reveal tickets.
export async function POST(request: NextRequest) {
  let body: { intentToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400, headers })
  }
  const intentId = typeof body?.intentToken === 'string' && body.intentToken.length < 300
    ? readIntentToken(body.intentToken) : null
  if (!intentId) {
    return NextResponse.json({ error: 'Reserva inválida.' }, { status: 403, headers })
  }

  try {
    const db = getTomateSupabase()
    const { data: order, error } = await db.from('event_ticket_orders')
      .select('id, quantity, payment_status, confirmation_email_sent_at')
      .eq('event_slug', SILVER_EVENT.slug)
      .eq('checkout_intent_id', intentId)
      .maybeSingle()
    if (error) throw error
    if (!order) return NextResponse.json({ status: 'pending' }, { headers })
    if (order.payment_status !== 'approved') {
      return NextResponse.json({ status: 'inactive', refunded: order.payment_status === 'refunded' }, { headers })
    }

    const { data: tickets, error: ticketsError } = await db.from('event_tickets')
      .select('id, short_code, ticket_number, status')
      .eq('order_id', order.id)
      .order('ticket_number')
    if (ticketsError) throw ticketsError
    if (!tickets?.length || tickets.length !== order.quantity || tickets.some(ticket => ticket.status === 'void')) {
      return NextResponse.json({ status: 'pending' }, { headers })
    }
    const origin = requestOrigin(request)
    return NextResponse.json({
      status: 'confirmed',
      emailPending: !order.confirmation_email_sent_at,
      tickets: tickets.map(ticket => ({
        code: ticket.short_code,
        number: ticket.ticket_number,
        url: `${origin}/silver/ticket/${createTicketToken(ticket.id)}`,
      })),
    }, { headers })
  } catch (error) {
    console.error('[silver/orders/status] No se pudo consultar la compra:', error)
    return NextResponse.json({ error: 'No pudimos consultar la compra todavía.' }, { status: 503, headers })
  }
}
