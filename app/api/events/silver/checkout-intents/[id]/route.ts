import { NextRequest, NextResponse } from 'next/server'

import { getTomateSupabase } from '@/lib/tomate-server'
import { verifyIntentToken } from '@/lib/tomate-ticket-security'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse(null, { status: 404 })
  }

  let body: { intentToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cancelación inválida.' }, { status: 400 })
  }

  const intentToken = typeof body.intentToken === 'string' ? body.intentToken.trim() : ''
  if (!verifyIntentToken(id, intentToken)) {
    return NextResponse.json({ error: 'Token de intención inválido.' }, { status: 403 })
  }

  try {
    const { data } = await getTomateSupabase().rpc('event_cancel_ticket_reservation', {
      p_intent_id: id,
    })
    const status = typeof data === 'string' ? data : 'unknown'

    if (status === 'not_found') {
      return NextResponse.json({ error: 'La reserva no existe.' }, { status: 404 })
    }
    if (status === 'confirmed') {
      return NextResponse.json({ error: 'La reserva ya fue confirmada.' }, { status: 409 })
    }
    if (status === 'cancelled') {
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
    }

    throw new Error(`Estado inesperado al cancelar: ${status}`)
  } catch (error) {
    console.error('[silver/checkout-intents/cancel] Error:', error)
    return NextResponse.json({ error: 'No pudimos cancelar la reserva.' }, { status: 500 })
  }
}
