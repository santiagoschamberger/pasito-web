import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildChallengeAndroidIntentUrl,
  buildChallengeCustomSchemeUrl,
  buildChallengeWebUrl,
  normalizeChallengeId,
} from '../app/challenges/[id]/challenge-link.ts'

const id = '03ba4342-ab89-4f43-982f-f66c88fd46c0'

test('normalizes challenge ids used by QR landings', () => {
  assert.equal(normalizeChallengeId(` ${id.toUpperCase()} `), id)
  assert.equal(normalizeChallengeId('not-a-uuid'), null)
})

test('builds Android and iOS challenge deep links', () => {
  const playStore =
    'https://play.google.com/store/apps/details?id=ar.pasito.pasito'

  assert.equal(buildChallengeWebUrl(id), `https://www.pasito.app/challenges/${id}`)
  assert.equal(
    buildChallengeAndroidIntentUrl(id, playStore),
    `intent://www.pasito.app/challenges/${id}#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=${encodeURIComponent(playStore)};end`,
  )
  assert.equal(
    buildChallengeCustomSchemeUrl(id),
    `ar.pasito.pasito://challenges/${id}`,
  )
})
