import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const webhookSource = readFileSync(
  new URL('../app/api/rebill/webhook/[secret]/route.ts', import.meta.url),
  'utf8',
)
const rebillSource = readFileSync(new URL('../lib/tomate-rebill.ts', import.meta.url), 'utf8')
const ordersSource = readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8')

test('the shared Rebill webhook ignores subscription payments before merch routing', () => {
  const subscriptionGuard = webhookSource.indexOf('if (subscriptionId) return new NextResponse(null, { status: 204 })')
  const merchError = webhookSource.indexOf('Pago de tienda sin metadata de variante')

  assert.ok(subscriptionGuard > -1)
  assert.ok(merchError > subscriptionGuard)
  assert.match(webhookSource, /REBILL_NEW_WEBHOOK_SECRET/)
})

test('webhook URL secrets are compared with hashed timingSafeEqual', () => {
  const routingSource = readFileSync(new URL('../lib/rebill-routing.ts', import.meta.url), 'utf8')
  assert.match(routingSource, /createHash\('sha256'\)/)
  assert.match(routingSource, /timingSafeEqual/)
  assert.match(webhookSource, /webhookSecretsEqual/)
  assert.equal(webhookSource.includes('expectedSecrets.includes(secret)'), false)
  assert.equal(routingSource.includes("value?.trim() === secret"), false)
})

test('payment verification falls back to the legacy Rebill account for existing purchases', () => {
  assert.match(rebillSource, /REBILL_LEGACY_SECRET_KEY/)
  assert.match(rebillSource, /response\.status === 404/)
  assert.match(ordersSource, /await getRebillPayment\(paymentId, undefined, req\)/)
})
