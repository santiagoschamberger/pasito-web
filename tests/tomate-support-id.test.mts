import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isTomateSupportId,
  normalizeTomateSupportId,
  TOMATE_SUPPORT_ID_LENGTH,
} from '../lib/tomate-support-id.ts'

test('accepts the eight-character support ID shown by the app', () => {
  assert.equal(TOMATE_SUPPORT_ID_LENGTH, 8)
  assert.equal(normalizeTomateSupportId('9103286F'), '9103286F')
  assert.equal(isTomateSupportId('9103286F'), true)
})

test('normalizes pasted support IDs before validation', () => {
  assert.equal(normalizeTomateSupportId(' 91-03 286f '), '9103286F')
  assert.equal(isTomateSupportId(normalizeTomateSupportId(' 91-03 286f ')), true)
})

test('rejects incomplete and non-hexadecimal values', () => {
  assert.equal(isTomateSupportId('9103286'), false)
  assert.equal(isTomateSupportId('9103286G'), false)
  assert.equal(isTomateSupportId('9103286F0'), false)
  assert.equal(isTomateSupportId('91-03286F'), false)
})
