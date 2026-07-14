import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { PICKUP_LOCATIONS, pickupLabel } from '../lib/store-fulfillment.ts'

const store = readFileSync(new URL('../app/tienda/StoreClient.tsx', import.meta.url), 'utf8')
const ordersRoute = readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8')
const webhook = readFileSync(new URL('../app/api/rebill/webhook/[secret]/route.ts', import.meta.url), 'utf8')
const migration = readFileSync(
  new URL('../supabase/migrations/20260714204349_add_store_pickup_location.sql', import.meta.url),
  'utf8',
)

test('pickup requires choosing exactly one supported location before checkout', () => {
  assert.deepEqual(PICKUP_LOCATIONS, ['belgrano', 'palermo'])
  assert.equal(pickupLabel('belgrano'), 'Retiro en Belgrano')
  assert.equal(pickupLabel('palermo'), 'Retiro en Palermo')
  assert.match(store, /useState<PickupLocation \| null>\(null\)/)
  assert.match(store, /delivery !== 'retiro' \|\| pickupLocation !== null/)
  assert.match(store, /Elegí dónde retirar/)
  assert.match(store, /PICKUP_LOCATIONS\.map/)
})

test('the selected pickup location is payment-verified, persisted, and forwarded by the webhook', () => {
  assert.match(store, /\.\.\.\(pickupLocation \? \{ pickupLocation \} : \{\}\)/)
  assert.match(ordersRoute, /paidPickupLocation !== pickupLocation/)
  assert.match(ordersRoute, /tienda_confirm_order_v3/)
  assert.match(ordersRoute, /p_pickup_location: pickupLocation/)
  assert.match(webhook, /pickupLocation/)
  assert.match(migration, /add column if not exists pickup_location text/)
  assert.match(migration, /pickup_location in \('belgrano', 'palermo'\)/)
  assert.match(migration, /create or replace function public\.tienda_confirm_order_v3/)
  assert.match(migration, /from public, anon, authenticated/)
})
