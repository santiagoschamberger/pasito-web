import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createOnlineStoreDatabase, seedOnlineStore, queryAs, fixtureUser, fixtureEmail, fixtureReward } from '../../../scripts/testing/online_store_database.mjs';
import { startOnlineStoreLocal, localAnonKey } from '../../../scripts/testing/online_store_local.mjs';
let fixture, local;
const stranger = '10000000-0000-4000-8000-000000000002';
const as = (role, user, sql, params = []) => queryAs(fixture.pg, role, user, sql, params);
const catalog = async role => (await as(role, role === 'anon' ? null : fixtureUser, "SELECT public.get_online_store_catalog(' ar ') AS value")).rows[0].value;
const redeem = (reward, key = randomUUID(), user = fixtureUser) => as('service_role', user,
  'SELECT public.redeem_external_code_tx($1,$2,NULL,$3,NULL) AS value', [user,reward,key]);
const state = async () => (await fixture.db.query(`SELECT pasitos_balance AS balance,
 (SELECT count(*)::int FROM public.coupons WHERE user_id=$1) AS coupons,
 (SELECT count(*)::int FROM public.reward_external_codes WHERE assigned_user_id=$1) AS assigned
 FROM public.profiles WHERE id=$1`, [fixtureUser])).rows[0];
before(async () => { fixture = await createOnlineStoreDatabase(); await seedOnlineStore(fixture.db); local = await startOnlineStoreLocal({port:0,database:fixture}); });
after(async () => { await local?.close(); await fixture?.dispose(); });

test('anon and authenticated see only safe public online catalog fields', async () => {
  for (const role of ['anon','authenticated']) {
    const rewards = await catalog(role);
    assert.equal(rewards.length,6);
    for (const r of rewards) {
      assert.equal(r.kind,'web'); assert.equal(r.online_catalog_eligible,true);
      for (const field of ['shared_code','pin_code','contact_email','billing_status','owner_id','code']) assert.ok(!(field in r) && !(field in r.partner), field);
    }
  }
  assert.deepEqual((await as('anon',null,"SELECT public.get_online_store_catalog('UY') AS value")).rows[0].value,[]);
});

test('public discovery excludes inactive, future, expired, physical and ticket offers', async () => {
  for (const mutation of [
    "UPDATE public.rewards SET is_active=false WHERE id=$1",
    "UPDATE public.partners SET is_active=false WHERE id=(SELECT partner_id FROM public.rewards WHERE id=$1)",
    "UPDATE public.rewards SET starts_at=now()+interval '1 day' WHERE id=$1",
    "UPDATE public.rewards SET expires_at=now()-interval '1 second' WHERE id=$1",
  ]) {
    await fixture.db.query('BEGIN');
    try {
      await fixture.db.query(mutation,[fixtureReward]);
      assert.equal((await fixture.db.query("SELECT jsonb_array_length(public.get_online_store_catalog('AR')) AS n")).rows[0].n,5,mutation);
    } finally { await fixture.db.query('ROLLBACK'); }
  }
  for (const kind of ['physical','ticket']) {
    await fixture.db.query('BEGIN');
    try {
      await fixture.db.query(`INSERT INTO public.rewards
        SELECT (jsonb_populate_record(NULL::public.rewards, to_jsonb(r) ||
          jsonb_build_object('id', gen_random_uuid(), 'kind', $2::text))).*
        FROM public.rewards r WHERE r.id=$1`, [fixtureReward,kind]);
      assert.equal((await fixture.db.query("SELECT jsonb_array_length(public.get_online_store_catalog('AR')) AS n")).rows[0].n,6);
    } finally { await fixture.db.query('ROLLBACK'); }
  }
});

test('clients cannot read coupon inventory or invoke the service-only redemption transaction', async () => {
  for (const role of ['anon','authenticated']) {
    await assert.rejects(as(role,fixtureUser,'SELECT * FROM public.reward_external_codes'), /permission denied/);
    await assert.rejects(as(role,fixtureUser,'SELECT public.redeem_external_code_tx($1,$2,NULL,$3,NULL)',[fixtureUser,fixtureReward,randomUUID()]), /permission denied/);
  }
});

test('the real transaction debits once, allocates once, and concurrent retries return the same coupon', async () => {
  const key=randomUUID();
  const results = await Promise.all([redeem(fixtureReward,key),redeem(fixtureReward,key)]);
  assert.equal(results[0].rows[0].value.coupon_id,results[1].rows[0].value.coupon_id);
  assert.match(results[0].rows[0].value.external_code,/^PRUEBA-/);
  assert.deepEqual(await state(),{balance:4400,coupons:1,assigned:1});
  await assert.rejects(redeem(fixtureReward),/Daily redemption limit|cooldown/);
  assert.deepEqual(await state(),{balance:4400,coupons:1,assigned:1});
});

test('insufficient balance and exhausted inventory roll back every debit and allocation', async () => {
  const reward='30000000-0000-4000-8000-000000000002';
  await fixture.db.query(`UPDATE public.profiles SET pasitos_balance=10 WHERE id=$1`,[fixtureUser]);
  await assert.rejects(redeem(reward),/Insufficient Pasitos balance/);
  assert.deepEqual(await state(),{balance:10,coupons:1,assigned:1});
  await fixture.db.query(`UPDATE public.profiles SET pasitos_balance=4400 WHERE id=$1`,[fixtureUser]);
  await fixture.db.query(`UPDATE public.reward_external_codes SET status='void' WHERE reward_id=$1`,[reward]);
  await assert.rejects(redeem(reward),/External codes exhausted|out of stock/);
  assert.deepEqual(await state(),{balance:4400,coupons:1,assigned:1});
});

test('profile and coupon RLS isolate two customers', async () => {
  await fixture.db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[stranger,'otra@pasito.test']);
  assert.equal((await as('authenticated',stranger,'SELECT id FROM public.coupons WHERE user_id=$1',[fixtureUser])).rowCount,0);
  assert.equal((await as('authenticated',stranger,'SELECT id FROM public.profiles WHERE id=$1',[fixtureUser])).rowCount,0);
  assert.equal((await as('authenticated',fixtureUser,'SELECT external_redemption_code FROM public.coupons WHERE user_id=$1',[fixtureUser])).rowCount,1);
});

async function call(path,body,token) {
  return fetch(local.url+path,{method:body?'POST':'GET', headers:{apikey:localAnonKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}, ...(body?{body:JSON.stringify(body)}:{})});
}

test('local OTP contract rejects wrong/replayed codes; protected HTTP endpoints require a valid session', async () => {
  assert.equal((await call('/functions/v1/redeem-external-code',{reward_id:fixtureReward,idempotency_key:randomUUID()})).status,401);
  assert.equal((await call('/auth/v1/otp',{email:fixtureEmail})).status,200);
  assert.equal((await call('/auth/v1/verify',{email:fixtureEmail,token:'invalid',type:'email'})).status,403);
  const code=local.pending.get(fixtureEmail).code;
  const response=await call('/auth/v1/verify',{email:fixtureEmail,token:code,type:'email'});
  assert.equal(response.status,200); const session=await response.json();
  assert.equal((await call('/auth/v1/verify',{email:fixtureEmail,token:code,type:'email'})).status,403);
  assert.equal((await call('/auth/v1/user',null,session.access_token)).status,200);
  assert.equal((await call('/rest/v1/profiles?id=eq.'+stranger,null,session.access_token)).status,403);
  assert.equal((await call('/auth/v1/logout',{},session.access_token)).status,204);
  assert.equal((await call('/auth/v1/user',null,session.access_token)).status,401);
});

test('Pasitos detail reads only the authenticated customer activity and credits', async () => {
  const other = '10000000-0000-4000-8000-000000000099';
  await fixture.db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[other,'detalle-otra@pasito.test']);
  for (const sql of ['SELECT public.get_my_activity_snapshot_v2() AS value', 'SELECT public.get_my_referral_bonus_credits(50) AS value', 'SELECT * FROM public.get_my_step_boost_credits(50)']) {
    await assert.rejects(as('anon',null,sql), /permission denied|Not authenticated/);
    const rows = await as('authenticated',other,sql);
    if (sql.includes('snapshot')) {
      assert.deepEqual(rows.rows[0].value.activity_history,[]);
      assert.deepEqual(rows.rows[0].value.redemption_history,[]);
    } else if (sql.includes('referral')) assert.deepEqual(rows.rows[0].value,[]);
    else assert.equal(rows.rowCount,0);
  }
  const snapshot = (await as('authenticated',fixtureUser,'SELECT public.get_my_activity_snapshot_v2() AS value')).rows[0].value;
  assert.equal(snapshot.activity_history[0].pasitos_earned,5000);
  assert.equal((await as('authenticated',other,'SELECT * FROM public.daily_activity WHERE user_id=$1',[fixtureUser])).rowCount,0);
  for (const name of ['get_my_referral_bonus_credits','get_my_step_boost_credits']) assert.equal((await call('/rest/v1/rpc/'+name,{p_limit:50})).status,401);
  await call('/auth/v1/otp',{email:fixtureEmail});
  const code=local.pending.get(fixtureEmail).code;
  const token=(await (await call('/auth/v1/verify',{email:fixtureEmail,token:code,type:'email'})).json()).access_token;
  for (const name of ['get_my_referral_bonus_credits','get_my_step_boost_credits']) {
    const response=await call('/rest/v1/rpc/'+name,{p_limit:50},token);
    assert.equal(response.status,200); assert.deepEqual(await response.json(),[]);
  }
  const history=await call('/rest/v1/daily_activity?user_id=eq.'+fixtureUser+'&limit=60',null,token);
  assert.equal(history.status,200); assert.equal((await history.json())[0].pasitos_earned,5000);
  assert.equal((await call('/rest/v1/daily_activity?user_id=eq.'+other,null,token)).status,403);
});
