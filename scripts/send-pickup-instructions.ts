import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

import { pickupInstructionsEmailHtml } from '../lib/store-pickup-email.ts'
import { isPickupLocation } from '../lib/store-fulfillment.ts'

type PickupOrder = {
  id: string
  email: string | null
  customer_name: string | null
  base: string
  print: string | null
  size: string
  qty: number
  pickup_location: string | null
}

const execute = process.argv.includes('--execute')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY

if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
  throw new Error('Missing Supabase or Resend server credentials.')
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const resend = new Resend(resendApiKey)

const { data, error } = await db
  .from('tienda_orders')
  .select('id, email, customer_name, base, print, size, qty, pickup_location')
  .eq('delivery', 'retiro')
  .eq('status', 'paid')
  .is('pickup_instructions_sent_at', null)
  .not('email', 'is', null)
  .order('created_at', { ascending: true })

if (error) throw new Error(`Could not load pickup orders: ${error.message}`)

const orders = (data ?? []) as PickupOrder[]
console.log(`${execute ? 'Sending to' : 'Dry run:'} ${orders.length} pickup order(s).`)

if (!execute) process.exit(0)

let sent = 0
let failed = 0

for (const order of orders) {
  if (!order.email) continue

  const variant = `Remera ${order.base === 'blanca' ? 'Blanca' : 'Negra'} · estampa ${
    order.print === 'verde' ? 'Verde' : 'Blanca'
  }`
  const { data: emailData, error: emailError } = await resend.emails.send(
    {
      from: 'Pasito <noreply@pasito.app>',
      to: order.email,
      subject: 'Coordiná el retiro de tu Remera Pasito',
      html: pickupInstructionsEmailHtml({
        customerName: order.customer_name,
        variant,
        size: order.size,
        qty: order.qty,
        pickupLocation: isPickupLocation(order.pickup_location) ? order.pickup_location : null,
      }),
    },
    { idempotencyKey: `tienda-pickup-instructions-${order.id}` },
  )

  if (emailError || !emailData?.id) {
    failed += 1
    console.error(`Pickup email ${sent + failed}/${orders.length} failed.`)
    continue
  }

  const { error: updateError } = await db
    .from('tienda_orders')
    .update({
      pickup_instructions_sent_at: new Date().toISOString(),
      pickup_instructions_email_id: emailData.id,
    })
    .eq('id', order.id)
    .is('pickup_instructions_sent_at', null)

  if (updateError) {
    failed += 1
    console.error(`Pickup email ${sent + failed}/${orders.length} sent but tracking failed.`)
  } else {
    sent += 1
    console.log(`Pickup email ${sent + failed}/${orders.length} sent.`)
  }

  await new Promise((resolve) => setTimeout(resolve, 600))
}

console.log(`Pickup email run complete: ${sent} sent, ${failed} failed.`)
if (failed) process.exitCode = 1
