import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const webhookSource = readFileSync(
  new URL('../app/api/rebill/webhook/[secret]/route.ts', import.meta.url),
  'utf8',
)

test('the shared Rebill webhook ignores subscription payments before merch routing', () => {
  const subscriptionGuard = webhookSource.indexOf('if (subscriptionId) return new NextResponse(null, { status: 204 })')
  const merchError = webhookSource.indexOf('Pago de tienda sin metadata de variante')

  assert.ok(subscriptionGuard > -1)
  assert.ok(merchError > subscriptionGuard)
})
