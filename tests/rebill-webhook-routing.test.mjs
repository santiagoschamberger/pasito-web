import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const webhookSource = readFileSync(
  new URL('../app/api/rebill/webhook/[secret]/route.ts', import.meta.url),
  'utf8',
)
const rebillSource = readFileSync(new URL('../lib/tomate-rebill.ts', import.meta.url), 'utf8')
const publicKeySource = readFileSync(new URL('../lib/rebill-public-key.ts', import.meta.url), 'utf8')
const ordersSource = readFileSync(new URL('../app/api/orders/route.ts', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('../app/tienda/StoreClient.tsx', import.meta.url), 'utf8')
const clubSource = readFileSync(new URL('../app/club/PasitoClubCheckout.tsx', import.meta.url), 'utf8')
const ticketSource = readFileSync(new URL('../app/evento-pasito/TicketCheckout.tsx', import.meta.url), 'utf8')

test('the shared Rebill webhook ignores subscription payments before merch routing', () => {
  const subscriptionGuard = webhookSource.indexOf('if (subscriptionId) return new NextResponse(null, { status: 204 })')
  const merchError = webhookSource.indexOf('Pago de tienda sin metadata de variante')

  assert.ok(subscriptionGuard > -1)
  assert.ok(merchError > subscriptionGuard)
  assert.match(webhookSource, /REBILL_NEW_WEBHOOK_SECRET/)
})

test('payment verification tries the no-IVA secret before the IVA and legacy accounts', () => {
  const keysFn = rebillSource.slice(
    rebillSource.indexOf('function getRebillSecretKeys()'),
    rebillSource.indexOf('export async function getRebillPayment'),
  )
  assert.match(keysFn, /REBILL_NO_IVA_SECRET_KEY/)
  assert.match(keysFn, /REBILL_SECRET_KEY/)
  assert.match(keysFn, /REBILL_LEGACY_SECRET_KEY/)
  assert.ok(keysFn.indexOf('REBILL_NO_IVA_SECRET_KEY') < keysFn.indexOf('REBILL_SECRET_KEY'))
  assert.ok(keysFn.indexOf('REBILL_SECRET_KEY') < keysFn.indexOf('REBILL_LEGACY_SECRET_KEY'))
  assert.match(rebillSource, /response\.status === 404/)
  assert.match(ordersSource, /await getRebillPayment\(paymentId\)/)
})

test('consumer checkouts use the no-IVA Rebill public key with a documented fallback', () => {
  assert.match(publicKeySource, /process\.env\.NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY/)
  assert.match(publicKeySource, /process\.env\.NEXT_PUBLIC_REBILL_PUBLIC_KEY/)
  assert.ok(
    publicKeySource.indexOf('NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY')
      < publicKeySource.indexOf('NEXT_PUBLIC_REBILL_PUBLIC_KEY'),
  )
  for (const [label, source] of [
    ['tienda', storeSource],
    ['club', clubSource],
    ['evento', ticketSource],
  ]) {
    assert.match(source, /from '@\/lib\/rebill-public-key'/, `${label} must import the shared public key`)
    assert.doesNotMatch(
      source,
      /process\.env\.NEXT_PUBLIC_REBILL_PUBLIC_KEY/,
      `${label} must not read the IVA public key directly`,
    )
  }
})
