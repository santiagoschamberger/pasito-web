import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

/* Debe coincidir con la config de la tienda (app/tienda/StoreClient.tsx). */
const PRICE = 35000
const SHIPPING = 2000
const CURRENCY = 'ARS'
const BASES = ['blanca', 'negra'] as const
const PRINTS = ['verde', 'blanca'] as const
const SIZES = ['S', 'M', 'L', 'XL'] as const
const DELIVERIES = ['retiro', 'envio'] as const
const REBILL_API = 'https://api.rebill.com/v3'

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

function orderConfirmationHtml(params: {
  name?: string
  variant: string
  size: string
  qty: number
  delivery: string
  amount: number
}): string {
  const deliveryText =
    params.delivery === 'retiro'
      ? 'Retiro en Palermo (coordinamos por email)'
      : 'Envío a domicilio'
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
      ${params.name ? `${params.name}, ` : ''}confirmamos tu pedido de la <strong>Remera Pasito</strong>.
    </p>
    <div style="background:#f7f7f4;border-radius:12px;padding:18px 20px;margin:0 0 24px;">
      <p style="font-size:14px;color:#333;margin:0 0 6px;"><strong>${params.variant}</strong></p>
      <p style="font-size:14px;color:#555;margin:0 0 6px;">Talle ${params.size} · ${params.qty} ${params.qty === 1 ? 'unidad' : 'unidades'}</p>
      <p style="font-size:14px;color:#555;margin:0 0 6px;">Entrega: ${deliveryText}</p>
      <p style="font-size:14px;color:#111;margin:8px 0 0;"><strong>Total: ${money}</strong></p>
    </div>
    <p style="font-size:14px;color:#555;margin:0 0 8px;line-height:1.6;">
      Te escribimos en breve para coordinar la ${params.delivery === 'retiro' ? 'entrega en Palermo' : 'entrega'}.
    </p>
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

  // Validación básica de entrada.
  if (
    !paymentId ||
    !BASES.includes(base as (typeof BASES)[number]) ||
    !PRINTS.includes(print as (typeof PRINTS)[number]) ||
    !SIZES.includes(size as (typeof SIZES)[number]) ||
    !DELIVERIES.includes(delivery as (typeof DELIVERIES)[number]) ||
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
  if (Number(pay.amount) !== expected || (pay.currency ?? '').toUpperCase() !== CURRENCY) {
    return NextResponse.json({ error: 'El monto del pago no coincide.' }, { status: 400 })
  }

  // El checkout de Tienda envía la variante en metadata. Si Rebill la devuelve,
  // validamos que el pago corresponda al producto que la persona eligió.
  const metadata = pay.metadata
  if (
    metadata &&
    ((metadata.base && metadata.base !== base) ||
      (metadata.print && metadata.print !== print) ||
      (metadata.size && metadata.size !== size) ||
      (metadata.qty && String(metadata.qty) !== String(qty)) ||
      (metadata.delivery && metadata.delivery !== delivery))
  ) {
    return NextResponse.json({ error: 'El pago no coincide con la selección de la tienda.' }, { status: 400 })
  }

  const email = pay.customer?.email ?? null
  const customerName =
    [pay.customer?.firstName, pay.customer?.lastName].filter(Boolean).join(' ') || null

  // 2) Confirmar la orden y descontar stock (atómico + idempotente).
  const { data: result, error } = await getSupabase().rpc('tienda_confirm_order', {
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

  const variant = `Remera ${base === 'blanca' ? 'Blanca' : 'Negra'} · estampa ${
    print === 'verde' ? 'Verde' : 'Blanca'
  }`

  // 3) Mail de confirmación (sólo la primera vez que se confirma el pago).
  if (result === 'confirmed' && email && process.env.RESEND_API_KEY) {
    new Resend(process.env.RESEND_API_KEY).emails
      .send({
        from: 'Pasito <noreply@pasito.app>',
        to: email,
        subject: 'Confirmamos tu Remera Pasito',
        html: orderConfirmationHtml({
          name: pay.customer?.firstName,
          variant,
          size,
          qty,
          delivery,
          amount: expected,
        }),
      })
      .catch((err) => console.error('[orders] Error enviando mail:', err))
  }

  if (result === 'confirmed') {
    revalidatePath('/tienda')
  }

  return NextResponse.json({ ok: true, result })
}
