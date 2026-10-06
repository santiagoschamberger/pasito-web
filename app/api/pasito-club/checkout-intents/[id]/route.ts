import { NextRequest, NextResponse } from 'next/server'

import { pasitoClubStore } from '@/lib/pasito-club-server'
import { readIntentToken } from '@/lib/tomate-ticket-security'

const headers = { 'Cache-Control': 'no-store, max-age=0' }

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 })

  let body: { intentToken?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cancelación inválida.' }, { status: 400, headers })
  }
  const tokenId = typeof body.intentToken === 'string' ? readIntentToken(body.intentToken) : null
  if (!tokenId || tokenId !== id) {
    return NextResponse.json({ error: 'Token de intención inválido.' }, { status: 403, headers })
  }

  try {
    const status = await pasitoClubStore().cancel(id)
    if (status === 'not_found') return NextResponse.json({ error: 'La reserva no existe.' }, { status: 404, headers })
    if (status === 'confirmed') return NextResponse.json({ error: 'La reserva ya fue confirmada.' }, { status: 409, headers })
    if (status === 'cancelled') return NextResponse.json({ ok: true }, { headers })
    throw new Error(`Estado inesperado al cancelar: ${status}`)
  } catch (error) {
    console.error('[pasito-club/checkout-intents/cancel] Error:', error)
    return NextResponse.json({ error: 'No pudimos cancelar la reserva.' }, { status: 500, headers })
  }
}
