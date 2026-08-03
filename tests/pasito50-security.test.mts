import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { pasito50CodeHash } from '../lib/pasito50-verification.ts'

const requestCodeRoutePath = new URL(
  '../app/api/promo/pasito50/request-code/route.ts',
  import.meta.url,
)
const claimRoutePath = new URL(
  '../app/api/promo/pasito50/claim/route.ts',
  import.meta.url,
)
const clientPath = new URL(
  '../app/promo/pasito50/Pasito50Promo.tsx',
  import.meta.url,
)

test('requires an emailed one-time challenge before crediting Pasitos', async () => {
  const [requestCodeRoute, claimRoute] = await Promise.all([
    readFile(requestCodeRoutePath, 'utf8'),
    readFile(claimRoutePath, 'utf8'),
  ])

  assert.match(requestCodeRoute, /prepare_pasito_link_challenge/)
  assert.match(requestCodeRoute, /sendPasito50VerificationEmail/)
  assert.match(requestCodeRoute, /after\(async/)
  assert.match(requestCodeRoute, /status:\s*202/)
  assert.match(claimRoute, /claim_pasito_link_with_challenge/)
  assert.match(claimRoute, /p_challenge_id:\s*challengeId/)
  assert.match(claimRoute, /p_code_hash:\s*codeHash/)
  assert.doesNotMatch(claimRoute, /claim_pasito_link_by_support_code/)
})

test('keeps privileged credentials and OTP hashing out of the browser bundle', async () => {
  const client = await readFile(clientPath, 'utf8')

  assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY/)
  assert.doesNotMatch(client, /PASITO_PROMO_SIGNING_SECRET/)
  assert.doesNotMatch(client, /createHmac|codeHash/)
  assert.match(client, /request-code/)
})

test('binds each OTP hash to its Support ID and random challenge', () => {
  const base = {
    challengeId: '2f70d97e-bc4e-4b2a-8ae1-1236ee9be31e',
    code: '123456',
    supportId: 'a1b2c3d4',
    secret: 'a-secure-test-secret-with-at-least-32-characters',
  }
  const expected = pasito50CodeHash(base)

  assert.equal(expected.length, 64)
  assert.equal(pasito50CodeHash({ ...base, supportId: 'A1-B2-C3-D4' }), expected)
  assert.notEqual(
    pasito50CodeHash({ ...base, challengeId: 'b79249d5-2091-40b6-9eef-28d619e491a4' }),
    expected,
  )
  assert.notEqual(pasito50CodeHash({ ...base, code: '123457' }), expected)
  assert.notEqual(pasito50CodeHash({ ...base, supportId: 'DEADBEEF' }), expected)
})
