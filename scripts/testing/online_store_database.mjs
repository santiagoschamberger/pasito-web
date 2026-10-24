// Disposable PostgreSQL with the production schema; never connects remotely.
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';

const platform = `
  CREATE ROLE anon NOLOGIN NOINHERIT; CREATE ROLE authenticated NOLOGIN NOINHERIT;
  CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; CREATE ROLE authenticator LOGIN NOINHERIT;
  CREATE ROLE supabase_auth_admin NOLOGIN; CREATE ROLE supabase_storage_admin NOLOGIN;
  GRANT anon, authenticated, service_role TO authenticator;
  CREATE SCHEMA extensions; CREATE SCHEMA auth; CREATE SCHEMA storage;
  CREATE SCHEMA cron; CREATE SCHEMA net; CREATE SCHEMA vault;
  CREATE PUBLICATION supabase_realtime;
  CREATE TABLE cron.job(jobid bigserial PRIMARY KEY, jobname text UNIQUE, schedule text NOT NULL,
    command text NOT NULL, active boolean NOT NULL DEFAULT true);
  CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint
    LANGUAGE sql AS $$ INSERT INTO cron.job(jobname, schedule, command) VALUES ($1, $2, $3)
      ON CONFLICT (jobname) DO UPDATE SET schedule = EXCLUDED.schedule, command = EXCLUDED.command
      RETURNING jobid $$;
  CREATE FUNCTION cron.alter_job(job_id bigint, schedule text DEFAULT NULL, command text DEFAULT NULL,
    database text DEFAULT NULL, username text DEFAULT NULL, active boolean DEFAULT NULL) RETURNS void
    LANGUAGE sql AS $$ UPDATE cron.job SET active = coalesce($6, active) WHERE jobid = $1 $$;
  GRANT USAGE ON SCHEMA public, extensions, auth, storage TO anon, authenticated, service_role;
  CREATE TABLE auth.users(
    instance_id uuid, id uuid PRIMARY KEY, aud text, role text, email text,
    encrypted_password text, email_confirmed_at timestamptz, phone text,
    last_sign_in_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    is_anonymous boolean NOT NULL DEFAULT false, is_sso_user boolean NOT NULL DEFAULT false,
    banned_until timestamptz, created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(), deleted_at timestamptz);
  -- GoTrue writes auth.users as its owner, so triggers run with that role.
  GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;
  ALTER TABLE auth.users OWNER TO supabase_auth_admin;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claim', true), ''),
      nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
  CREATE TABLE storage.buckets(
    id text PRIMARY KEY, name text NOT NULL UNIQUE, owner uuid, public boolean DEFAULT false,
    file_size_limit bigint, allowed_mime_types text[],
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
  CREATE TABLE storage.objects(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id),
    name text, owner uuid, metadata jsonb, created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(), UNIQUE(bucket_id, name));
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated, service_role;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE _parts text[]; BEGIN
      SELECT string_to_array(name, '/') INTO _parts;
      RETURN _parts[1:array_length(_parts, 1) - 1];
    END $$;
  CREATE FUNCTION storage.operation() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT current_setting('storage.operation', true) $$;
  CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE AS $$
    WITH current_operation AS (SELECT storage.operation() AS raw_operation),
    normalized AS (
      SELECT CASE WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation END AS current_operation FROM current_operation)
    SELECT EXISTS (
      SELECT 1 FROM normalized n CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
      WHERE expected_operation IS NOT NULL AND expected_operation <> ''
        AND n.current_operation = CASE WHEN expected_operation LIKE 'storage.%'
          THEN substr(expected_operation, 9) ELSE expected_operation END) $$;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA storage TO anon, authenticated, service_role;`;


export async function createOnlineStoreDatabase() {
  const backendRoot = process.env.PASITO_BACKEND_ROOT;
  if (!backendRoot) throw new Error('Set PASITO_BACKEND_ROOT to the private pasito checkout containing the production SQL baseline.');
  const runtime = process.env.PASITO_PG_RUNTIME ?? 'scripts/testing/online-store-runtime/node_modules/embedded-postgres/dist/index.js';
  const { default: EmbeddedPostgres } = await import(pathToFileURL(resolve(runtime)));
  const root = resolve('build');
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, 'online-store-local-'));
  const socket = createServer();
  await new Promise(r => socket.listen(0, '127.0.0.1', r));
  const port = socket.address().port;
  await new Promise(r => socket.close(r));
  const pg = new EmbeddedPostgres({ databaseDir: directory, port, user: 'postgres', password: 'local-fixture-only', persistent: true, initdbFlags: ['--encoding=UTF8'], postgresFlags: ['-h', '127.0.0.1'], onLog() {}, onError() {} });
  await pg.initialise();
  await pg.start();
  const db = pg.getPgClient();
  await db.connect();
  try {
    await db.query(platform);
    await db.query(await readFile(resolve(backendRoot, 'supabase/roles.sql'), 'utf8'));
    let baseline = await readFile(resolve(backendRoot, 'supabase/migrations/20261021050000_prod_baseline.sql'), 'utf8');
    for (const extension of ['pg_cron', 'pg_net', 'supabase_vault']) {
      baseline = baseline.replace(new RegExp('CREATE EXTENSION IF NOT EXISTS "' + extension + '" WITH SCHEMA "[^";]+";'), '');
    }
    await db.query(baseline);
    await db.query('RESET ALL');
    await db.query(await readFile('supabase/migrations/20261023182250_online_store_public_catalog.sql', 'utf8'));
  } catch (error) {
    await db.end(); await pg.stop(); await rm(directory, { recursive: true, force: true }); throw error;
  }
  return { db, pg, async dispose() { await db.end(); await pg.stop(); await rm(directory, { recursive: true, force: true }); } };
}

export const fixtureUser = '10000000-0000-4000-8000-000000000001';
export const fixtureEmail = 'compras@pasito.test';
export const fixtureReward = '30000000-0000-4000-8000-000000000001';

export async function seedOnlineStore(db) {
  await db.query(`
    INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES
      ('${fixtureUser}', '${fixtureEmail}', '{"full_name":"Cuenta de prueba"}');
    UPDATE public.profiles SET profile_completed = true, country_code = 'AR',
      birthdate = '1995-01-01', age = 31, daily_goal_steps = 6000 WHERE id = '${fixtureUser}';
    SELECT public.increment_pasitos('${fixtureUser}', 5000);
    INSERT INTO public.daily_activity(user_id,date,pasitos_earned,validated_steps) VALUES ('${fixtureUser}',current_date,5000,500000);
    UPDATE public.feature_flags SET enabled = true, rollout_percentage = 100
      WHERE flag_key IN ('external_code_rewards_enabled', 'pending_confirmation_enabled');
  `);
  const stores = [
    ['Nómada', '20% OFF en tu próxima aventura', 'deportes', 600, '🎒'],
    ['Casa calma', '25% OFF para renovar tu espacio', 'hogar', 450, '🪴'],
    ['Botánica', '30% OFF en cuidado personal', 'belleza', 350, '🧴'],
    ['Ritual café', '15% OFF en café de especialidad', 'cafe', 250, '☕'],
    ['Modo estudio', '20% OFF en accesorios', 'moda', 500, '👜'],
    ['Buena energía', '25% OFF en tu kit de bienestar', 'bienestar', 400, '🌿'],
  ];
  for (let i = 0; i < stores.length; i++) {
    const [name, title, category, cost, emoji] = stores[i];
    const partner = '20000000-0000-4000-8000-' + String(i + 1).padStart(12, '0');
    const reward = '30000000-0000-4000-8000-' + String(i + 1).padStart(12, '0');
    const url = 'http://127.0.0.1:55321/__test/shop/' + (i + 1);
    await db.query(`INSERT INTO public.partners(id, name, slug, category, categories, pin_code, approval_status,
      fulfillment_type, country_code, plan_code, billing_status, online_store_url, skip_cooldown, address)
      VALUES($1,$2,$3,$4,ARRAY[$4], $6,'approved','virtual','AR','ventas','active',$5,false,'Tienda online de prueba')`,
      [partner, name, 'local-store-' + i, category, url, String(1000 + i)]);
    await db.query(`INSERT INTO public.rewards(id, partner_id, title, description, pasitos_cost,
      category, kind, redemption_mode, redemption_url, redemption_instructions, conditions, emoji,
      remaining_stock, total_stock, daily_limit, display_order, image_url)
      VALUES($1,$2,$3,'Beneficio ficticio para validar el canje de principio a fin.', $4,$5,'web',
      'external_code',$6,'Copiá tu código y aplicalo en el checkout de la tienda de prueba.',
      'Solo para pruebas locales. No válido para compras reales.', $7,3,3,25,$8,$9)`,
      [reward, partner, title, cost, category, url, emoji, i, 'http://127.0.0.1:55321/__test/product/' + (i + 1) + '.jpg']);
    for (let j = 1; j <= 3; j++) await db.query(`INSERT INTO public.reward_external_codes(reward_id, partner_id, code)
      VALUES($1,$2,$3)`, [reward, partner, 'PRUEBA-' + (i + 1) + '-' + j]);
    await db.query('UPDATE public.partners SET is_active = true, logo_url = $2 WHERE id = $1', [partner, 'http://127.0.0.1:54321/test-stores/' + (i + 1) + '.svg']);
  }
}

export async function queryAs(pg, role, userId, sql, params = []) {
  const client = pg.getPgClient();
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ role, sub: userId })]);
    if (!['anon', 'authenticated', 'service_role'].includes(role)) throw Error('Invalid local role');
    await client.query('SET LOCAL ROLE ' + role);
    const result = await client.query(sql, params);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
