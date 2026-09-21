const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { runInNewContext } = require('node:vm')
const test = require('node:test')
const ts = require('typescript')
const QRCode = require('qrcode')

// Exercise the actual email and signing code; only delivery leaves the process mocked.
function emailHarness(response = { data: { id: 'email-test' }, error: null }) {
  const sends = []
  const qrUrls = []
  const cache = new Map()
  const env = { RESEND_API_KEY: 'test-key', EVENT_TICKET_SIGNING_SECRET: 'test-signing-secret-at-least-32-characters' }
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative)
    if (cache.has(filename)) return cache.get(filename)
    const module = { exports: {} }
    cache.set(filename, module.exports)
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText
    runInNewContext(code, {
      module, exports: module.exports, Buffer, process: { env },
      require(name) {
        if (name === 'server-only') return {}
        if (name === 'resend') return { Resend: class {
          emails = { send: async (email, options) => { sends.push({ email, options }); return response } }
        } }
        if (name === 'qrcode') return { toBuffer: async (url, options) => {
          qrUrls.push(url)
          return QRCode.toBuffer(url, options)
        } }
        if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
        return require(name)
      },
    }, { filename })
    return module.exports
  }
  return { send: load('lib/silver-ticket-email.ts').sendSilverTicketsEmail,
    readToken: load('lib/tomate-ticket-security.ts').readTicketToken, sends, qrUrls }
}

function order(quantity = 2) {
  return {
    id: 'order-test', paymentId: 'payment-test', customerEmail: 'comprador@example.invalid',
    customerName: '<María & José>', amount: 45000 * quantity, quantity,
    tickets: Array.from({ length: quantity }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      code: `SILVER${i + 1}`, number: i + 1, status: 'valid', checkedInAt: null,
    })),
  }
}

test('Silver email sends a unique signed QR per ticket, inline images and text fallback to the buyer', async () => {
  const h = emailHarness()
  const purchase = order()
  const input = { origin: 'https://www.pasito.app', kind: 'confirmation', orders: [purchase] }
  assert.equal((await h.send(input)).id, 'email-test')
  const { email, options } = h.sends[0]
  assert.equal(email.to, purchase.customerEmail)
  assert.equal(email.subject, 'Tus entradas para Silver Walks by Nutren')
  assert.match(email.html, /&lt;María &amp; José&gt;/)
  assert.doesNotMatch(email.html, /<María|TOMATE|evento-pasito/)
  assert.equal(email.attachments.length, 2)
  assert.equal(new Set(h.qrUrls).size, 2)
  for (const [i, attachment] of email.attachments.entries()) {
    const url = new URL(h.qrUrls[i])
    assert.equal(url.origin, 'https://www.pasito.app')
    assert.match(url.pathname, /^\/silver\/ticket\//)
    assert.equal(h.readToken(url.pathname.split('/').at(-1)), purchase.tickets[i].id)
    assert.match(email.html, new RegExp(`cid:${attachment.contentId}`))
    assert.ok(email.text.includes(url.href))
    assert.ok(email.text.includes(purchase.tickets[i].code))
    assert.ok(Buffer.isBuffer(attachment.content))
    assert.equal(attachment.content.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(attachment.content.readUInt32BE(16), 720)
    assert.equal(attachment.content.readUInt32BE(20), 720)
  }
  assert.match(email.text, /27 de septiembre|27 de Septiembre/i)
  assert.match(email.text, /compartí una entrada distinta/)
  await h.send(input)
  assert.equal(h.sends[1].options.idempotencyKey, options.idempotencyKey)
})

test('Silver email surfaces delivery failures and missing provider acknowledgement for retry', async () => {
  for (const response of [{ data: null, error: { message: 'temporarily unavailable' } }, { data: null, error: null }]) {
    const h = emailHarness(response)
    await assert.rejects(h.send({ origin: 'https://www.pasito.app', kind: 'confirmation', orders: [order(1)] }))
    assert.equal(h.sends.length, 1)
  }
})

test('Silver does not send an empty receipt without QR tickets', async () => {
  const h = emailHarness()
  for (const orders of [[], [order(0)]]) {
    await assert.rejects(h.send({ origin: 'https://www.pasito.app', kind: 'confirmation', orders }), /No hay entradas/)
  }
  assert.equal(h.sends.length, 0)
})
