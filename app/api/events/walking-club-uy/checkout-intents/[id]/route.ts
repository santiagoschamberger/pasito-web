import { NextRequest, NextResponse } from 'next/server'

import { getWalkingClubUySupabase } from '@/lib/uruguay-walking-club-server'
import { readIntentToken } from '@/lib/tomate-ticket-security'

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
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const tokenId = typeof body.intentToken === 'string' ? readIntentToken(body.intentToken) : null
  if (!tokenId || tokenId !== id) {
    return NextResponse.json({ error: 'Token de intención inválido.' }, { status: 403 })
  }

  try {
    const db = getWalkingClubUySupabase()
    const { error } = await db.rpc('event_cancel_ticket_reservation', { p_intent_id: id })
    if (error) throw error
    return NextResponse.json({ cancelled: true })
  } catch (error) {
    console.error('[walking-club-uy/checkout-intents] No se pudo cancelar la reserva:', error)
    return NextResponse.json({ error: 'No pudimos cancelar la reserva.' }, { status: 500 })
  }
}
