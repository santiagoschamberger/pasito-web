import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import config from '../next.config.mjs'
const require = createRequire(import.meta.url)
const { pathToRegexp } = require('next/dist/compiled/path-to-regexp')

test('existing signed dLocal callbacks bypass the apex redirect without changing page redirects', async () => {
  const redirects = await config.redirects()
  const apex = redirects.find(rule => rule.has?.some(h => h.type === 'host' && h.value === 'pasito.app'))
  assert.ok(apex)
  const pattern = pathToRegexp(apex.source)
  for (const path of ['/api/dlocalgo/webhook', '/api/dlocalgo/webhook/', '/.well-known/apple-app-site-association', '/app-ads.txt']) {
    assert.equal(pattern.test(path), false, path)
  }
  for (const path of ['/walking-club-uy', '/walking-club-uy/ticket/example', '/api/dlocalgo/webhook-other']) {
    assert.equal(pattern.test(path), true, path)
  }
})

test('cross-origin 307 reproduces missing Authorization while preserving the notification body', async () => {
  const server = createServer(async (req, res) => {
    if (req.url === '/redirect') {
      res.writeHead(307, { Location: `http://localhost:${server.address().port}/webhook` }); res.end(); return
    }
    let body = ''; for await (const chunk of req) body += chunk
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ authorization: req.headers.authorization ?? null, body, method: req.method }))
  })
  await new Promise(resolve => server.listen(0, resolve))
  try {
    const base = `http://127.0.0.1:${server.address().port}`
    const init = { method: 'POST', headers: { Authorization: 'V2-HMAC-SHA256, Signature: fixture' }, body: '{"payment_id":"DP-fixture"}' }
    const redirected = await (await fetch(`${base}/redirect`, init)).json()
    const direct = await (await fetch(`${base}/webhook`, init)).json()
    assert.equal(redirected.authorization, null)
    assert.equal(redirected.method, 'POST')
    assert.equal(redirected.body, init.body)
    assert.equal(direct.authorization, init.headers.Authorization)
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})
