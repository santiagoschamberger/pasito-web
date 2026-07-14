import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  pickupCoordinationBlockHtml,
  pickupInstructionsEmailHtml,
} from '../lib/store-pickup-email.ts'
import { pickupWhatsAppUrl } from '../lib/store-fulfillment.ts'

test('pickup WhatsApp link preloads the customer and pickup schedule placeholders', () => {
  const url = new URL(pickupWhatsAppUrl('Ada Lovelace'))

  assert.equal(url.hostname, 'wa.me')
  assert.equal(url.pathname, '/5491136491620')
  assert.match(url.searchParams.get('text') ?? '', /soy Ada Lovelace/i)
  assert.match(url.searchParams.get('text') ?? '', /\[DÍA\].*\[HORA\]/)
})

test('pickup emails show the phone number and a WhatsApp button', () => {
  const block = pickupCoordinationBlockHtml('Ada Lovelace')
  const email = pickupInstructionsEmailHtml({
    customerName: 'Ada Lovelace',
    variant: 'Remera Negra · estampa Blanca',
    size: 'M',
    qty: 1,
  })

  for (const html of [block, email]) {
    assert.match(html, /\+54 9 11 3649-1620/)
    assert.match(html, /Ir a WhatsApp/)
    assert.match(html, /https:\/\/wa\.me\/5491136491620/)
  }
})

test('future order confirmations track pickup instruction delivery', () => {
  const route = readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8')
  const migration = readFileSync(
    new URL('../supabase/migrations/20260714150216_track_store_pickup_instructions.sql', import.meta.url),
    'utf8',
  )

  assert.match(route, /pickupCoordinationBlockHtml/)
  assert.match(route, /tienda-order-confirmation-/)
  assert.match(route, /pickup_instructions_sent_at/)
  assert.match(migration, /pickup_instructions_email_id/)
})

test('the order confirmation page shows the pickup WhatsApp instructions', () => {
  const store = readFileSync(new URL('../app/tienda/StoreClient.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8')

  assert.match(store, /delivery === 'retiro'/)
  assert.match(store, /PICKUP_WHATSAPP_NUMBER_DISPLAY/)
  assert.match(store, /Ir a WhatsApp/)
  assert.match(store, /pickupWhatsAppUrl/)
  assert.match(route, /pickupWhatsAppUrl: buildPickupWhatsAppUrl\(customerName\)/)
})
