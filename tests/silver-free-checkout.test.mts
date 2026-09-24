import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const checkoutRoute = readFileSync(new URL('../app/api/events/silver/checkout-intents/route.ts', import.meta.url), 'utf8')
const freeRoute = readFileSync(new URL('../app/api/events/silver/orders/confirm-free/route.ts', import.meta.url), 'utf8')
const ui = readFileSync(new URL('../app/silver/SilverTicketCheckout.tsx', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../supabase/migrations/20260924112856_allow_zero_amount_event_ticket_orders.sql', import.meta.url), 'utf8')

test('checkout intents accept a reserved amount of zero', () => {
  assert.match(checkoutRoute, /typeof result\.amount !== 'number' \|\| result\.amount < 0/)
  assert.doesNotMatch(checkoutRoute, /!result\.amount\)/)
})

test('free confirm path only confirms zero-amount silver reservations', () => {
  assert.match(freeRoute, /intent\.amount !== 0/)
  assert.match(freeRoute, /free_\$\{intent\.id\}|free_\$\{intentId\}|freePaymentId/)
  assert.match(freeRoute, /event_confirm_ticket_order/)
  assert.match(freeRoute, /readIntentToken/)
})

test('silver checkout UI skips Rebill for \$0 totals', () => {
  assert.match(ui, /quote\.amount === 0/)
  assert.match(ui, /confirm-free/)
  assert.match(ui, /Confirmar entradas gratis/)
})

test('migration allows zero amount on intents and orders', () => {
  assert.match(migration, /amount >= 0/)
  assert.match(migration, /event_checkout_intents_amount_check/)
  assert.match(migration, /event_ticket_orders_amount_check/)
})
