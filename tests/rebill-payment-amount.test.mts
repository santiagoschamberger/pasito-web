import assert from 'node:assert/strict'
import test from 'node:test'

import { isRebillPaymentAmountValid } from '../lib/rebill-payment-validation.ts'

test('accepts the exact checkout amount for a single payment', () => {
  assert.equal(isRebillPaymentAmountValid(35_000, 35_000, 1), true)
})

test('accepts a higher Rebill total only when it comes from installments', () => {
  assert.equal(isRebillPaymentAmountValid(55_372.34, 35_000, 9), true)
  assert.equal(isRebillPaymentAmountValid(55_372.34, 35_000, 1), false)
  assert.equal(isRebillPaymentAmountValid(55_372.34, 35_000, null), false)
})

test('never accepts an underpayment or invalid amount', () => {
  assert.equal(isRebillPaymentAmountValid(34_999.99, 35_000, 9), false)
  assert.equal(isRebillPaymentAmountValid(undefined, 35_000, 1), false)
  assert.equal(isRebillPaymentAmountValid('not-a-number', 35_000, 1), false)
})
