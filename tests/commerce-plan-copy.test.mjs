import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pricingSource = readFileSync(new URL('../app/comercios/PricingPlans.tsx', import.meta.url), 'utf8')
const commercePageSource = readFileSync(new URL('../app/comercios/page.tsx', import.meta.url), 'utf8')
const commerceCopy = `${pricingSource}\n${commercePageSource}`

test('commerce plans use the unified public names and current benefits', () => {
  assert.match(pricingSource, /name: 'Gratis'/)
  assert.match(pricingSource, /name: 'Standard'/)
  assert.match(pricingSource, /name: 'Destacado'/)
  assert.match(pricingSource, /hasta 2 descuentos/i)
  assert.match(pricingSource, /todos los descuentos que quieras/i)
  assert.match(pricingSource, /3 notificaciones push por mes/i)
  assert.match(pricingSource, /5\.000 usuarios de tu zona/i)
  assert.match(pricingSource, /Soporte 24\/7/)
})

test('commerce plan copy avoids the retired public names and hard wording', () => {
  assert.doesNotMatch(commerceCopy, />Starter</)
  assert.doesNotMatch(commerceCopy, />Ventas</)
  assert.doesNotMatch(commerceCopy, /obligad[oa] a regalar/i)
  assert.match(commercePageSource, /¿Tengo que ofrecer un premio gratuito\?/)
})
