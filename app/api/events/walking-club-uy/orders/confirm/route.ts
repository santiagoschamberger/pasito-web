import { NextRequest, NextResponse } from 'next/server'
import { isUuid } from '@/lib/uruguay-walking-club-event'
import { readIntentToken } from '@/lib/tomate-ticket-security'
import { requestOrigin } from '@/lib/uruguay-walking-club-server'
import { confirmWalkingClubUyOrder } from '@/lib/uruguay-order-confirmation'

export async function POST(request: NextRequest) {
  let body: { intentId?: unknown; intentToken?: unknown; paymentId?: unknown }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }
  if (!isUuid(body.intentId)) return NextResponse.json({ error: 'Reserva inválida.' }, { status: 400 })
  try {
    if (typeof body.intentToken !== 'string' || readIntentToken(body.intentToken) !== body.intentId) {
      return NextResponse.json({ error: 'Token de reserva inválido.' }, { status: 403 })
    }
    const result = await confirmWalkingClubUyOrder(body.intentId, requestOrigin(request),
      typeof body.paymentId === 'string' ? body.paymentId : undefined)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[walking-club-uy/orders/confirm]', error)
    return NextResponse.json({ error: 'No pudimos verificar la compra todavía. Si ya pagaste, no vuelvas a pagar; escribinos a hola@pasito.app.' }, { status: 409 })
  }
}
