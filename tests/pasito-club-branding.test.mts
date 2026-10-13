import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const clubPage = readFileSync(new URL('../app/club/page.tsx', import.meta.url), 'utf8')
const clubStyles = readFileSync(new URL('../app/club/club.module.css', import.meta.url), 'utf8')
const logoPath = new URL('../public/pasito-club/sponsors/glaciar.webp', import.meta.url)

test('Pasito Club page metadata and hero present Glaciar as main sponsor', () => {
  assert.match(clubPage, /const TITLE = 'Pasito Club by Glaciar'/)
  assert.match(clubPage, /title: TITLE/)
  assert.match(clubPage, /openGraph: \{[\s\S]*title: TITLE/)
  assert.match(clubPage, /Pasito Club <span>by<\/span> Glaciar/)
  assert.match(clubPage, /className=\{styles\.heroPresented\}/)
})

test('the club page has a visible Glaciar main-sponsor block using the public logo', () => {
  assert.match(clubPage, /aria-label="Sponsor principal"/)
  assert.match(clubPage, /src="\/pasito-club\/sponsors\/glaciar\.webp"/)
  assert.match(clubPage, /alt="Glaciar"/)
  assert.match(clubPage, /<p className=\{styles\.mainSponsorName\}>Pasito Club by Glaciar<\/p>/)
  assert.match(clubStyles, /\.mainSponsor\b/)
  assert.match(clubStyles, /\.heroPresented\b/)
  assert.equal(existsSync(logoPath), true)
  assert.ok(statSync(logoPath).size > 0)
})

test('Glaciar branding does not change checkout, payments, tickets or prices', () => {
  const checkout = readFileSync(new URL('../app/club/PasitoClubCheckout.tsx', import.meta.url), 'utf8')
  const event = readFileSync(new URL('../lib/pasito-club-event.ts', import.meta.url), 'utf8')
  const tickets = readFileSync(new URL('../lib/pasito-club-server.ts', import.meta.url), 'utf8')
  const email = readFileSync(new URL('../lib/pasito-club-ticket-email.ts', import.meta.url), 'utf8')

  for (const source of [checkout, event, tickets, email]) {
    assert.doesNotMatch(source, /Glaciar/)
  }
})
