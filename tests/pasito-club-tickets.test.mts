import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  PASITO_CLUB_PRICING_OPTIONS,
  PASITO_CLUB_TRAININGS,
  findPack,
  normalizeWhatsapp,
  packIncludesRace,
  packSavingsPercent,
  resolvePricingOption,
  trainingIsUpcoming,
} from '../lib/pasito-club-event.ts'

test('option B is the default and option A is selectable', () => {
  assert.equal(resolvePricingOption(undefined), 'B')
  assert.equal(resolvePricingOption('a'), 'A')
  assert.deepEqual(PASITO_CLUB_PRICING_OPTIONS.A.map((pack) => [pack.size, pack.price]), [[1, 10000], [4, 30000]])
  assert.deepEqual(PASITO_CLUB_PRICING_OPTIONS.B.map((pack) => pack.size), [2, 4, 6, 8])
})

test('option B gets cheaper per encuentro as packs grow', () => {
  const unit = PASITO_CLUB_PRICING_OPTIONS.B.map((pack) => pack.price / pack.size)
  for (let index = 1; index < unit.length; index += 1) assert.ok(unit[index] < unit[index - 1])
  assert.equal(packSavingsPercent(findPack(8, 'B')!), 25)
  assert.equal(findPack(3, 'B'), null)
})

test('packs of 4 or more include the race', () => {
  assert.equal(packIncludesRace(2), false)
  assert.equal(packIncludesRace(4), true)
  assert.equal(packIncludesRace(8), true)
})

test('calendar has the 8 Wednesdays with activations on 21/10 and 18/11', () => {
  assert.equal(PASITO_CLUB_TRAININGS.length, 8)
  for (const training of PASITO_CLUB_TRAININGS) {
    assert.equal(new Date(`${training.isoDate}T12:00:00-03:00`).getUTCDay(), 3)
  }
  assert.deepEqual(PASITO_CLUB_TRAININGS.filter((training) => training.activation).map((training) => training.isoDate), ['2026-10-21', '2026-11-18'])
  assert.equal(trainingIsUpcoming(PASITO_CLUB_TRAININGS[0], new Date('2026-10-14T21:59:00Z')), true)
  assert.equal(trainingIsUpcoming(PASITO_CLUB_TRAININGS[0], new Date('2026-10-14T22:00:00Z')), false)
})

test('normalizes Argentine WhatsApp numbers to E.164', () => {
  assert.equal(normalizeWhatsapp('11 2345 6789'), '+5491123456789')
  assert.equal(normalizeWhatsapp('011 15 2345-6789'), '+5491123456789')
  assert.equal(normalizeWhatsapp('+54 9 11 2345 6789'), '+5491123456789')
  assert.equal(normalizeWhatsapp('+54 11 2345 6789'), '+5491123456789')
  assert.equal(normalizeWhatsapp('0351 15 123 4567'), '+5493511234567')
  assert.equal(normalizeWhatsapp('+598 94 123 456'), '+59894123456')
  assert.equal(normalizeWhatsapp('123'), null)
  assert.equal(normalizeWhatsapp(''), null)
})

test('the Rebill webhook routes Pasito Club payments to their own confirmation', () => {
  const webhook = readFileSync(new URL('../app/api/rebill/webhook/[secret]/route.ts', import.meta.url), 'utf8')
  assert.match(webhook, /metadata\?\.eventSlug === PASITO_CLUB_EVENT\.slug/)
  assert.match(webhook, /confirmPasitoClubOrder/)
})

test('buyer emails never mention the WhatsApp group', () => {
  const email = readFileSync(new URL('../lib/pasito-club-ticket-email.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(email, /whatsapp/i)
})
