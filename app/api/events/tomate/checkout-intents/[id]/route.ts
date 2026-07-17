import { NextRequest, NextResponse } from 'next/server'

import { getTomateSupabase } from '@/lib/tomate-server'
import { readIntentToken } from '@/lib/tomate-ticket-security'

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  let body: { intentToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const tokenId = typeof body.intentToken === 'string' ? readIntentToken(body.intentToken) : null
  if (!tokenId || tokenId !== id) return new NextResponse(null, { status: 404 })

  try {
    const { data, error } = await getTomateSupabase().rpc('event_cancel_ticket_reservation', {
      p_intent_id: id,
    })
    if (error) throw error
    return NextResponse.json({ ok: true, result: data }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('[tomate/checkout-intents] No se pudo liberar la reserva:', error)
    return NextResponse.json({ error: 'No pudimos liberar la reserva.' }, { status: 500 })
  }
}
