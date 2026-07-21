import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const navSource = readFileSync(new URL('../components/marketing/Marketing.tsx', import.meta.url), 'utf8')
const marketingStyles = readFileSync(new URL('../app/marketing.module.css', import.meta.url), 'utf8')

test('the shared desktop and mobile menus promote the event as new', () => {
  assert.match(navSource, /function EventNavLink/)
  assert.match(navSource, /href="\/evento-pasito"/)
  assert.match(navSource, /Evento <span className=\{styles\.navNewChip\}>Nuevo<\/span>/)
  assert.match(navSource, /<EventNavLink \/>/)
  assert.match(navSource, /<EventNavLink mobile \/>/)
  assert.match(marketingStyles, /\.navNewChip \{[^}]*background: var\(--brand-pink\);[^}]*color: var\(--brand-burgundy\);/s)
})
