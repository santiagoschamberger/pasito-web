import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
function fixture(replies, overrides={}) {
  const env={NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED:'true',NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY:'public-fixture',REBILL_NO_IVA_SECRET_KEY:'sin-fixture',REBILL_SECRET_KEY:'con-fixture',REBILL_WEBHOOK_SECRET:'sin-route',REBILL_NEW_WEBHOOK_SECRET:'con-route',...overrides}
  const calls=[];const client={}
  const {outputText}=ts.transpileModule(readFileSync(new URL('../lib/rebill-routing.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}})
  new Function('require','exports','process','fetch',outputText)((mod)=>mod==='node:crypto'||mod==='crypto'?require('node:crypto'):{},client,{env},async(url,options)=>{calls.push({url,...options});assert.ok(replies.length,'Unexpected provider request');return replies.shift()})
  return {client,calls}
}
const payment={id:'pay_same',amount:'100.50',currency:'ARS',status:'approved',metadata:{checkoutIntentId:'intent-fixture'}}
for(const account of ['SIN_IVA','CON_IVA']) test(`${account} independently verifies a unique authoritative resource`,async()=>{
  const f=fixture(account==='SIN_IVA'?[Response.json({data:{payment}}),new Response(null,{status:404})]:[new Response(null,{status:404}),Response.json(payment)])
  const result=await f.client.resolveRebillPayment('pay_same',account)
  assert.equal(result.rebillAccount,account);assert.equal(result.currency,'ARS');assert.equal(result.amount,'100.50');assert.equal(f.calls.length,2)
})
test('colliding provider IDs and other-account outage prevent any confirmation',async()=>{
  const duplicate=fixture([Response.json(payment),Response.json(payment)])
  await assert.rejects(duplicate.client.resolveRebillPayment('pay_same','SIN_IVA'),/ambiguo/)
  const outage=fixture([Response.json(payment),new Response(null,{status:503})])
  await assert.rejects(outage.client.resolveRebillPayment('pay_same','SIN_IVA'),/503/)
})
test('new intent cannot accept a payment from the opposite account',()=>{
  const f=fixture([]);assert.throws(()=>f.client.assertIntentAccount({rebill_account:'SIN_IVA'},{...payment,rebillAccount:'CON_IVA'}),/otra cuenta/)
})
test('old NULL intent reads its proven original account without reclassification',()=>{
  const f=fixture([]);f.client.assertIntentAccount({rebill_account:null},{...payment,rebillAccount:'CON_IVA'});assert.equal(f.calls.length,0)
})
test('webhook routes are unique and payload metadata cannot inject verification',async()=>{
  const f=fixture([Response.json(payment),new Response(null,{status:404})]);assert.equal(f.client.webhookRebillAccount('sin-route'),'SIN_IVA');assert.equal(f.client.webhookRebillAccount('unknown'),null)
  const request=new Request('http://fixture.test',{headers:{'x-rebill-account':'SIN_IVA'}})
  const result=await f.client.resolveRebillPayment('pay_same','SIN_IVA',request);assert.equal(f.calls.length,2)
  f.client.bindVerifiedPayment(request,result)
  assert.equal(await f.client.resolveRebillPayment('pay_same','SIN_IVA',request),result);assert.equal(f.calls.length,2)
  await assert.rejects(f.client.resolveRebillPayment('pay_same','CON_IVA',request),/otra cuenta/)
  assert.throws(()=>fixture([],{REBILL_NEW_WEBHOOK_SECRET:'sin-route'}).client.webhookRebillAccount('sin-route'),/ambigua/)
})
test('duplicate/lost acknowledgement finishes only new checkout binding; historic bindings stay NULL',async()=>{
  const f=fixture([]);const updates=[]
  const db={from(table){return {update(row){return {eq(column,id){return {async is(nullColumn,value){updates.push({table,row,column,id,nullColumn,value});return {error:null}}}}}}}}}
  await f.client.bindNewOrderAccount(db,'event_ticket_orders',{...payment,rebillAccount:'SIN_IVA'},{rebill_account:'SIN_IVA'})
  await f.client.bindNewOrderAccount(db,'event_ticket_orders',{...payment,rebillAccount:'SIN_IVA'},{rebill_account:null})
  assert.equal(updates.length,1);assert.equal(updates[0].nullColumn,'rebill_account');assert.equal(updates[0].value,null)
})
test('refund/order updates reject a stored binding from another account',async()=>{
  const f=fixture([]);const db={from(){return {select(){return {eq(){return {async maybeSingle(){return {data:{rebill_account:'CON_IVA'},error:null}}}}}}}}}
  await assert.rejects(f.client.checkOrderAccount(db,'event_ticket_orders',{...payment,rebillAccount:'SIN_IVA'}),/otra cuenta/)
})
test('Silver historical key stays readable and unknown origin collisions stay blocked',async()=>{
  const f=fixture([new Response(null,{status:404}),new Response(null,{status:404}),Response.json(payment)],{SILVER_REBILL_SECRET_KEY:'silver-fixture',SILVER_REBILL_ACCOUNT:'SIN_IVA'})
  assert.equal((await f.client.resolveRebillPayment('pay_same')).rebillAccount,'SIN_IVA')
  const collision=fixture([Response.json(payment),new Response(null,{status:404}),Response.json(payment)],{SILVER_REBILL_SECRET_KEY:'silver-fixture',SILVER_REBILL_ACCOUNT:'CON_IVA'})
  await assert.rejects(collision.client.resolveRebillPayment('pay_same','SIN_IVA'),/ambiguo/)
  const historical=fixture([new Response(null,{status:404}),new Response(null,{status:404}),Response.json(payment)],{NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED:'false',SILVER_REBILL_SECRET_KEY:'silver-fixture'})
  assert.equal((await historical.client.resolveRebillPayment('pay_same')).rebillAccount,'SILVER_LEGACY')
})
function assertConfigError(run, pattern, leaked) {
  assert.throws(run,(error)=>{
    assert.ok(error instanceof Error)
    assert.match(error.message,pattern)
    for (const value of leaked) assert.equal(error.message.includes(value),false,value)
    return true
  })
}
test('routing rejects an unclassified Silver key and a legacy key that matches CON_IVA',()=>{
  const leaked=['silver-fixture','con-fixture','sin-fixture']
  assertConfigError(()=>fixture([],{SILVER_REBILL_SECRET_KEY:'silver-fixture'}).client.assertRebillCheckoutReady(),/clasificada/,leaked)
  assertConfigError(()=>fixture([],{SILVER_REBILL_SECRET_KEY:'silver-fixture',SILVER_REBILL_ACCOUNT:'SILVER_LEGACY'}).client.assertRebillCheckoutReady(),/clasificada/,leaked)
  assertConfigError(()=>fixture([],{REBILL_LEGACY_SECRET_KEY:'con-fixture'}).client.assertRebillCheckoutReady(),/histórica|historica|independiente/,leaked)
  fixture([],{SILVER_REBILL_SECRET_KEY:'silver-fixture',SILVER_REBILL_ACCOUNT:'SIN_IVA'}).client.assertRebillCheckoutReady()
  fixture([],{SILVER_REBILL_SECRET_KEY:'silver-fixture',SILVER_REBILL_ACCOUNT:'CON_IVA'}).client.assertRebillCheckoutReady()
  fixture([],{REBILL_LEGACY_SECRET_KEY:'sin-legacy-fixture'}).client.assertRebillCheckoutReady()
  fixture([],{NEXT_PUBLIC_REBILL_ACCOUNT_ROUTING_ENABLED:'false',SILVER_REBILL_SECRET_KEY:'silver-fixture',REBILL_LEGACY_SECRET_KEY:'con-fixture'}).client.assertRebillCheckoutReady()
})
test('webhook secret comparison is constant-time and ignores missing values',()=>{
  const {client}=fixture([])
  assert.equal(client.webhookSecretsEqual('sin-route','sin-route'),true)
  assert.equal(client.webhookSecretsEqual('sin-route','con-route'),false)
  assert.equal(client.webhookSecretsEqual(undefined,'sin-route'),false)
  assert.equal(client.webhookSecretsEqual('','sin-route'),false)
  assert.equal(client.webhookSecretsEqual('sin-route',''),false)
  assert.equal(client.webhookSecretsEqual('sin-route',undefined),false)
  assert.equal(client.webhookRebillAccount('sin-route'),'SIN_IVA')
  assert.equal(client.webhookRebillAccount('con-route'),'CON_IVA')
  assert.equal(client.webhookRebillAccount('unknown'),null)
  assert.equal(fixture([],{SILVER_REBILL_WEBHOOK_SECRET:'silver-route'}).client.webhookRebillAccount('silver-route'),'SILVER_LEGACY')
})
test('documented alias keys resolve one logical account and conflicting snapshots fail closed',async()=>{
  const f=fixture([Response.json(payment),new Response(null,{status:404}),Response.json(payment)],{REBILL_LEGACY_SECRET_KEY:'sin-legacy-fixture'})
  assert.equal((await f.client.resolveRebillPayment('pay_same','SIN_IVA')).rebillAccount,'SIN_IVA')
  const inconsistent=fixture([Response.json(payment),new Response(null,{status:404}),Response.json({...payment,amount:'200'})],{REBILL_LEGACY_SECRET_KEY:'sin-legacy-fixture'})
  await assert.rejects(inconsistent.client.resolveRebillPayment('pay_same','SIN_IVA'),/inconsistentes/)
})
test('all new paid web checkouts require SIN_IVA before provider SDK; free and UY retain their path',()=>{
  for(const path of ['app/evento-pasito/TicketCheckout.tsx','app/club/PasitoClubCheckout.tsx','app/silver/SilverTicketCheckout.tsx','app/tienda/StoreClient.tsx']) assert.match(readFileSync(new URL('../'+path,import.meta.url),'utf8'),/NEXT_PUBLIC_REBILL_NO_IVA_PUBLIC_KEY/)
  const webhook=readFileSync(new URL('../app/api/rebill/webhook/[secret]/route.ts',import.meta.url),'utf8')
  assert.ok(webhook.indexOf('payment = await resolveRebillPayment')<webhook.indexOf('const metadata = payment.metadata'))
})

test('lost callbacks recover in bounded pages and duplicate/lost acknowledgements safely restart',async()=>{
  const exports={};const {outputText}=ts.transpileModule(readFileSync(new URL('../lib/rebill-recovery.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}})
  new Function('require','exports','process',outputText)(()=>({}),exports,{env:{}})
  const confirmed=new Set();let fail=true
  const search=async offset=>({records:Array.from({length:20},(_,n)=>({id:'pay_'+(offset+n)})),pagination:{hasNextPage:true}})
  const deliver=async id=>{confirmed.add(id);if(id==='pay_5' && fail)return new Response(null,{status:503});return Response.json({ok:true})}
  await assert.rejects(exports.recoverRebillPayments('SIN_IVA',0,deliver,search),/reintento/)
  fail=false;const result=await exports.recoverRebillPayments('SIN_IVA',0,deliver,search)
  assert.equal(result.nextOffset,40);assert.equal(result.processed,40);assert.equal(confirmed.size,40)
  const next=await exports.recoverRebillPayments('CON_IVA',40,deliver,async()=>({records:[{id:'pay_40'},{id:'subscription_payment',subscriptionId:'sub_owned'}],pagination:{hasNextPage:false}}))
  assert.equal(next.nextOffset,null);assert.equal(next.processed,1);assert.equal(confirmed.size,41)
})

test('rollback pause blocks new checkout while existing payments keep reconciling',async()=>{
 const f=fixture([Response.json(payment),new Response(null,{status:404})],{REBILL_NEW_CHECKOUTS_PAUSED:'true'})
 assert.throws(()=>f.client.assertRebillCheckoutReady(),/pausados/)
 assert.equal((await f.client.resolveRebillPayment('pay_same','SIN_IVA')).rebillAccount,'SIN_IVA')
})
