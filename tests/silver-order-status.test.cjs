const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { runInNewContext } = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

const intentId = '11111111-1111-4111-8111-111111111111'
const ticketId = '22222222-2222-4222-8222-222222222222'
function harness({ paymentStatus = 'approved', missing = false, dbError = false, emailSent = true, ticketStatus = 'valid', eventSlug = 'silver-walks-2026-09' } = {}) {
  const calls = []
  const cache = new Map()
  const db = { from(table) {
    calls.push(table)
    const filters = {}
    const query = {
      select() { return query }, eq(key, value) { filters[key] = value; return query },
      async maybeSingle() {
        assert.equal(filters.checkout_intent_id, intentId)
        assert.equal(filters.event_slug, 'silver-walks-2026-09')
        return { error: dbError ? new Error('database unavailable') : null, data: missing || filters.event_slug !== eventSlug ? null : {
          id: 'order-1', quantity: 1, payment_status: paymentStatus, confirmation_email_sent_at: emailSent ? '2026-09-21T23:35:47Z' : null,
        } }
      },
      async order() {
        assert.equal(filters.order_id, 'order-1')
        return { data: [{ id: ticketId, short_code: 'ABC1234567', ticket_number: 1, status: ticketStatus }], error: null }
      },
    }
    return query
  } }
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative)
    const module = { exports: {} }; cache.set(relative, module.exports)
    const code = ts.transpileModule(readFileSync(path.resolve(__dirname, '..', relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    runInNewContext(code, { module, exports: module.exports, Buffer, console: { error() {} }, process: { env: { EVENT_TICKET_SIGNING_SECRET: 'test-secret-that-is-more-than-32-characters' } },
      require(name) {
        if (name === 'server-only') return {}
        if (name === '@/lib/tomate-server') return { getTomateSupabase: () => db }
        if (name === '@/lib/silver-server') return { requestOrigin: () => 'https://www.pasito.app' }
        if (name === '@/lib/silver-event') return { SILVER_EVENT: { slug: 'silver-walks-2026-09' } }
        if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
        return require(name)
      },
    })
    return module.exports
  }
  const security = load('lib/tomate-ticket-security.ts')
  const post = load('app/api/events/silver/orders/status/route.ts').POST
  return { calls, security, token: security.createIntentToken(intentId), post: body => post(new Request('https://www.pasito.app/api/events/silver/orders/status', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) })) }
}

test('Silver recovery rejects absent, forged, malformed and ticket tokens before accessing orders', async () => {
  const h = harness()
  for (const body of [{}, { intentId }, { intentToken: h.token + 'x' }, { intentToken: h.security.createTicketToken(intentId) }, null]) {
    assert.equal((await h.post(body)).status, 403)
  }
  assert.equal((await h.post('{')).status, 400)
  assert.equal(h.calls.length, 0)
})
test('Silver recovery returns only signed tickets from an approved order for its reservation', async () => {
  const h = harness()
  const response = await h.post({ intentToken: h.token })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control'), /no-store/)
  const body = await response.json()
  assert.equal(body.status, 'confirmed'); assert.equal(body.emailPending, false)
  assert.equal(body.tickets[0].code, 'ABC1234567')
  assert.equal(h.security.readTicketToken(new URL(body.tickets[0].url).pathname.split('/').at(-1)), ticketId)
  assert.equal(body.customer_email, undefined)
})
test('Silver recovery distinguishes email pending from purchase confirmation', async () => {
  const h = harness({ emailSent: false })
  const body = await (await h.post({ intentToken: h.token })).json()
  assert.equal(body.status, 'confirmed'); assert.equal(body.emailPending, true)
})
test('Silver recovery waits for the webhook and cannot reveal another event order', async () => {
  for (const options of [{ missing: true }, { eventSlug: 'tomate-event' }, { ticketStatus: 'void' }]) {
    const h = harness(options)
    assert.deepEqual(await (await h.post({ intentToken: h.token })).json(), { status: 'pending' })
  }
})
test('Refunds and other inactive payments never expose QR codes or query tickets', async () => {
  for (const paymentStatus of ['refunded', 'cancelled', 'chargeback', 'disputed']) {
    const h = harness({ paymentStatus })
    assert.deepEqual(await (await h.post({ intentToken: h.token })).json(), { status: 'inactive', refunded: paymentStatus === 'refunded' })
    assert.deepEqual(h.calls, ['event_ticket_orders'])
  }
})
test('Database failure is retryable without falsely confirming a payment', async () => {
  const h = harness({ dbError: true })
  const response = await h.post({ intentToken: h.token })
  assert.equal(response.status, 503)
  assert.equal((await response.json()).tickets, undefined)
})
