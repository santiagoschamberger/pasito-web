import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { PASITO_USERS, PASITO_USERS_COUNT } from '../lib/pasito-users.ts'

const marketingMetrics = readFileSync(new URL('../lib/marketing-metrics.ts', import.meta.url), 'utf8')
const home = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
const brands = readFileSync(new URL('../app/marcas/page.tsx', import.meta.url), 'utf8')
const commerce = readFileSync(new URL('../app/comercios/page.tsx', import.meta.url), 'utf8')
const empresas = readFileSync(new URL('../app/empresas/page.tsx', import.meta.url), 'utf8')

test('the public user-count constant is the rounded 1,4M figure', () => {
  assert.equal(PASITO_USERS_COUNT, 1_400_000)
  assert.equal(PASITO_USERS.plusMillions, '+1,4 millones')
  assert.equal(PASITO_USERS.plusLabel, '+1,4 millones de usuarios')
  assert.equal(PASITO_USERS.short, '1,4M')
  assert.equal(PASITO_USERS.plusNumeric, '+1.400.000')
})

test('marketing surfaces read the user count from the shared constant', () => {
  assert.match(marketingMetrics, /totalUsers: PASITO_USERS_COUNT/)
  for (const source of [home, brands, commerce, empresas]) {
    assert.match(source, /PASITO_USERS/)
    assert.doesNotMatch(source, /620 mil/)
    assert.doesNotMatch(source, /620_000/)
    assert.doesNotMatch(source, /600 mil/)
  }
})
