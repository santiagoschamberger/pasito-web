import assert from 'node:assert/strict'
import test from 'node:test'
import { withRollingAverage } from '../lib/data-room/trends.ts'

test('uses a trailing seven-day average to soften one-day DAU swings', () => {
  const result = withRollingAverage([
    { date: '2026-07-05', count: 100 },
    { date: '2026-07-06', count: 200 },
    { date: '2026-07-07', count: 300 },
    { date: '2026-07-08', count: 400 },
    { date: '2026-07-09', count: 500 },
    { date: '2026-07-10', count: 600 },
    { date: '2026-07-11', count: 700 },
    { date: '2026-07-12', count: 0 },
  ])

  assert.deepEqual(
    result.map((row) => row.rollingAverage),
    [100, 150, 200, 250, 300, 350, 400, 386],
  )
  assert.equal(result.at(-1)?.count, 0, 'the audited daily value must remain unchanged')
})

test('rejects invalid rolling windows', () => {
  assert.throws(() => withRollingAverage([], 0), /positive integer/)
})
