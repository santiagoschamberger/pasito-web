import assert from 'node:assert/strict'
import test from 'node:test'

import { EmailDeliveryError, retryEmailDelivery } from '../lib/email-retry.ts'

test('transactional email retries transient failures and returns the successful attempt', async () => {
  let calls = 0
  const result = await retryEmailDelivery(async () => {
    calls += 1
    if (calls < 3) throw new Error('temporary failure')
    return 'email-id'
  }, { delaysMs: [0], wait: async () => undefined })

  assert.deepEqual(result, { value: 'email-id', attempts: 3 })
  assert.equal(calls, 3)
})

test('transactional email stops after the configured number of attempts', async () => {
  let calls = 0

  await assert.rejects(
    retryEmailDelivery(async () => {
      calls += 1
      throw new Error('still down')
    }, { maxAttempts: 3, delaysMs: [0], wait: async () => undefined }),
    (error: unknown) => error instanceof EmailDeliveryError && error.attempts === 3,
  )
  assert.equal(calls, 3)
})
