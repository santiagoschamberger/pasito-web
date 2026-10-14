import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import test from 'node:test'

const clubPage = readFileSync(new URL('../app/club/page.tsx', import.meta.url), 'utf8')
const clubStyles = readFileSync(new URL('../app/club/club.module.css', import.meta.url), 'utf8')
const logoPath = new URL('../public/pasito-club/sponsors/glaciar.webp', import.meta.url)

test('Pasito Club page metadata and hero present Glaciar as main sponsor', () => {
  assert.match(clubPage, /const TITLE = 'Pasito Club by Glaciar Baja en Sodio'/)
  assert.match(clubPage, /title: TITLE/)
  assert.match(clubPage, /openGraph: \{[\s\S]*title: TITLE/)
  assert.match(clubPage, /<span>by<\/span>\s*\{\/\*[^*]*\*\/\}\s*<img src="\/pasito-club\/glaciar-logo-white\.webp" alt="Glaciar Baja en Sodio"/)
  assert.doesNotMatch(clubPage, /Pasito Club <span>by<\/span> Glaciar/)
  assert.match(clubPage, /className=\{styles\.heroPresented\}/)
  assert.match(clubPage, /Entrada a la carrera incluida/)
  assert.doesNotMatch(clubPage, /200 cupos por fecha/)
  assert.doesNotMatch(clubPage, /cupos por fecha/)
})

test('Glaciar is the first regular sponsor card with a Main Sponsor badge', () => {
  assert.match(clubPage, /\{ name: 'Glaciar Baja en Sodio', file: 'glaciar', main: true \}/)
  assert.match(clubPage, /alt=\{sponsor\.name\}/)
  assert.match(clubPage, /Main Sponsor/)
  assert.doesNotMatch(clubPage, /aria-label="Sponsor principal"/)
  assert.doesNotMatch(clubPage, /styles\.mainSponsorName/)
  assert.doesNotMatch(clubStyles, /\.mainSponsor\b/)
  assert.match(clubStyles, /\.sponsorMainBadge\b/)
  assert.match(clubStyles, /\.heroPresented\b/)
  assert.equal(existsSync(logoPath), true)
  assert.ok(statSync(logoPath).size > 0)
})

test('Heineken 0.0 uses the blue lockup on a matching sponsor card', () => {
  const logoPath = new URL('../public/pasito-club/sponsors/heineken-00.webp', import.meta.url)
  assert.match(clubPage, /\{ name: 'Heineken 0\.0', file: 'heineken-00', card: 'heineken' \}/)
  assert.match(clubStyles, /\.sponsorGrid li\.sponsorHeineken \{[^}]*background: #1A3F7A;/)
  assert.match(clubStyles, /\.sponsorHeinekenLogo\b/)
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
