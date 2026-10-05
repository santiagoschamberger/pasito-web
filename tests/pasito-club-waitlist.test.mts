import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizePasitoClubEmail } from '../lib/pasito-club-waitlist.ts'

test('normalizes valid emails to trimmed lowercase', () => {
  assert.equal(normalizePasitoClubEmail('  Santi@Pasito.App '), 'santi@pasito.app')
})

test('rejects invalid, empty, non-string and oversized emails', () => {
  assert.equal(normalizePasitoClubEmail('no-es-un-mail'), null)
  assert.equal(normalizePasitoClubEmail(''), null)
  assert.equal(normalizePasitoClubEmail(undefined), null)
  assert.equal(normalizePasitoClubEmail(42), null)
  assert.equal(normalizePasitoClubEmail(`${'a'.repeat(250)}@x.co`), null)
})
