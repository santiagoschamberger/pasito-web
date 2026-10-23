import { orderConfirmationEmail } from '@/lib/web-email-templates'
import { rebillRoutingEnabled, assertIntentAccount, checkOrderAccount, bindNewOrderAccount } from '@/lib/rebill-routing'
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
  EmailDeliveryError,
  emailDeliveryErrorMessage,
  retryEmailDelivery,
} from '@/lib/email-retry'
import { isRebillPaymentAmountValid } from '@/lib/rebill-payment-validation'
import { getRebillPayment, type RebillPayment } from '@/lib/tomate-rebill'

/* Debe coincidir con la config de la tienda (app/tienda/StoreClient.tsx). */
const PRICE = 35000
const SHIPPING = 7000
const CURRENCY = 'ARS'
const BASES = ['blanca', 'negra'] as const
const PRINTS = ['verde', 'blanca'] as const
const SIZES = ['S', 'M', 'L', 'XL'] as const
// Solo envío disponible
const REBILL_PRODUCT_REFERENCE = 'prd_ff7aa494f84a445d97c03f16fe2ee49c'
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

function expectedAmount(qty: number) {
  return PRICE * qty + SHIPPING
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

  // Validación básica de entrada - solo envío permitido.
  if (
    !paymentId ||
    !BASES.includes(base as (typeof BASES)[number]) ||
    !PRINTS.includes(print as (typeof PRINTS)[number]) ||
    !SIZES.includes(size as (typeof SIZES)[number]) ||
    delivery !== 'envio' ||
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
  let pay: RebillPayment
  try {
    pay = await getRebillPayment(paymentId, undefined, req)
  } catch (err) {
    console.error('[orders] Error verificando pago:', err)
    return NextResponse.json({ error: 'No se pudo verificar el pago.' }, { status: 502 })
  }

  if (pay.status !== 'approved') {
    return NextResponse.json({ error: 'El pago no está aprobado.' }, { status: 402 })
  }

  const expected = expectedAmount(qty)
  if (!isRebillPaymentAmountValid(pay.amount, expected, pay.installments) || (pay.currency ?? '').toUpperCase() !== CURRENCY) {
    return NextResponse.json({ error: 'El monto del pago no coincide.' }, { status: 400 })
  }

  // Instant Checkout persiste toda la selección en metadata. La exigimos y
  // validamos contra el pedido recibido para no confiar sólo en el cliente.
  const metadata = pay.metadata
  const checkoutIntentId = typeof metadata?.checkoutIntentId === 'string' ? metadata.checkoutIntentId.trim() : null
  if (
    !metadata ||
    !(metadata.catalogProductId === REBILL_PRODUCT_REFERENCE || (rebillRoutingEnabled() && pay.rebillAccount === 'SIN_IVA' && metadata.catalogProductId === 'pasito-merchandise')) ||
    metadata.base !== base ||
    metadata.print !== print ||
    metadata.size !== size ||
    String(metadata.qty) !== String(qty) ||
    metadata.delivery !== 'envio' ||
    (!checkoutIntentId || !UUID_PATTERN.test(checkoutIntentId))
  ) {
    return NextResponse.json({ error: 'El pago no coincide con la selección de la tienda.' }, { status: 400 })
  }

  const email = pay.customer?.email ?? null
  const customerName =
    [pay.customer?.firstName, pay.customer?.lastName].filter(Boolean).join(' ') || null

  // 2) Confirmar la orden y descontar stock (atómico + idempotente).
  const db = getSupabase()
  let accountIntent: {rebill_account?: unknown} = {}
  if (rebillRoutingEnabled()) {
    const intent = await db.from('tienda_checkout_intents').select('rebill_account').eq('id',checkoutIntentId).maybeSingle()
    if (intent.error || !intent.data) return NextResponse.json({error:'No pudimos verificar la reserva.'},{status:503})
    accountIntent = intent.data
    try { assertIntentAccount(intent.data,pay) } catch { return NextResponse.json({error:'El pago no coincide con la cuenta de la reserva.'},{status:409}) }
  }
  try { await checkOrderAccount(db, 'tienda_orders',pay) } catch { return NextResponse.json({error:'No pudimos verificar la cuenta de la orden.'},{status:503}) }
  const { data: result, error } = await db.rpc('tienda_confirm_order_v3', {
    p_payment_id: paymentId,
    p_base: base,
    p_print: print,
    p_size: size,
    p_qty: qty,
    p_delivery: 'envio',
    p_amount: expected,
    p_currency: CURRENCY,
    p_email: email,
    p_customer_name: customerName,
    p_checkout_intent_id: checkoutIntentId,
    p_pickup_location: null,
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

  if (result !== 'confirmed' && result !== 'duplicate') {
    console.error('[orders] Resultado inesperado confirmando orden:', result)
    return NextResponse.json({ error: 'No se pudo registrar la orden.' }, { status: 500 })
  }

  const variant = `Remera ${base === 'blanca' ? 'Blanca' : 'Negra'} · estampa ${
    print === 'verde' ? 'Verde' : 'Blanca'
  }`

  try { await bindNewOrderAccount(db, 'tienda_orders', pay, accountIntent) } catch { return NextResponse.json({error:'La compra requiere volver a verificar su cuenta.'},{status:503}) }
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

  const shippingAddress: ShippingAddress | null = normalizeShippingAddress({
    line1: confirmedOrder.shipping_address_line1,
    line2: confirmedOrder.shipping_address_line2 ?? '',
    city: confirmedOrder.shipping_city,
    province: confirmedOrder.shipping_province,
    postalCode: confirmedOrder.shipping_postal_code,
    phone: confirmedOrder.shipping_phone,
    notes: confirmedOrder.shipping_notes ?? '',
  })

  if (!shippingAddress) {
    console.error('[orders] Dirección de envío inválida para orden confirmada')
    return NextResponse.json({ error: 'No se pudo cargar la dirección de envío.' }, { status: 500 })
  }

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
            ...orderConfirmationEmail({
              name: pay.customer?.firstName,
              customerName: confirmedOrder.customer_name,
              variant,
              size,
              qty,
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
  })
}
