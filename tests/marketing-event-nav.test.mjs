import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const navSource = readFileSync(new URL('../components/marketing/Marketing.tsx', import.meta.url), 'utf8')
const marketingStyles = readFileSync(new URL('../app/marketing.module.css', import.meta.url), 'utf8')
const homeSource = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8')
const brandsSource = readFileSync(new URL('../app/marcas/page.tsx', import.meta.url), 'utf8')

test('the shared desktop and mobile menus no longer promote the finished event', () => {
  assert.doesNotMatch(navSource, /EventNavLink/)
  assert.doesNotMatch(navSource, /href="\/evento-pasito"/)
  assert.doesNotMatch(marketingStyles, /\.navNewChip/)
})

test('the public marketing numbers and brands promise use the current copy', () => {
  assert.match(homeSource, /value: '552\.000', label: 'usuarios activos diarios'/)
  assert.match(brandsSource, /No vendemos espacios\. Conectamos marcas con personas en movimiento\./)
  assert.doesNotMatch(brandsSource, /Vendemos personas/)
})
