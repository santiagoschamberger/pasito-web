import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  silverEventIsSoldOut,
  silverMoney,
  SILVER_EVENT,
} from '../lib/silver-event.ts'
const source = (p: string) =>
  readFileSync(new URL('../' + p, import.meta.url), 'utf8')
test('Silver uses its dedicated account for both checkout and verification', () => {
  const checkout = source('app/silver/SilverTicketCheckout.tsx')
  const server = source('lib/silver-rebill.ts')
  assert.match(checkout, /NEXT_PUBLIC_SILVER_REBILL_PUBLIC_KEY/)
  assert.doesNotMatch(checkout, /process\.env\.NEXT_PUBLIC_REBILL_PUBLIC_KEY/)
  assert.match(server, /SILVER_REBILL_SECRET_KEY/)
  assert.doesNotMatch(server, /process\.env\.REBILL_SECRET_KEY|LEGACY/)
  assert.match(
    source('app/api/events/silver/orders/confirm/route.ts'),
    /await getSilverRebillPayment\(paymentId\)/,
  )
  assert.match(
    source('app/api/rebill/webhook/[secret]/route.ts'),
    /await getSilverRebillPayment\(payment.id\)/,
  )
})
test('Silver receipts and signed tickets cannot route into the TOMATE event', () => {
  const email = source('lib/silver-ticket-email.ts')
  assert.doesNotMatch(email, /TOMATE|Rosedal|\/evento-pasito\/ticket/)
  assert.match(email, /\/silver\/ticket\//)
  assert.match(
    source('app/silver/ticket/[token]/page.tsx'),
    /order.event_slug !== SILVER_EVENT.slug/,
  )
  assert.match(
    source('app/api/events/silver/orders/confirm/route.ts'),
    /sendSilverTicketsEmail/,
  )
})
test('Silver sold-out state follows live capacity and totals stay in ARS', () => {
  const tier = {
    tierId: 29,
    position: 1,
    name: 'General',
    unitPrice: 45000,
    capacity: 200,
    sold: 200,
    held: 0,
    available: 0,
  }
  assert.equal(silverEventIsSoldOut([tier]), true)
  assert.equal(
    silverEventIsSoldOut([{ ...tier, sold: 0, available: 200 }]),
    false,
  )
  assert.match(silverMoney(90000), /90\.000/)
  assert.equal(SILVER_EVENT.maxTicketsPerOrder, 6)
})
