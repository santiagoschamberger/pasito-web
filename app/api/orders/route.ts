import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

import {
  formatShippingAddress,
  normalizeShippingAddress,
  type ShippingAddress,
} from '@/lib/store-shipping'
import {
  isPickupLocation,
  pickupLabel,
  pickupWhatsAppUrl as buildPickupWhatsAppUrl,
  type PickupLocation,
} from '@/lib/store-fulfillment'
import { pickupCoordinationBlockHtml } from '@/lib/store-pickup-email'
import {
  EmailDeliveryError,
  emailDeliveryErrorMessage,
  retryEmailDelivery,
} from '@/lib/email-retry'
import { isRebillPaymentAmountValid } from '@/lib/rebill-payment-validation'

/* Debe coincidir con la config de la tienda (app/tienda/StoreClient.tsx). */
const PRICE = 35000
const SHIPPING = 5000
const CURRENCY = 'ARS'
const BASES = ['blanca', 'negra'] as const
const PRINTS = ['verde', 'blanca'] as const
const SIZES = ['S', 'M', 'L', 'XL'] as const
const DELIVERIES = ['retiro', 'envio'] as const
const REBILL_API = 'https://api.rebill.com/v3'
const REBILL_PRODUCT_REFERENCE = {
  retiro: 'prd_936db4129964428d9377bda54608d012',
  envio: 'prd_916d9bf2683e40b4abf1c2a9c94e3145',
} as const
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type StoreOrderRow = {
  id: string
  email: string | null
  customer_name: string | null
  delivery: string
  confirmation_email_sent_at: string | null
  shipping_address_line1: string | null
  shipping_address_line2: string | null
  shipping_city: string | null
  shipping_province: string | null
  shipping_postal_code: string | null
  shipping_phone: string | null
  shipping_notes: string | null
}

let supabase: SupabaseClient | null = null
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return supabase
}

function expectedAmount(qty: number, delivery: string) {
  return PRICE * qty + (delivery === 'envio' ? SHIPPING : 0)
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character]
  })
}

function orderConfirmationHtml(params: {
  name?: string
  customerName?: string | null
  variant: string
  size: string
  qty: number
  delivery: string
  pickupLocation?: PickupLocation | null
  amount: number
  shippingAddress?: ShippingAddress | null
}): string {
  const deliveryText =
    params.delivery === 'retiro'
      ? pickupLabel(params.pickupLocation)
      : 'Envío a domicilio'
  const shippingAddress = params.shippingAddress
  const shippingDetails = shippingAddress
    ? `
      <p style="font-size:14px;color:#555;margin:0 0 6px;">Dirección: ${escapeHtml(formatShippingAddress(shippingAddress))}</p>
      <p style="font-size:14px;color:#555;margin:0 0 6px;">Teléfono: ${escapeHtml(shippingAddress.phone)}</p>
      ${shippingAddress.notes ? `<p style="font-size:14px;color:#555;margin:0 0 6px;">Indicaciones: ${escapeHtml(shippingAddress.notes)}</p>` : ''}
    `
    : ''
  const deliveryInstructions =
    params.delivery === 'retiro'
      ? pickupCoordinationBlockHtml(params.customerName, params.pickupLocation)
      : `<p style="font-size:14px;color:#555;margin:0 0 8px;line-height:1.6;">Tu dirección quedó guardada. Vamos a despachar el pedido dentro de <strong>5–6 días hábiles</strong>.</p>`
  const money = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(params.amount)
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#fafafa;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;padding:48px 28px;background:#ffffff;">
    <div style="text-align:center;margin-bottom:36px;">
      <img src="https://pasito.app/pasitohorizontal.png" alt="Pasito" width="100" style="display:inline-block;" />
    </div>
    <h2 style="font-size:22px;color:#111;margin:0 0 16px;font-weight:600;">¡Gracias por tu compra! 🎉</h2>
    <p style="font-size:15px;color:#555;margin:0 0 20px;line-height:1.6;">
      ${params.name ? `${escapeHtml(params.name)}, ` : ''}confirmamos tu pedido de la <strong>Remera Pasito</strong>.
    </p>
    <div style="background:#f7f7f4;border-radius:12px;padding:18px 20px;margin:0 0 24px;">
      <p style="font-size:14px;color:#333;margin:0 0 6px;"><strong>${escapeHtml(params.variant)}</strong></p>
      <p style="font-size:14px;color:#555;margin:0 0 6px;">Talle ${escapeHtml(params.size)} · ${params.qty} ${params.qty === 1 ? 'unidad' : 'unidades'}</p>
      <p style="font-size:14px;color:#555;margin:0 0 6px;">Entrega: ${deliveryText}</p>
      ${shippingDetails}
      <p style="font-size:14px;color:#111;margin:8px 0 0;"><strong>Total: ${money}</strong></p>
    </div>
    ${deliveryInstructions}
    <div style="margin-top:36px;padding-top:24px;border-top:1px solid #f0f0f0;">
      <p style="font-size:14px;color:#333;margin:0;">Nos vemos en la calle,<br/><strong>Pasito</strong></p>
    </div>
    <div style="margin-top:40px;text-align:center;">
      <p style="font-size:11px;color:#bbb;margin:0;letter-spacing:0.03em;">pasito.app</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  }

  const paymentId = String(body.paymentId ?? '').trim()
  const base = String(body.base ?? '')
  const print = body.print ? String(body.print) : null
  const size = String(body.size ?? '')
  const qty = Number(body.qty ?? 0)
  const delivery = String(body.delivery ?? '')
  const rawPickupLocation = body.pickupLocation
  const pickupLocation = isPickupLocation(rawPickupLocation) ? rawPickupLocation : null

  // Validación básica de entrada.
  if (
    !paymentId ||
    !BASES.includes(base as (typeof BASES)[number]) ||
    !PRINTS.includes(print as (typeof PRINTS)[number]) ||
    !SIZES.includes(size as (typeof SIZES)[number]) ||
    !DELIVERIES.includes(delivery as (typeof DELIVERIES)[number]) ||
    (delivery === 'retiro' && !pickupLocation) ||
    (delivery === 'envio' && rawPickupLocation !== undefined && rawPickupLocation !== null && rawPickupLocation !== '') ||
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > 10
  ) {
    return NextResponse.json({ error: 'Datos de la orden inválidos.' }, { status: 400 })
  }

  const expectedPrint = base === 'blanca' ? 'verde' : 'blanca'
  if (print !== expectedPrint) {
    return NextResponse.json({ error: 'La variante seleccionada no es válida.' }, { status: 400 })
  }

  if (!process.env.REBILL_SECRET_KEY) {
    console.error('[orders] Falta REBILL_SECRET_KEY')
    return NextResponse.json({ error: 'Configuración incompleta.' }, { status: 500 })
  }

  // 1) Verificar el pago directamente con Rebill (fuente de verdad).
  let pay: {
    status?: string
    amount?: number | string
    currency?: string
    installments?: number | null
    metadata?: Record<string, unknown>
    customer?: { email?: string; firstName?: string; lastName?: string }
  }
  try {
    const res = await fetch(`${REBILL_API}/payments/${encodeURIComponent(paymentId)}`, {
      headers: { 'x-api-key': process.env.REBILL_SECRET_KEY },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 402 })
    }
    pay = await res.json()
  } catch (err) {
    console.error('[orders] Error verificando pago:', err)
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 502 })
  }

  if (pay.status !== 'approved') {
    return NextResponse.json({ error: 'El pago no está aprobado.' }, { status: 402 })
  }

  const expected = expectedAmount(qty, delivery)
  if (!isRebillPaymentAmountValid(pay.amount, expected, pay.installments) || (pay.currency ?? '').toUpperCase() !== CURRENCY) {
    return NextResponse.json({ error: 'El monto del pago no coincide.' }, { status: 400 })
  }

  // Instant Checkout persiste toda la selección en metadata. La exigimos y
  // validamos contra el pedido recibido para no confiar sólo en el cliente.
  const metadata = pay.metadata
  const paidPickupLocation = isPickupLocation(metadata?.pickupLocation) ? metadata.pickupLocation : null
  const checkoutIntentId =
    delivery === 'envio' && typeof metadata?.checkoutIntentId === 'string'
      ? metadata.checkoutIntentId.trim()
      : null
  if (
    !metadata ||
    metadata.catalogProductId !== REBILL_PRODUCT_REFERENCE[delivery as keyof typeof REBILL_PRODUCT_REFERENCE] ||
    metadata.base !== base ||
    metadata.print !== print ||
    metadata.size !== size ||
    String(metadata.qty) !== String(qty) ||
    metadata.delivery !== delivery ||
    (delivery === 'retiro' && paidPickupLocation !== pickupLocation) ||
    (delivery === 'envio' && metadata.pickupLocation !== undefined) ||
    (delivery === 'envio' && (!checkoutIntentId || !UUID_PATTERN.test(checkoutIntentId)))
  ) {
    return NextResponse.json({ error: 'El pago no coincide con la selección de la tienda.' }, { status: 400 })
  }

  const email = pay.customer?.email ?? null
  const customerName =
    [pay.customer?.firstName, pay.customer?.lastName].filter(Boolean).join(' ') || null

  // 2) Confirmar la orden y descontar stock (atómico + idempotente).
  const db = getSupabase()
  const { data: result, error } = await db.rpc('tienda_confirm_order_v3', {
    p_payment_id: paymentId,
    p_base: base,
    p_print: print,
    p_size: size,
    p_qty: qty,
    p_delivery: delivery,
    p_amount: expected,
    p_currency: CURRENCY,
    p_email: email,
    p_customer_name: customerName,
    p_checkout_intent_id: checkoutIntentId,
    p_pickup_location: pickupLocation,
  })

  if (error) {
    console.error('[orders] Error confirmando orden:', error)
    return NextResponse.json({ error: 'No se pudo registrar la orden.' }, { status: 500 })
  }

  if (result === 'insufficient_stock') {
    return NextResponse.json(
      { error: 'El pago fue recibido, pero necesitamos confirmar la disponibilidad del talle elegido.', result },
      { status: 409 },
    )
  }

  if (result === 'invalid_checkout_intent') {
    return NextResponse.json(
      { error: 'El pago fue recibido, pero necesitamos verificar la dirección de envío.', result },
      { status: 409 },
    )
  }

  if (result === 'invalid_pickup_location') {
    return NextResponse.json(
      { error: 'El pago fue recibido, pero necesitamos verificar el punto de retiro elegido.', result },
      { status: 409 },
    )
  }

  if (result !== 'confirmed' && result !== 'duplicate') {
    console.error('[orders] Resultado inesperado confirmando orden:', result)
    return NextResponse.json({ error: 'No se pudo registrar la orden.' }, { status: 500 })
  }

  const variant = `Remera ${base === 'blanca' ? 'Blanca' : 'Negra'} · estampa ${
    print === 'verde' ? 'Verde' : 'Blanca'
  }`

  const { data: rawConfirmedOrder, error: orderReadError } = await db
    .from('tienda_orders')
    .select('id, email, customer_name, delivery, confirmation_email_sent_at, shipping_address_line1, shipping_address_line2, shipping_city, shipping_province, shipping_postal_code, shipping_phone, shipping_notes')
    .eq('rebill_payment_id', paymentId)
    .maybeSingle()

  if (orderReadError || !rawConfirmedOrder) {
    console.error('[orders] Error leyendo la orden confirmada:', orderReadError)
    return NextResponse.json({ error: 'No se pudo cargar la orden confirmada.' }, { status: 500 })
  }
  const confirmedOrder = rawConfirmedOrder as StoreOrderRow

  const shippingAddress: ShippingAddress | null = delivery === 'envio'
    ? normalizeShippingAddress({
        line1: confirmedOrder.shipping_address_line1,
        line2: confirmedOrder.shipping_address_line2 ?? '',
        city: confirmedOrder.shipping_city,
        province: confirmedOrder.shipping_province,
        postalCode: confirmedOrder.shipping_postal_code,
        phone: confirmedOrder.shipping_phone,
        notes: confirmedOrder.shipping_notes ?? '',
      })
    : null

  // 3) Mail de confirmación. También se intenta en callbacks duplicados si
  // un intento anterior no quedó registrado como enviado.
  let emailPending = !confirmedOrder.confirmation_email_sent_at
  if (emailPending) {
    let sendAttempts = 0
    try {
      const targetEmail = confirmedOrder.email?.trim().toLowerCase() ?? ''
      if (!/^\S+@\S+\.\S+$/.test(targetEmail)) throw new Error('El pago no incluye un email válido.')
      const resendApiKey = process.env.RESEND_API_KEY
      if (!resendApiKey) throw new Error('Falta RESEND_API_KEY.')
      const resend = new Resend(resendApiKey)
      const sent = await retryEmailDelivery(async () => {
        const { data: emailData, error: emailError } = await resend.emails.send(
          {
            from: 'Pasito <noreply@pasito.app>',
            to: targetEmail,
            subject: 'Confirmamos tu Remera Pasito',
            html: orderConfirmationHtml({
              name: pay.customer?.firstName,
              customerName: confirmedOrder.customer_name,
              variant,
              size,
              qty,
              delivery,
              pickupLocation,
              amount: expected,
              shippingAddress,
            }),
          },
          { idempotencyKey: `tienda-order-confirmation-${paymentId}` },
        )
        if (emailError) throw new Error(emailError.message)
        if (!emailData?.id) throw new Error('Resend no devolvió un identificador de email.')
        return emailData.id
      })
      sendAttempts = sent.attempts

      const { error: trackingError } = await db.rpc('tienda_record_confirmation_email_attempt', {
        p_order_id: confirmedOrder.id,
        p_attempt_count: sent.attempts,
        p_email_id: sent.value,
        p_error: null,
      })
      if (trackingError) throw trackingError
      emailPending = false
    } catch (error) {
      const attemptCount = error instanceof EmailDeliveryError ? error.attempts : Math.max(sendAttempts, 1)
      const errorMessage = emailDeliveryErrorMessage(error)
      console.error('[orders] Error enviando o registrando mail:', errorMessage)
      const { error: trackingError } = await db.rpc('tienda_record_confirmation_email_attempt', {
        p_order_id: confirmedOrder.id,
        p_attempt_count: attemptCount,
        p_email_id: null,
        p_error: errorMessage,
      })
      if (trackingError) {
        console.error('[orders] Error registrando el intento de email:', trackingError)
      }
    }
  }

  if (result === 'confirmed') {
    revalidatePath('/tienda')
  }

  return NextResponse.json({
    ok: true,
    result,
    emailPending,
    ...(delivery === 'retiro'
      ? { pickupWhatsAppUrl: buildPickupWhatsAppUrl(customerName, pickupLocation) }
      : {}),
  })
}
