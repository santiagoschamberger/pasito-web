import { NextRequest, NextResponse } from 'next/server'

import { POST as confirmStoreOrder } from '../../../orders/route'
import { POST as confirmTomateOrder } from '../../../events/tomate/orders/confirm/route'
import { TOMATE_EVENT } from '@/lib/tomate-event'
import { getRebillPayment, normalizeRebillStatus } from '@/lib/tomate-rebill'
import { getTomateSupabase } from '@/lib/tomate-server'

type WebhookPayload = {
  data?: {
    payment?: {
      id?: string
      status?: string
      subscriptionId?: string | null
      subscription_id?: string | null
      metadata?: Record<string, unknown>
    }
    id?: string
    status?: string
    subscriptionId?: string | null
    subscription_id?: string | null
    metadata?: Record<string, unknown>
  }
  webhook?: { event?: string }
}

async function hasPendingEmail(response: Response): Promise<boolean> {
  if (!response.ok) return false
  try {
    const payload = await response.clone().json() as { emailPending?: unknown }
    return payload.emailPending === true
  } catch {
    return false
  }
}

function pendingEmailResponse() {
  // Rebill reintenta respuestas 5xx. La orden ya es idempotente, así que el
  // siguiente callback sólo vuelve a intentar el email pendiente.
  return NextResponse.json({ error: 'El email de confirmación sigue pendiente.' }, { status: 503 })
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
  if (!payment?.id) return new NextResponse(null, { status: 204 })

  const subscriptionId = payment.subscriptionId
    ?? payment.subscription_id
    ?? payload.data?.subscriptionId
    ?? payload.data?.subscription_id
  if (subscriptionId) return new NextResponse(null, { status: 204 })

  const metadata = payment.metadata
  if (metadata?.eventSlug === TOMATE_EVENT.slug) {
    const intentId = typeof metadata.checkoutIntentId === 'string' ? metadata.checkoutIntentId : ''

    if (payment.status === 'approved' && intentId) {
      const orderRequest = new NextRequest(new URL('/api/events/tomate/orders/confirm', request.url), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentId: payment.id, intentId }),
      })
      const orderResponse = await confirmTomateOrder(orderRequest)
      if (orderResponse.status >= 500) return orderResponse
      if (await hasPendingEmail(orderResponse)) return pendingEmailResponse()
      return NextResponse.json({ ok: true })
    }

    // Refunds, disputes and cancellations also come through payment.updated.
    // Re-read Rebill before voiding a QR so the unsigned webhook is never the
    // source of truth.
    try {
      const verified = await getRebillPayment(payment.id)
      if (verified.metadata?.eventSlug !== TOMATE_EVENT.slug) return new NextResponse(null, { status: 204 })
      const status = normalizeRebillStatus(verified.status)
      if (!status || status === 'approved') return new NextResponse(null, { status: 204 })

      const { error } = await getTomateSupabase().rpc('event_update_order_payment', {
        p_payment_id: payment.id,
        p_payment_status: status,
      })
      if (error) throw error
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error('[rebill-webhook] No se pudo actualizar la entrada del evento:', error)
      return NextResponse.json({ error: 'No se pudo procesar el webhook.' }, { status: 500 })
    }
  }

  if (payment.status !== 'approved') return new NextResponse(null, { status: 204 })

  const base = typeof metadata?.base === 'string' ? metadata.base : ''
  const print = typeof metadata?.print === 'string' ? metadata.print : ''
  const size = typeof metadata?.size === 'string' ? metadata.size : ''
  const qty = Number(metadata?.qty ?? 0)
  const delivery = typeof metadata?.delivery === 'string' ? metadata.delivery : ''
  const pickupLocation = typeof metadata?.pickupLocation === 'string' ? metadata.pickupLocation : undefined

  if (!base || !print || !size || !Number.isInteger(qty) || !delivery) {
    console.error('[rebill-webhook] Pago de tienda sin metadata de variante', payment.id)
    return new NextResponse(null, { status: 204 })
  }

  const orderRequest = new NextRequest(new URL('/api/orders', request.url), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paymentId: payment.id, base, print, size, qty, delivery, pickupLocation }),
  })
  const orderResponse = await confirmStoreOrder(orderRequest)

  // Rebill reintenta fallos 5xx. Los 4xx son inconsistencias que requieren
  // revisión humana y se confirman para no generar una cola infinita.
  if (orderResponse.status >= 500) return orderResponse
  if (await hasPendingEmail(orderResponse)) return pendingEmailResponse()
  return NextResponse.json({ ok: true })
}
