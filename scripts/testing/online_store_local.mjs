// Loopback-only Supabase protocol harness. PostgreSQL runs the actual production
// RPCs/RLS; OTP delivery and identity verification are simulated locally.
// This is not GoTrue, an OAuth provider, PostgREST or the deployed edge runtime.
import { createServer } from 'node:http';
import { randomBytes, randomInt, createHmac, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createOnlineStoreDatabase, seedOnlineStore, queryAs, fixtureUser, fixtureEmail } from './online_store_database.mjs';

export const localAnonKey = 'sb_publishable_local_online_store';
const photoIds = ['photo-1553062407-98eeb64c6a62','photo-1600210492486-724fe5c67fb0','photo-1608571423902-eed4a5ad8108','photo-1447933601403-0c6688de566e','photo-1548036328-c9fa89d128fa','photo-1544367567-0f2fcb009e0b'];

export async function startOnlineStoreLocal({ port = 55321, database } = {}) {
  const fixture = database ?? await createOnlineStoreDatabase();
  if (!database) { try { await seedOnlineStore(fixture.db); } catch (error) { await fixture.dispose(); throw error; } }
  const secret = randomBytes(32);
  const pending = new Map(), sessions = new Map(), images = new Map();
  const audit = [];
  const user = { id: fixtureUser, aud: 'authenticated', role: 'authenticated', email: fixtureEmail,
    email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Cuenta de prueba' }, created_at: new Date().toISOString() };
  function sign(claims) {
    const payload = Buffer.from(JSON.stringify({ ...claims, aud: 'authenticated', role: 'authenticated', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
    const input = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url') + '.' + payload;
    return input + '.' + createHmac('sha256',secret).update(input).digest('base64url');
  }
  function session() {
    const refresh = randomBytes(32).toString('hex');
    sessions.set(refresh, true);
    return { access_token: sign({ sub: fixtureUser, session_id: refresh }), refresh_token: refresh,
      token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user };
  }
  function authenticate(req) {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const expected = createHmac('sha256',secret).update(parts[0]+'.'+parts[1]).digest();
    const actual = Buffer.from(parts[2], 'base64url');
    if (expected.length !== actual.length || !timingSafeEqual(expected,actual)) return null;
    const claims = JSON.parse(Buffer.from(parts[1],'base64url'));
    return claims.sub === fixtureUser && claims.exp > Date.now()/1000 && sessions.has(claims.session_id) ? claims : null;
  }
  const rpc = {
    get_online_store_catalog: ['SELECT public.get_online_store_catalog($1) AS value', b => [b.p_country_code ?? 'AR'], true],
    get_reward_detail_with_availability: ['SELECT public.get_reward_detail_with_availability($1) AS value', b => [b.p_reward_id]],
    get_feature_flags_for_current_user: ['SELECT coalesce(jsonb_agg(t),\'[]\'::jsonb) AS value FROM public.get_feature_flags_for_current_user() t', () => []],
    get_my_activity_snapshot_v2: ['SELECT public.get_my_activity_snapshot_v2() AS value', () => []],
    get_my_activity_snapshot: ['SELECT public.get_my_activity_snapshot_v2() AS value', () => []],
    get_my_expiring_pasitos: ['SELECT coalesce(jsonb_agg(t),\'[]\'::jsonb) AS value FROM public.get_my_expiring_pasitos() t', () => []],
    get_my_referral_bonus_credits: ['SELECT public.get_my_referral_bonus_credits($1) AS value', b => [b.p_limit ?? 50]],
    get_my_step_boost_credits: ['SELECT coalesce(jsonb_agg(t),\'[]\'::jsonb) AS value FROM public.get_my_step_boost_credits($1) t', b => [b.p_limit ?? 50]],
  };
  function send(res, status, value, type = 'application/json') {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(type === 'application/json' ? JSON.stringify(value) : value);
  }
  const server = createServer(async (req,res) => {
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):(54321|55321)$/.test(origin)) return send(res,403,{error:'Local origins only'});
    if (origin) res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','authorization, apikey, content-type, x-client-info, x-supabase-api-version');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const url = new URL(req.url,'http://127.0.0.1');
    try {
      if (url.pathname === '/__test/mailbox') return send(res,200,`<!doctype html><html lang="es"><meta charset="utf-8"><title>Bandeja local · Pasito</title><body style="font:18px system-ui;padding:48px;max-width:700px"><h1>Bandeja de prueba</h1><p>Cuenta: ${fixtureEmail}</p><p>Solo simula entrega y validación OTP. No envía correos reales.</p>${[...pending.entries()].map(([email,p])=>`<p>${email} · Código: <strong>${p.code}</strong> · vence en 5 minutos</p>`).join('') || '<p>Solicitá un código desde la web.</p>'}<a href="/\x5f_test/mailbox">Actualizar</a></body></html>`,'text/html; charset=utf-8');
      if (url.pathname === '/__test/evidence') return send(res,200,{ audit, state: (await fixture.db.query(`SELECT pasitos_balance AS balance, (SELECT count(*)::int FROM public.coupons WHERE user_id=$1) AS coupons, (SELECT count(*)::int FROM public.reward_external_codes WHERE assigned_user_id=$1) AS assigned_codes FROM public.profiles WHERE id=$1`, [fixtureUser])).rows[0] });
      if (url.pathname.startsWith('/__test/product/')) {
        const index = Number(url.pathname.match(/\/(\d+)\.jpg$/)?.[1])-1;
        if (!photoIds[index]) return send(res,404,{});
        if (!images.has(index)) {
          const image = await fetch('https://images.unsplash.com/'+photoIds[index]+'?auto=format&fit=crop&w=800&q=85');
          if (!image.ok) throw Error('Test image unavailable');
          images.set(index, Buffer.from(await image.arrayBuffer()));
        }
        return send(res,200,images.get(index),'image/jpeg');
      }
      if (url.pathname.startsWith('/__test/shop/')) return send(res,200,'<!doctype html><html lang="es"><meta charset="utf-8"><title>Tienda ficticia</title><body style="font:20px system-ui;padding:48px"><h1>Tienda de prueba</h1><p>El enlace de compra funciona. No se realizan compras ni pagos reales.</p></body></html>','text/html; charset=utf-8');
      if (req.headers.apikey !== localAnonKey) return send(res,401,{message:'Invalid local API key'});
      const auth = authenticate(req);
      let body = {};
      if (req.method === 'POST') {
        let data=''; for await (const chunk of req) { data += chunk; if (data.length>16384) return send(res,413,{}); }
        body = data ? JSON.parse(data) : {};
      }
      if (url.pathname === '/auth/v1/otp' && req.method === 'POST') {
        if (body.email !== fixtureEmail) return send(res,400,{msg:'Use the local test account'});
        pending.set(body.email,{code:String(randomInt(100000,1000000)), expires:Date.now()+300000, attempts:0});
        audit.push('otp_requested'); return send(res,200,{});
      }
      if (url.pathname === '/auth/v1/verify' && req.method === 'POST') {
        const attempt = pending.get(body.email);
        if (!attempt || attempt.expires<Date.now() || ++attempt.attempts>5 || attempt.code !== body.token || body.type !== 'email') {
          audit.push('otp_rejected'); return send(res,403,{code:'otp_expired',msg:'Token has expired or is invalid'});
        }
        pending.delete(body.email); audit.push('otp_verified'); return send(res,200,session());
      }
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
        if (!sessions.delete(body.refresh_token)) return send(res,401,{msg:'Invalid refresh token'});
        return send(res,200,session());
      }
      if (url.pathname === '/auth/v1/user') return send(res,auth?200:401,auth?user:{msg:'Unauthorized'});
      if (url.pathname === '/auth/v1/logout') {
        if (auth) sessions.delete(auth.session_id);
        audit.push('signed_out'); return send(res,204,'','text/plain');
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const name = url.pathname.split('/').at(-1), spec = rpc[name];
        if (!spec) return send(res,404,{code:'PGRST202',message:'RPC not available in the local harness'});
        if (!spec[2] && !auth) return send(res,401,{message:'Unauthorized'});
        const result = await queryAs(fixture.pg,auth?'authenticated':'anon',auth?.sub,spec[0],spec[1](body));
        audit.push(name); return send(res,200,result.rows[0].value);
      }
      if (!auth) return send(res,401,{message:'Unauthorized'});
      if (url.pathname === '/rest/v1/daily_activity') {
        if (url.searchParams.get('user_id') !== 'eq.'+auth.sub) return send(res,403,{message:'Own activity only'});
        const limit = Math.min(360, Math.max(1, Number(url.searchParams.get('limit')) || 30));
        const rows = await queryAs(fixture.pg,'authenticated',auth.sub,'SELECT date::text,raw_steps,validated_steps,pasitos_earned FROM public.daily_activity WHERE user_id=$1 ORDER BY date DESC LIMIT $2',[auth.sub,limit]);
        return send(res,200,rows.rows);
      }
      if (url.pathname === '/rest/v1/profiles') {
        if (url.searchParams.get('id') !== 'eq.'+fixtureUser) return send(res,403,{message:'Own profile only'});
        const rows = await queryAs(fixture.pg,'authenticated',auth.sub,`SELECT display_name,avatar_url,pasitos_balance,age,birthdate,country_code,province,city,barrio,daily_goal_steps,interests,profile_completed,total_pasitos_earned,current_streak,best_streak,created_at,hide_from_leaderboard FROM public.profiles WHERE id=$1`, [auth.sub]);
        return send(res,200,req.headers.accept?.includes('application/vnd.pgrst.object+json') ? rows.rows[0] : rows.rows);
      }
      if (url.pathname === '/rest/v1/coupons') {
        // The snapshot RPC serves history. This narrow query supports pending
        // badges/cooldown probes without exposing another customer's coupons.
        const rows = await queryAs(fixture.pg,'authenticated',auth.sub,`SELECT c.id,c.status,c.created_at,c.used_at,c.partner_id,c.pasitos_spent,c.external_redemption_code,
          jsonb_build_object('title',r.title,'kind',r.kind,'type',r.type,'redemption_url',r.redemption_url,'redemption_instructions',r.redemption_instructions) AS reward,
          jsonb_build_object('name',p.name,'logo_url',p.logo_url,'address',p.address) AS partner
          FROM public.coupons c JOIN public.rewards r ON r.id=c.reward_id JOIN public.partners p ON p.id=c.partner_id
          WHERE c.user_id=$1 AND c.status=$2 ORDER BY c.created_at DESC LIMIT 50`, [auth.sub,url.searchParams.get('status')?.replace(/^eq\./,'') ?? 'used']);
        return send(res,200,rows.rows);
      }
      if (url.pathname === '/functions/v1/redeem-external-code' && req.method === 'POST') {
        if (!/^[0-9a-f-]{36}$/i.test(body.reward_id ?? '') || typeof body.idempotency_key !== 'string' || !body.idempotency_key.trim() || body.idempotency_key.length>128) return send(res,400,{error:'Invalid redemption request'});
        const result = await queryAs(fixture.pg,'service_role',auth.sub,'SELECT public.redeem_external_code_tx($1,$2,NULL,$3,$4) AS value',[auth.sub,body.reward_id,body.idempotency_key,body.branch_id ?? null]);
        audit.push('redeemed_external_code'); return send(res,200,result.rows[0].value);
      }
      return send(res,404,{message:'Not implemented in local harness'});
    } catch(error) {
      audit.push('error:'+url.pathname+':'+error.message);
      return send(res,400,{error:error.message,message:error.message});
    }
  });
  await new Promise(r=>server.listen(port,'127.0.0.1',r));
  return { server, fixture, pending, url:'http://127.0.0.1:'+server.address().port,
    async close() { await new Promise(r=>server.close(r)); if (!database) await fixture.dispose(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const local = await startOnlineStoreLocal();
  console.log('Entorno local: '+local.url+' · '+fixtureEmail+' · 5000 Pasitos ficticios');
  console.log('Bandeja OTP: '+local.url+'/__test/mailbox');
  console.log('Autenticación OTP simulada; transacciones y permisos de PostgreSQL reales.');
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await local.close(); process.exit(0);});
}
