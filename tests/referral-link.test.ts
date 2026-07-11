import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildReferralAndroidIntentUrl,
  buildReferralCustomSchemeUrl,
  buildReferralInviteUrl,
  buildReferralPlayStoreUrl,
  normalizeReferralCode,
// @ts-expect-error Node's type-stripping test runner resolves the TS source directly.
} from '../app/i/[code]/referral-link.ts'

test('normalizes referral codes for public invite URLs', () => {
  assert.equal(normalizeReferralCode(' da-315 f73 '), 'DA315F73')
  assert.equal(
    buildReferralInviteUrl(' da-315 f73 '),
    'https://www.pasito.app/i/DA315F73',
  )
})

test('builds Android and iOS referral deep links', () => {
  const playStore = buildReferralPlayStoreUrl(
    'DA315F73',
    'https://play.google.com/store/apps/details?id=ar.pasito.pasito',
  )

  assert.equal(
    playStore,
    'https://play.google.com/store/apps/details?id=ar.pasito.pasito&referrer=pasito_referral_code%3DDA315F73',
  )

  const android = buildReferralAndroidIntentUrl('DA315F73', playStore)

  assert.equal(
    android,
    'intent://www.pasito.app/i/DA315F73#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dar.pasito.pasito%26referrer%3Dpasito_referral_code%253DDA315F73;end',
  )
  assert.equal(
    buildReferralCustomSchemeUrl('DA315F73'),
    'ar.pasito.pasito://i/DA315F73',
  )
})
