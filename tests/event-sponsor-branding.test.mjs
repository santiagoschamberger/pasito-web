import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const eventSource = readFileSync(new URL('../app/evento-pasito/page.tsx', import.meta.url), 'utf8')
const eventStyles = readFileSync(new URL('../app/evento-pasito/tomate.module.css', import.meta.url), 'utf8')
const arizonaLogo = readFileSync(new URL('../public/evento-pasito/sponsors/arizona.png', import.meta.url))

test('Arizona uses the supplied PNG logo on a black sponsor card', () => {
  assert.match(eventSource, /logo: '\/evento-pasito\/sponsors\/arizona\.png'/)
  assert.match(
    eventStyles,
    /\.sponsorGrid \.sponsorCardArizona \{[^}]*border-color: #000;[^}]*background: #000;/s,
  )
  assert.deepEqual([...arizonaLogo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
})
