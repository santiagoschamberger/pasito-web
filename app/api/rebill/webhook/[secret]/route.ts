import { NextRequest, NextResponse } from 'next/server'

import { POST as confirmStoreOrder } from '../../../orders/route'

type WebhookPayload = {
  data?: {
    payment?: {
      id?: string
      status?: string
      metadata?: Record<string, unknown>
    }
    id?: string
    status?: string
    metadata?: Record<string, unknown>
  }
  webhook?: { event?: string }
}

/**
 * Rebill no firma sus webhooks. La ruta usa un segmento secreto y delega la
 * confirmación final a /api/orders, que vuelve a consultar la API de Rebill
 * con la clave privada antes de tocar stock u órdenes.
 *
 * Configurar en Rebill: payment.created y payment.updated apuntando a
 * /api/rebill/webhook/{REBILL_WEBHOOK_SECRET}
 */
export async function POST(request: NextRequest, context: { params: Promise<{ secret: string }> }) {
  const { secret } = await context.params
  const expectedSecret = process.env.REBILL_WEBHOOK_SECRET
  if (!expectedSecret || secret !== expectedSecret) return new NextResponse(null, { status: 404 })

  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const event = payload.webhook?.event
  if (event !== 'payment.created' && event !== 'payment.updated') return new NextResponse(null, { status: 204 })

  const payment = payload.data?.payment ?? payload.data
  if (!payment?.id || payment.status !== 'approved') return new NextResponse(null, { status: 204 })

  const metadata = payment.metadata
  const base = typeof metadata?.base === 'string' ? metadata.base : ''
  const print = typeof metadata?.print === 'string' ? metadata.print : ''
  const size = typeof metadata?.size === 'string' ? metadata.size : ''
  const qty = Number(metadata?.qty ?? 0)
  const delivery = typeof metadata?.delivery === 'string' ? metadata.delivery : ''

  if (!base || !print || !size || !Number.isInteger(qty) || !delivery) {
    console.error('[rebill-webhook] Pago de tienda sin metadata de variante', payment.id)
    return new NextResponse(null, { status: 204 })
  }

  const orderRequest = new NextRequest(new URL('/api/orders', request.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paymentId: payment.id, base, print, size, qty, delivery }),
  })
  const orderResponse = await confirmStoreOrder(orderRequest)

  // Rebill reintenta fallos 5xx. Los 4xx son inconsistencias que requieren
  // revisión humana y se confirman para no generar una cola infinita.
  if (orderResponse.status >= 500) return orderResponse
  return NextResponse.json({ ok: true })
}
