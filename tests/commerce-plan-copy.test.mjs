import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  formatPaidPlanPrice,
  formatPartnerPlanListAmount,
  getPartnerPlanChargeAmount,
  PARTNER_PLAN_IVA_RATE,
} from '../lib/partner-plan-pricing.ts'

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

test('paid commerce plans disclose list price and the IVA total from the shared charge helper', () => {
  assert.equal(PARTNER_PLAN_IVA_RATE.AR, 0.21)
  assert.equal(PARTNER_PLAN_IVA_RATE.UY, 0.22)
  assert.equal(getPartnerPlanChargeAmount(69_000, 'AR'), 83_490)
  assert.equal(getPartnerPlanChargeAmount(190_000, 'AR'), 229_900)
  assert.equal(getPartnerPlanChargeAmount(50, 'UY'), 61)
  assert.equal(getPartnerPlanChargeAmount(150, 'UY'), 183)
  assert.equal(getPartnerPlanChargeAmount(0, 'AR'), 0)
  assert.equal(formatPaidPlanPrice(69_000, 'AR'), '$69.000/mes + IVA (total $83.490)')
  assert.equal(formatPaidPlanPrice(50, 'UY'), 'USD 50/mes + IVA (total USD 61)')
  assert.equal(formatPartnerPlanListAmount(83_490, 'ARS'), '$83.490')
  assert.equal(formatPartnerPlanListAmount(61, 'USD'), 'USD 61')

  assert.match(pricingSource, /formatPaidPlanPrice/)
  assert.match(pricingSource, /getPartnerPlanChargeAmount/)
  assert.match(pricingSource, /formatPartnerPlanListAmount/)
  assert.match(pricingSource, /\/mes \+ IVA/)
  assert.doesNotMatch(pricingSource, /83\.490|229\.900|USD 61|USD 183/)
  assert.match(commercePageSource, /¿Los precios incluyen IVA\?/)
  assert.match(commercePageSource, /21% en Argentina y 22% en Uruguay/)
})

test('commerce plan copy avoids the retired public names and hard wording', () => {
  assert.doesNotMatch(commerceCopy, />Starter</)
  assert.doesNotMatch(commerceCopy, />Ventas</)
  assert.doesNotMatch(commerceCopy, /obligad[oa] a regalar/i)
  assert.match(commercePageSource, /¿Tengo que ofrecer un premio gratuito\?/)
})

test('the free plan stays without IVA on cards and in the comparison table', () => {
  assert.match(pricingSource, /priceKey === 'starter' \? 'Gratis'/)
  assert.match(pricingSource, /plan\.priceKey !== 'starter'/)
  assert.doesNotMatch(pricingSource, /starter:[\s\S]{0,40}IVA/)
})
