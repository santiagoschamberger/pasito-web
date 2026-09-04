import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'
import { buildChallengeAppUrl, buildChallengeUrl } from '../app/challenges/challenge-link.ts'

// All requests in this file are intercepted; no production credentials or data.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://challenges-test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
const { fetchChallengeWithWinners } = await import('../app/challenges/challenges-data.ts')

const bepId = 'b10109f4-823b-4195-8efe-97a5cf27831e'
const otherId = '00000000-0000-4000-8000-000000000001'
const challenge = {
  id: bepId, title: 'Black Eyed Peas', brand_name: 'Black Eyed Peas',
  is_closed: true, winner_selection_mode: 'raffle_top_n',
  brand_prizes: [{ title: '2 entradas', winner_count: 1 }, { title: 'Otra experiencia', winner_count: 2 }],
}
const participants = [
  { user_id: 'second', final_rank: 1, won: true, winner_prize_type: 'physical', pasitos_awarded: 0 },
  { user_id: 'first', final_rank: 4000, won: true, winner_prize_type: 'physical', pasitos_awarded: 0 },
  { user_id: 'hidden', final_rank: 2, won: true, winner_prize_type: 'physical', pasitos_awarded: 0 },
  { user_id: 'points', final_rank: 3, won: true, winner_prize_type: 'pasitos', pasitos_awarded: 50 },
  { user_id: 'loser', final_rank: 4, won: false, winner_prize_type: 'none', pasitos_awarded: 0 },
]
const raffle = [
  { user_id: 'hidden', draw_order: 3, selected: true },
  { user_id: 'second', draw_order: 2, selected: true },
  { user_id: 'first', draw_order: 1, selected: true },
  { user_id: 'points', draw_order: 4, selected: true },
]

function mockData(t: TestContext, options: {
  challenge?: Record<string, unknown>
  failTable?: string
  noWinners?: boolean
  missingDraw?: boolean
} = {}) {
  const requests: URL[] = []
  t.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    assert.equal(url.host, 'challenges-test.supabase.co')
    requests.push(url)
    const table = url.pathname.split('/').at(-1)
    if (table === options.failTable) {
      return Response.json({ message: 'temporarily unavailable', code: 'XX000' }, { status: 500 })
    }
    if (table === 'challenges') {
      assert.equal(url.searchParams.get('is_active'), 'eq.true')
      return Response.json({ ...challenge, ...options.challenge })
    }
    if (table === 'challenge_participants') {
      assert.equal(url.searchParams.get('challenge_id'), `eq.${options.challenge?.id ?? bepId}`)
      assert.equal(url.searchParams.get('won'), 'eq.true')
      return Response.json(options.noWinners ? [] : participants.filter((row) => row.won))
    }
    if (table === 'challenge_raffle_entries') {
      assert.equal(url.searchParams.get('selected'), 'eq.true')
      return Response.json(options.missingDraw ? raffle.slice(1) : raffle)
    }
    if (table === 'profiles') {
      assert.equal(url.searchParams.get('select'), 'id,display_name')
      assert.equal(url.searchParams.get('hide_from_leaderboard'), 'eq.false')
      assert.equal(url.searchParams.get('id'), 'in.(second,first,hidden,points)')
      return Response.json([
        { id: 'second', display_name: '  Sofía Gómez  ' },
        { id: 'first', display_name: 'Ana Pérez' },
        { id: 'points', display_name: '   ' },
      ])
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  return requests
}

test('BEP publishes the selected winners with full names, in draw order, with the right prizes', async (t) => {
  mockData(t)
  const result = await fetchChallengeWithWinners(bepId)
  assert.equal(result?.resultsStatus, 'published')
  assert.deepEqual(result?.physicalWinners.map((w) => [w.displayName, w.drawOrder, w.prizeTitle]), [
    ['Ana Pérez', 1, '2 entradas'], ['Sofía Gómez', 2, 'Otra experiencia'], [null, 3, 'Otra experiencia'],
  ])
  assert.equal(result?.pasitosWinners[0].pasitosAwarded, 50)
  assert.equal(result?.pasitosWinners[0].displayName, null)
  assert.ok(result?.physicalWinners.every((row) => !('user_id' in row) && !('userId' in row)))
})

test('other campaigns remain anonymous even if their title matches BEP', async (t) => {
  const requests = mockData(t, { challenge: { id: otherId } })
  const result = await fetchChallengeWithWinners(otherId)
  assert.ok(result?.physicalWinners.every((w) => w.displayName === null))
  assert.ok(!requests.some((url) => url.pathname.endsWith('/profiles')))
})

test('open challenges never query or publish provisional winners', async (t) => {
  const requests = mockData(t, { challenge: { is_closed: false } })
  const result = await fetchChallengeWithWinners(bepId)
  assert.equal(result?.resultsStatus, 'pending')
  assert.deepEqual(result?.physicalWinners, [])
  assert.equal(requests.length, 1)
})

test('closed challenges without results remain pending', async (t) => {
  const requests = mockData(t, { noWinners: true })
  const result = await fetchChallengeWithWinners(bepId)
  assert.equal(result?.resultsStatus, 'pending')
  assert.ok(!requests.some((url) => url.pathname.endsWith('/profiles')))
})

for (const failTable of ['challenge_participants', 'challenge_raffle_entries', 'profiles']) {
  test(`a ${failTable} outage is not presented as an empty or successful draw`, async (t) => {
    mockData(t, { failTable })
    const result = await fetchChallengeWithWinners(bepId)
    assert.equal(result?.resultsStatus, 'unavailable')
    assert.deepEqual(result?.physicalWinners, [])
    assert.deepEqual(result?.pasitosWinners, [])
  })
}

test('incomplete raffle data never falls back to the steps ranking', async (t) => {
  mockData(t, { missingDraw: true })
  assert.equal((await fetchChallengeWithWinners(bepId))?.resultsStatus, 'unavailable')
})

test('ranking challenges assign prizes by rank without requesting raffle data', async (t) => {
  const requests = mockData(t, { challenge: { winner_selection_mode: 'ranking_top_n' } })
  const result = await fetchChallengeWithWinners(bepId)
  assert.equal(result?.physicalWinners[0].displayName, 'Sofía Gómez')
  assert.equal(result?.physicalWinners[0].prizeTitle, '2 entradas')
  assert.ok(!requests.some((url) => url.pathname.endsWith('/challenge_raffle_entries')))
})

test('invalid IDs never access the database or become deep links', async (t) => {
  const requests = mockData(t)
  for (const id of ['', '../../profiles', 'javascript:alert(1)', `${bepId}/ranking`]) {
    assert.equal(await fetchChallengeWithWinners(id), null)
    assert.throws(() => buildChallengeAppUrl(id, 'ios'))
  }
  assert.equal(requests.length, 0)
})

test('app links use the existing detail route and Android falls back to the landing', () => {
  const webUrl = `https://www.pasito.app/challenges/${bepId}`
  assert.equal(buildChallengeUrl(` ${bepId.toUpperCase()} `), webUrl)
  assert.equal(buildChallengeAppUrl(bepId, 'ios'), `ar.pasito.pasito://challenges/${bepId}`)
  assert.equal(buildChallengeAppUrl(bepId, 'desktop'), `https://pasito.app/challenges/${bepId}`)
  assert.equal(buildChallengeAppUrl(bepId, 'android'),
    `intent://www.pasito.app/challenges/${bepId}#Intent;scheme=https;package=ar.pasito.pasito;S.browser_fallback_url=${encodeURIComponent(`${webUrl}#ganadores`)};end`)
})
