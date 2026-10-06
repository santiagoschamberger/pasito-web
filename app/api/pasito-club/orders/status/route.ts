import { NextRequest, NextResponse } from 'next/server'

import { pasitoClubStore } from '@/lib/pasito-club-server'
import { pasitoClubTicketLinks } from '@/lib/pasito-club-ticket-email'
import { requestOrigin } from '@/lib/tomate-server'
import { readIntentToken } from '@/lib/tomate-ticket-security'

const headers = { 'Cache-Control': 'no-store, max-age=0' }

// Some Rebill success events omit the payment ID; the webhook still confirms
// the order, so the browser polls with its signed reservation token.
export async function POST(request: NextRequest) {
  let body: { intentToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Consulta inválida.' }, { status: 400, headers })
  }
  const intentId = typeof body?.intentToken === 'string' && body.intentToken.length < 300
    ? readIntentToken(body.intentToken) : null
  if (!intentId) return NextResponse.json({ error: 'Reserva inválida.' }, { status: 403, headers })

  try {
    const bundle = await pasitoClubStore().loadOrderByIntent(intentId)
    if (!bundle) return NextResponse.json({ status: 'pending' }, { headers })
    if (bundle.order.paymentStatus !== 'approved') {
      return NextResponse.json({ status: 'inactive', refunded: bundle.order.paymentStatus === 'refunded' }, { headers })
    }
    if (bundle.tickets.length !== bundle.order.quantity || bundle.tickets.some((ticket) => ticket.status === 'void')) {
      return NextResponse.json({ status: 'pending' }, { headers })
    }
    return NextResponse.json({
      status: 'confirmed',
      emailPending: !bundle.order.emailSentAt,
      email: bundle.order.email,
      tickets: pasitoClubTicketLinks(requestOrigin(request), bundle.tickets),
    }, { headers })
  } catch (error) {
    console.error('[pasito-club/orders/status] Error:', error)
    return NextResponse.json({ error: 'No pudimos consultar la compra todavía.' }, { status: 503, headers })
  }
}
