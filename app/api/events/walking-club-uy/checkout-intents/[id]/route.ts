import { NextRequest, NextResponse } from 'next/server'

import { isUuid } from '@/lib/uruguay-walking-club-event'
import { getWalkingClubUySupabase } from '@/lib/uruguay-walking-club-server'
import { verifyIntentToken } from '@/lib/tomate-ticket-security'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: intentId } = await context.params
  if (!isUuid(intentId)) {
    return NextResponse.json({ error: 'ID de intención inválido.' }, { status: 400 })
  }

  let body: { intentToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const intentToken = typeof body.intentToken === 'string' ? body.intentToken : ''
  if (!verifyIntentToken(intentId, intentToken)) {
    return NextResponse.json({ error: 'Token de intención inválido.' }, { status: 403 })
  }

  try {
    const db = getWalkingClubUySupabase()
    const { error } = await db.rpc('event_cancel_ticket_reservation', { p_intent_id: intentId })
    if (error) throw error
    return NextResponse.json({ cancelled: true })
  } catch (error) {
    console.error('[walking-club-uy/checkout-intents] No se pudo cancelar la reserva:', error)
    return NextResponse.json({ error: 'No pudimos cancelar la reserva.' }, { status: 500 })
  }
}
