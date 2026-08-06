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
  assert.match(brandsSource, /name: 'Açaí Brasil', src: '\/marketing\/brands\/acai-brasil\.png'/)
  assert.doesNotMatch(brandsSource, /Vendemos personas/)
})

test('press wordmarks do not depend on the broken third-party image URLs', () => {
  assert.match(navSource, /wordmark: 'el-destape'/)
  assert.match(navSource, /wordmark: 'empre'/)
  assert.doesNotMatch(navSource, /eldestapeweb\.com\/img\/estructura\/logo\.png/)
  assert.doesNotMatch(navSource, /Diseno-sin-titulo-16\.png/)
})
