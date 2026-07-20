import { NextRequest, NextResponse } from 'next/server'

import { TOMATE_EVENT, type EventTicket } from '@/lib/tomate-event'
import { getTomateSupabase, requestIpHash, requestOrigin } from '@/lib/tomate-server'
import { sendTomateTicketsEmail } from '@/lib/tomate-ticket-email'
import { createPasitosClaimToken } from '@/lib/tomate-ticket-security'

type OrderRow = {
  id: string
  rebill_payment_id: string
  customer_email: string
  customer_name: string | null
  amount: number
  quantity: number
}

type TicketRow = {
  id: string
  order_id: string
  short_code: string
  ticket_number: number
  status: 'valid' | 'used' | 'void'
  checked_in_at: string | null
}

const GENERIC_MESSAGE = 'Si encontramos una compra aprobada con ese email, te enviamos las entradas nuevamente.'

export async function POST(request: NextRequest) {
  let body: { email?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'Ingresá un email válido.' }, { status: 400 })
  }

  const db = getTomateSupabase()
  try {
    const { data: allowed, error: rateError } = await db.rpc('event_consume_rate_limit', {
      p_scope: 'tomate-ticket-recovery',
      p_key_hash: requestIpHash(request, 'tomate-ticket-recovery'),
      p_limit: 10,
      p_window_seconds: 900,
    })
    if (rateError) throw rateError
    if (!allowed) return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 })

    const { data: claimData, error: claimError } = await db.rpc('event_claim_ticket_recovery', {
      p_event_slug: TOMATE_EVENT.slug,
      p_email: email,
    })
    if (claimError) throw claimError
    const claim = (claimData ?? {}) as { status?: string }
    if (claim.status !== 'claimed') {
      return NextResponse.json({ message: GENERIC_MESSAGE }, {
        status: 202,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      })
    }

    const { data: orderRows, error: orderError } = await db
      .from('event_ticket_orders')
      .select('id, rebill_payment_id, customer_email, customer_name, amount, quantity')
      .eq('event_slug', TOMATE_EVENT.slug)
      .eq('customer_email', email)
      .eq('payment_status', 'approved')
      .order('created_at')
    if (orderError) throw orderError
    const orders = (orderRows ?? []) as OrderRow[]
    if (!orders.length) return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 202 })

    const orderIds = orders.map((order) => order.id)
    const { data: ticketRows, error: ticketError } = await db
      .from('event_tickets')
      .select('id, order_id, short_code, ticket_number, status, checked_in_at')
      .in('order_id', orderIds)
      .order('ticket_number')
    if (ticketError) throw ticketError
    const tickets = (ticketRows ?? []) as TicketRow[]

    const origin = requestOrigin(request)
    const pasitosRewards = (await Promise.all(orders.map(async (order) => {
      const { data: rawReward, error: rewardError } = await db.rpc('event_prepare_order_pasitos', {
        p_order_id: order.id,
      })
      if (rewardError) throw rewardError
      const reward = (rawReward ?? {}) as { status?: string; amount?: number; quantity?: number }
      if (reward.status !== 'credited' && reward.status !== 'pending') return null
      const claimToken = createPasitosClaimToken(order.id)
      return {
        amount: reward.amount ?? 0,
        quantity: reward.quantity ?? order.quantity,
        status: reward.status as 'credited' | 'pending',
        claimUrl: `${origin}/evento-pasito/pasitos/${claimToken}`,
      }
    }))).filter((reward): reward is NonNullable<typeof reward> => reward !== null)

    const sent = await sendTomateTicketsEmail({
      origin,
      kind: 'recovery',
      pasitosRewards,
      orders: orders.map((order) => ({
        id: order.id,
        paymentId: order.rebill_payment_id,
        customerEmail: order.customer_email,
        customerName: order.customer_name,
        amount: order.amount,
        quantity: order.quantity,
        tickets: tickets.filter((ticket) => ticket.order_id === order.id).map<EventTicket>((ticket) => ({
          id: ticket.id,
          code: ticket.short_code,
          number: ticket.ticket_number,
          status: ticket.status,
          checkedInAt: ticket.checked_in_at,
        })),
      })),
    })

    const now = new Date().toISOString()
    const { error: trackingError } = await db.from('event_ticket_orders').update({
      recovery_email_sent_at: now,
      recovery_email_id: sent.id,
      updated_at: now,
    }).in('id', orderIds)
    if (trackingError) console.error('[tomate/recover] No se pudo registrar el envío:', trackingError)

    return NextResponse.json({ message: GENERIC_MESSAGE }, {
      status: 202,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('[tomate/recover] No se pudieron reenviar las entradas:', error)
    return NextResponse.json({ error: 'No pudimos procesar el reenvío. Probá nuevamente en unos minutos.' }, { status: 500 })
  }
}
