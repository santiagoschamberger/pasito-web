import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { normalizeCheckoutEmail, recordCheckoutLead } from '../lib/checkout-leads.ts'

test('normalizes checkout emails and rejects invalid ones', () => {
  assert.equal(normalizeCheckoutEmail('  Ana@Pasito.App '), 'ana@pasito.app')
  assert.equal(normalizeCheckoutEmail('sin-arroba'), null)
  assert.equal(normalizeCheckoutEmail(''), null)
  assert.equal(normalizeCheckoutEmail(undefined), null)
  assert.equal(normalizeCheckoutEmail(`${'a'.repeat(250)}@x.co`), null)
})

test('records leads through the service-role RPC and never throws', async () => {
  const calls: unknown[] = []
  const ok = { rpc: async (...args: unknown[]) => { calls.push(args); return { error: null } } }
  await recordCheckoutLead(ok as never, { email: 'ana@pasito.app', source: 'silver' })
  assert.deepEqual(calls, [['record_checkout_lead', { p_email: 'ana@pasito.app', p_source: 'silver' }]])

  const originalError = console.error
  console.error = () => {}
  try {
    const failing = { rpc: async () => { throw new Error('db down') } }
    await recordCheckoutLead(failing as never, { email: 'ana@pasito.app', source: 'tienda' })
    const erroring = { rpc: async () => ({ error: { message: 'nope' } }) }
    await recordCheckoutLead(erroring as never, { email: 'ana@pasito.app', source: 'tienda' })
  } finally {
    console.error = originalError
  }
})

const checkoutRoutes: Array<[string, string]> = [
  ['app/api/pasito-club/checkout-intents/route.ts', 'pasito_club'],
  ['app/api/events/silver/checkout-intents/route.ts', 'silver'],
  ['app/api/events/tomate/checkout-intents/route.ts', 'tomate'],
  ['app/api/events/walking-club-uy/checkout-intents/route.ts', 'walking_club_uy'],
  ['app/api/orders/intent/route.ts', 'tienda'],
]

for (const [file, source] of checkoutRoutes) {
  test(`${file} requires an email and records it as a checkout lead`, () => {
    const code = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.match(code, /normalizeCheckoutEmail\(body\.email\)/)
    assert.match(code, new RegExp(`recordCheckoutLead\\([\\s\\S]*?source: '${source}'`))
  })
}
