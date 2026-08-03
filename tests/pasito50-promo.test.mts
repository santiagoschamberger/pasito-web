import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PASITO50_AMOUNT,
  PASITO50_CAMPAIGN_CODE,
  PASITO50_MAX_CLAIMS,
  PASITO50_PROMO_URL,
  normalizePasito50SupportId,
  normalizePasito50Email,
  normalizePasito50Otp,
  pasito50MessageForStatus,
} from '../lib/pasito50.ts'

test('defines the public PASITO50 campaign contract', () => {
  assert.equal(PASITO50_CAMPAIGN_CODE, 'PASITO50')
  assert.equal(PASITO50_AMOUNT, 50)
  assert.equal(PASITO50_MAX_CLAIMS, 100)
  assert.equal(PASITO50_PROMO_URL, 'https://www.pasito.app/promo/pasito50')
})

test('normalizes the same eight-character support ID shown in the app', () => {
  assert.equal(normalizePasito50SupportId(' ab-cd 1234 '), 'ABCD1234')
  assert.equal(normalizePasito50SupportId('not-an-id'), 'AD')
})

test('normalizes verification data without accepting malformed values', () => {
  assert.equal(normalizePasito50Email('  USER@Example.COM '), 'user@example.com')
  assert.equal(normalizePasito50Otp(' 12-34 56 '), '123456')
  assert.equal(normalizePasito50Otp('1234567'), '123456')
})

test('returns safe Spanish messages for eligibility and capacity failures', () => {
  assert.match(pasito50MessageForStatus('account_too_old'), /últimos 5 días/i)
  assert.match(pasito50MessageForStatus('campaign_full'), /100 cupos/i)
  assert.match(pasito50MessageForStatus('support_id_ambiguous'), /ID de soporte/i)
  assert.match(pasito50MessageForStatus('unknown'), /intentar/i)
})
