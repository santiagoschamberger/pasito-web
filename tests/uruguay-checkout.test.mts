import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'
import { createHmac } from 'node:crypto'
const require = createRequire(import.meta.url)
const ts = require('typescript')

function load(path: string, mocks: Record<string, unknown> = {}, env: Record<string, string> = {}, fetcher?: typeof fetch) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(code, { exports, require: (name: string) => name === 'server-only' ? {} : mocks[name] ?? require(name),
    process: { env }, Buffer, AbortSignal, URL, fetch: fetcher, console: { error() {} } })
  return exports as any
}
const credentials = { DLOCALGO_API_KEY: 'test-api', DLOCALGO_SECRET_KEY: 'test-secret' }
const provider = () => load('../lib/uruguay-dlocal.ts', {}, credentials)

test('production and preview select explicit, separate provider environments', () => {
  assert.equal(load('../lib/uruguay-dlocal.ts', {}, { NODE_ENV: 'production', VERCEL_ENV: 'preview' }).dlocalGoApiUrl(), 'https://api-sbx.dlocalgo.com')
  assert.equal(load('../lib/uruguay-dlocal.ts', {}, { VERCEL_ENV: 'production' }).dlocalGoApiUrl(), 'https://api.dlocalgo.com')
  assert.equal(load('../lib/uruguay-dlocal.ts', {}, { DLOCALGO_ENVIRONMENT: 'sandbox', VERCEL_ENV: 'production' }).dlocalGoApiUrl(), 'https://api-sbx.dlocalgo.com')
  assert.throws(() => load('../lib/uruguay-dlocal.ts', {}, { DLOCALGO_ENVIRONMENT: 'wrong' }).dlocalGoApiUrl())
})
test('provider receives pesos, linked reservation, credentials and expiration', async () => {
  let captured: any
  const client = load('../lib/uruguay-dlocal.ts', {}, credentials, async (url, init) => {
    captured = { url, ...init, body: JSON.parse(String(init?.body)) }
    return Response.json({ id: 'DP-123', redirect_url: 'https://checkout-sbx.dlocalgo.com/test' })
  })
  await client.createDlocalGoPayment({ amount: 1190, currency: 'UYU', country: 'UY', orderId: 'intent', expirationMinutes: 5 })
  assert.equal(captured.body.amount, 1190)
  assert.equal(captured.body.currency, 'UYU')
  assert.equal(captured.body.order_id, 'intent')
  assert.equal(captured.body.expiration_value, 5)
  assert.equal(captured.headers.Authorization, 'Bearer test-api:test-secret')
})
test('payment must match ID, reservation, currency, country and full amount', () => {
  const api = provider()
  const intent = { id: 'intent', amount: 1190, currency: 'UYU', payment_provider_id: 'DP-123' }
  const payment = { id: 'DP-123', order_id: 'intent', amount: '1190.00', currency: 'UYU', country: 'UY' }
  assert.equal(api.dlocalGoPaymentMatchesIntent(payment, intent), true)
  for (const patch of [{ id: 'DP-other' }, { order_id: 'other' }, { currency: 'ARS' }, { country: 'AR' }, { amount: '1190junk' }, { amount: '' }, { amount: 1191 }]) {
    assert.equal(api.dlocalGoPaymentMatchesIntent({ ...payment, ...patch }, intent), false)
  }
})
test('webhook verifies HMAC over exact raw body and rejects tampering', () => {
  const api = provider(), body = '{"payment_id":"DP-123"}'
  const signature = createHmac('sha256', 'test-secret').update('test-api' + body).digest('hex')
  assert.equal(api.verifyDlocalGoNotification(body, `V2-HMAC-SHA256, Signature: ${signature}`), true)
  assert.equal(api.verifyDlocalGoNotification(body + ' ', `V2-HMAC-SHA256, Signature: ${signature}`), false)
  assert.equal(api.verifyDlocalGoNotification(body, null), false)
  assert.equal(api.verifyDlocalGoNotification(body, 'Bearer secret'), false)
})

const id = 'b10109f4-823b-4195-8efe-97a5cf27831e'
function routeHarness(overrides: Record<string, unknown> = {}, claimAvailable = true, saveAvailable = true) {
  const intent = { id, amount: 1190, currency: 'UYU', quantity: 1, status: 'held', expires_at: new Date(Date.now() + 240000).toISOString(), terms_accepted_at: new Date().toISOString(), payment_provider_id: null, ...overrides }
  let writes = 0, creates = 0
  const db = { from() { let update = false; const query: any = {
    select() { return query }, eq() { return query }, gt() { return query }, is() { return query },
    update() { update = true; writes++; return query },
    async maybeSingle() { return { data: update ? (writes === 1 ? claimAvailable : saveAvailable) ? { id } : null : intent, error: null } },
  }; return query } }
  const route = load('../app/api/events/walking-club-uy/payments/create/route.ts', {
    'next/server': { NextResponse: { json: (data: unknown, init: any) => Response.json(data, init) } },
    '@/lib/uruguay-walking-club-event': { WALKING_CLUB_UY_EVENT: { slug: 'uy', name: 'Walking Club' }, isUuid: (s: string) => s === id },
    '@/lib/uruguay-walking-club-server': { getWalkingClubUySupabase: () => db, requestOrigin: () => 'https://www.pasito.app' },
    '@/lib/tomate-ticket-security': { readIntentToken: (s: string) => s === 'valid' ? id : null, createIntentToken: () => 'signed' },
    '@/lib/uruguay-dlocal': { ...provider(), createDlocalGoPayment: async () => { creates++; return { paymentId: 'DP-123', redirectUrl: 'https://checkout.dlocalgo.com/test' } }, getDlocalGoPayment: async () => ({ id:'DP-123', order_id:id, amount:1190, currency:'UYU', country:'UY', status:'PENDING',redirect_url:'https://checkout.dlocalgo.com/test' }) },
  })
  return { run: (token = 'valid') => route.POST({ json: async () => ({ intentId: id, intentToken: token }) }), counts: () => ({ writes, creates }) }
}
test('creation rejects invalid tokens, expired/cancelled reservations and ARS before calling provider', async () => {
  const invalid = routeHarness(); assert.equal((await invalid.run('invalid')).status,403); assert.equal(invalid.counts().creates, 0)
  for (const patch of [{status:'cancelled'}, {expires_at:'2000-01-01'}, {currency:'ARS'}, {terms_accepted_at:null}]) {
    const h=routeHarness(patch); assert.equal((await h.run()).status,409); assert.equal(h.counts().creates,0)
  }
})
test('creation reuses existing payment and atomic claim prevents concurrent creation', async () => {
  const existing=routeHarness({payment_provider_id:'DP-123'});assert.equal((await existing.run()).status,200);assert.equal(existing.counts().creates,0)
  const concurrent=routeHarness({},false);assert.equal((await concurrent.run()).status,409);assert.equal(concurrent.counts().creates,0)
  const success=routeHarness();assert.equal((await success.run()).status,200);assert.equal(success.counts().creates,1)
  const failedSave=routeHarness({},true,false);assert.equal((await failedSave.run()).status,502)
})

test('confirmation uses real atomic RPC, scoped order and signed ticket; pending payment never issues tickets', async () => {
  for (const status of ['PAID','PENDING']) {
    const calls: any[]=[]
    const db={ from(table: string) { const q:any={select(){return q},eq(key:string,value:string){calls.push([key,value]);return q},update(){return q},async maybeSingle(){return {data:{id,amount:1190,currency:'UYU',payment_provider:'dlocalgo',payment_provider_id:'DP-123'}}},async single(){return {data:{id:'order',confirmation_email_sent_at:'sent'}}},async order(){return {data:[{id:'ticket',short_code:'ABC123',ticket_number:1}]}}};return q },async rpc(name:string,args:any){calls.push([name,args]);return {data:{status:'confirmed',orderId:'order'}}} }
    const m=load('../lib/uruguay-order-confirmation.ts',{
      '@/lib/uruguay-walking-club-event':{WALKING_CLUB_UY_EVENT:{slug:'uy'}},
      '@/lib/uruguay-walking-club-server':{getWalkingClubUySupabase:()=>db},
      '@/lib/uruguay-dlocal':{...provider(),getDlocalGoPayment:async()=>({id:'DP-123',order_id:id,amount:1190,currency:'UYU',country:'UY',status,payer:{email:'test@example.com'}})},
      '@/lib/uruguay-ticket-email':{sendWalkingClubUyTicketsEmail:async()=>{throw Error('must not send')}},
      '@/lib/tomate-ticket-security':{createTicketToken:(id:string)=>`signed-${id}`},
      '@/lib/email-retry':{},
    })
    if(status==='PENDING') {await assert.rejects(m.confirmWalkingClubUyOrder(id,'https://www.pasito.app'));assert.equal(calls.some(c=>c[0]==='event_confirm_ticket_order'),false)}
    else {const result=await m.confirmWalkingClubUyOrder(id,'https://www.pasito.app');assert.equal(result.tickets[0].url,'/walking-club-uy/ticket/signed-ticket');assert.ok(calls.some(c=>c[0]==='checkout_intent_id'&&c[1]===id));const rpc=calls.find(c=>c[0]==='event_confirm_ticket_order');assert.equal(rpc[1].p_currency,'UYU');assert.equal(rpc[1].p_payment_id,'dlocalgo:DP-123')}
  }
})


test('production callback origin avoids the apex redirect, including legacy configuration', () => {
  for (const configured of [undefined, 'https://pasito.app', 'https://pasito.app/', 'https://www.pasito.app/']) {
    const env: Record<string,string> = { NODE_ENV: 'production' }
    if (configured) env.NEXT_PUBLIC_SITE_URL = configured
    const mod = load('../lib/uruguay-walking-club-server.ts', {
      '@/lib/uruguay-walking-club-event': { WALKING_CLUB_UY_EVENT: { slug: 'uy' } },
    }, env)
    assert.equal(mod.requestOrigin({ headers: new Headers({ host: 'untrusted.invalid' }) }), 'https://www.pasito.app')
  }
})

test('signed provider retries confirm a late paid reservation; invalid signatures and pending payments do not issue tickets', async () => {
  for (const scenario of [
    { valid: false, status: 'PAID', expected: 401, confirmations: 0 },
    { valid: true, status: 'PENDING', expected: 200, confirmations: 0 },
    { valid: true, status: 'PAID', expected: 200, confirmations: 1 },
    { valid: true, status: 'PAID', expected: 503, confirmations: 1, emailPending: true },
  ]) {
    let confirmations = 0, lookups = 0
    const mod = load('../app/api/dlocalgo/webhook/route.ts', {
      'next/server': { NextResponse: { json: (data: unknown, init: any) => Response.json(data, init) } },
      '@/lib/uruguay-dlocal': {
        verifyDlocalGoNotification: () => scenario.valid,
        getDlocalGoPayment: async () => { lookups++; return { id: 'DP-123', order_id: id, status: scenario.status } },
      },
      '@/lib/uruguay-walking-club-event': { WALKING_CLUB_UY_EVENT: { slug: 'uy' }, isUuid: (value: string) => value === id },
      '@/lib/uruguay-walking-club-server': {
        requestOrigin: () => 'https://www.pasito.app',
        getWalkingClubUySupabase: () => ({ from() { const q: any = {
          select() { return q }, eq() { return q },
          async maybeSingle() { return { data: { id, status: 'expired', payment_provider_id: 'DP-123' } } },
        }; return q } }),
      },
      '@/lib/uruguay-order-confirmation': {
        confirmWalkingClubUyOrder: async (intentId: string, origin: string, paymentId: string) => {
          confirmations++
          assert.equal(intentId, id); assert.equal(paymentId, 'DP-123')
          assert.equal(origin, 'https://www.pasito.app')
          return { emailPending: scenario.emailPending ?? false }
        },
      },
    })
    const response = await mod.POST({ text: async () => '{"payment_id":"DP-123"}', headers: new Headers() })
    assert.equal(response.status, scenario.expected)
    assert.equal(confirmations, scenario.confirmations)
    if (!scenario.valid) assert.equal(lookups, 0)
  }
})
