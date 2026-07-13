import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { normalizeShippingAddress } from '@/lib/store-shipping'

const BASES = ['blanca', 'negra'] as const
const PRINTS = ['verde', 'blanca'] as const
const SIZES = ['S', 'M', 'L', 'XL'] as const
const MAX_PER_ORDER = 10

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

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[orders/intent] Falta configuración de Supabase')
    return NextResponse.json({ error: 'No pudimos preparar el envío.' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Datos de envío inválidos.' }, { status: 400 })
  }

  const base = String(body.base ?? '')
  const print = String(body.print ?? '')
  const size = String(body.size ?? '')
  const qty = Number(body.qty ?? 0)
  const address = normalizeShippingAddress(body.address)

  if (
    !BASES.includes(base as (typeof BASES)[number]) ||
    !PRINTS.includes(print as (typeof PRINTS)[number]) ||
    !SIZES.includes(size as (typeof SIZES)[number]) ||
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > MAX_PER_ORDER ||
    !address
  ) {
    return NextResponse.json({ error: 'Completá la dirección de envío.' }, { status: 400 })
  }

  const expectedPrint = base === 'blanca' ? 'verde' : 'blanca'
  if (print !== expectedPrint) {
    return NextResponse.json({ error: 'La variante seleccionada no es válida.' }, { status: 400 })
  }

  const db = getSupabase()

  // Los intents abandonados sólo viven dos horas. La limpieza oportunista evita
  // conservar direcciones de personas que no completaron la compra.
  const { error: cleanupError } = await db.from('tienda_checkout_intents')
    .delete()
    .lt('expires_at', new Date().toISOString())
  if (cleanupError) console.error('[orders/intent] Error limpiando intents:', cleanupError)

  const { data: stock, error: stockError } = await db
    .from('tienda_stock')
    .select('qty')
    .eq('base', base)
    .eq('size', size)
    .maybeSingle()

  if (stockError) {
    console.error('[orders/intent] Error leyendo stock:', stockError)
    return NextResponse.json({ error: 'No pudimos confirmar el stock.' }, { status: 500 })
  }
  if (!stock || Number(stock.qty) < qty) {
    return NextResponse.json({ error: 'Ya no queda stock suficiente de este talle.' }, { status: 409 })
  }

  const { data: intent, error } = await db
    .from('tienda_checkout_intents')
    .insert({
      base,
      print,
      size,
      qty,
      delivery: 'envio',
      shipping_address_line1: address.line1,
      shipping_address_line2: address.line2 || null,
      shipping_city: address.city,
      shipping_province: address.province,
      shipping_postal_code: address.postalCode,
      shipping_country_code: 'AR',
      shipping_phone: address.phone,
      shipping_notes: address.notes || null,
    })
    .select('id')
    .single()

  if (error || !intent) {
    console.error('[orders/intent] Error creando intent:', error)
    return NextResponse.json({ error: 'No pudimos guardar la dirección.' }, { status: 500 })
  }

  return NextResponse.json(
    { checkoutIntentId: intent.id },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
