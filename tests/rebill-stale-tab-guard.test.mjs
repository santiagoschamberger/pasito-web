import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const nodeRequire = createRequire(import.meta.url)

/**
 * Tests for the Rebill stale-tab guard that prevents old browser tabs
 * from creating checkout intents with mismatched public keys.
 * 
 * This guard was added to prevent the scenario where:
 * 1. User opens a checkout page with an old build (old Rebill key)
 * 2. Server switches to a new Rebill account
 * 3. User tries to checkout from the stale tab
 * 4. Intent is created with new account, but client opens Rebill with old key
 * 5. Payment goes to wrong account and gets rejected
 */

function createFixture(overrides = {}) {
  const env = {
    NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED: 'true',
    NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY: 'pk_test_sin_iva',
    REBILL_NO_IVA_SECRET_KEY: 'sk_test_sin_iva',
    REBILL_SECRET_KEY: 'sk_test_con_iva',
    REBILL_WEBHOOK_SECRET: 'whsec_sin',
    REBILL_NEW_WEBHOOK_SECRET: 'whsec_con',
    ...overrides
  }

  const client = {}
  const { outputText } = ts.transpileModule(
    readFileSync(new URL('../lib/rebill-routing.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
  )

  new Function('require', 'exports', 'process', 'fetch', outputText)(
    (mod) => {
      if (mod === 'node:crypto' || mod === 'crypto') return nodeRequire('node:crypto')
      if (mod === 'server-only') return {}
      return {}
    },
    client,
    { env },
    async () => new Response(null, { status: 404 })
  )

  return client
}

test('valid clientRebillAccount matching expected account allows checkout', () => {
  const client = createFixture()
  
  // Function should exist
  assert.ok(typeof client.assertClientRebillAccount === 'function', 'assertClientRebillAccount should be exported')
  
  // Should not throw when client account matches expected
  assert.doesNotThrow(() => client.assertClientRebillAccount('SIN_IVA', 'SIN_IVA'))
})

test('mismatched clientRebillAccount throws STALE_TAB_DETECTED', () => {
  const client = createFixture()
  
  // Client was built with CON_IVA key but server expects SIN_IVA
  assert.throws(
    () => client.assertClientRebillAccount('CON_IVA', 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
})

test('missing clientRebillAccount throws STALE_TAB_DETECTED', () => {
  const client = createFixture()
  
  // Client didn't send the field (old code before guard was deployed)
  assert.throws(
    () => client.assertClientRebillAccount(undefined, 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
  
  // Also test with null
  assert.throws(
    () => client.assertClientRebillAccount(null, 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
  
  // And empty string
  assert.throws(
    () => client.assertClientRebillAccount('', 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
})

test('invalid clientRebillAccount value throws INVALID_CLIENT_ACCOUNT', () => {
  const client = createFixture()
  
  // Client sent an invalid account value
  assert.throws(
    () => client.assertClientRebillAccount('INVALID_ACCOUNT', 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'INVALID_CLIENT_ACCOUNT')
      return true
    }
  )
  
  // Test with other invalid values
  assert.throws(
    () => client.assertClientRebillAccount('sin_iva', 'SIN_IVA'), // lowercase
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'INVALID_CLIENT_ACCOUNT')
      return true
    }
  )
})

test('routing disabled skips client account check', () => {
  const client = createFixture({
    NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED: 'false'
  })
  
  // Should not throw even with missing or mismatched account when routing is disabled
  assert.doesNotThrow(() => client.assertClientRebillAccount(undefined, 'SIN_IVA'))
  assert.doesNotThrow(() => client.assertClientRebillAccount('CON_IVA', 'SIN_IVA'))
  assert.doesNotThrow(() => client.assertClientRebillAccount('INVALID', 'SIN_IVA'))
})

test('CON_IVA client can checkout when server expects CON_IVA', () => {
  const client = createFixture()
  
  // Some checkouts might still route to CON_IVA (e.g., during transition)
  assert.doesNotThrow(() => client.assertClientRebillAccount('CON_IVA', 'CON_IVA'))
})

test('SILVER_LEGACY account is recognized as valid', () => {
  const client = createFixture()
  
  // Silver events may use the legacy dedicated account
  assert.doesNotThrow(() => client.assertClientRebillAccount('SILVER_LEGACY', 'SILVER_LEGACY'))
})

test('whitespace in clientRebillAccount is normalized', () => {
  const client = createFixture()
  
  // Leading/trailing whitespace should be trimmed
  assert.doesNotThrow(() => client.assertClientRebillAccount('  SIN_IVA  ', 'SIN_IVA'))
  
  // But after trimming to empty, should fail
  assert.throws(
    () => client.assertClientRebillAccount('   ', 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
})

test('non-string clientRebillAccount values are handled', () => {
  const client = createFixture()
  
  // Number
  assert.throws(
    () => client.assertClientRebillAccount(123, 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
  
  // Object
  assert.throws(
    () => client.assertClientRebillAccount({ account: 'SIN_IVA' }, 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
  
  // Boolean
  assert.throws(
    () => client.assertClientRebillAccount(true, 'SIN_IVA'),
    (error) => {
      assert.ok(error instanceof Error)
      assert.equal(error.message, 'STALE_TAB_DETECTED')
      return true
    }
  )
})
