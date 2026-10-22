-- Eventos Pasito (eventos.pasito.app): gestión interna de eventos e iniciativas.
-- Todas las tablas son solo service-role (RLS activo sin policies); el acceso
-- pasa siempre por las rutas /api/gestion del sitio.

create table if not exists public.gestion_users (
  email text primary key,
  name text,
  role text not null default 'equipo' check (role in ('admin', 'equipo', 'lectura')),
  phone text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.gestion_login_tokens (
  token_hash text primary key,
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.gestion_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'otro',
  status text not null default 'idea'
    check (status in ('idea', 'planificacion', 'confirmado', 'produccion', 'realizado', 'cerrado', 'cancelado')),
  start_date date,
  start_time text,
  end_date date,
  venue text,
  city text,
  capacity integer,
  owner_email text,
  drive_url text,
  objective text,
  notes text,
  pasito_event_ids uuid[] not null default '{}',
  door_allow_walkins boolean not null default false,
  door_allow_reentry boolean not null default false,
  archived_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Filas de cada sección (presupuesto, sponsors, proveedores, tareas, equipo,
-- aprendizajes, checklist, kpis, contactos, permisos). Una sola tabla con
-- `kind` + `data` jsonb: el esquema de cada sección vive en el código.
create table if not exists public.gestion_rows (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gestion_events (id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  position double precision not null default 0,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists gestion_rows_event_kind_idx on public.gestion_rows (event_id, kind) where deleted_at is null;
create index if not exists gestion_rows_task_owner_idx on public.gestion_rows ((data ->> 'owner')) where kind = 'task' and deleted_at is null;

create table if not exists public.gestion_activity (
  id bigint generated always as identity primary key,
  event_id uuid references public.gestion_events (id) on delete cascade,
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  summary text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists gestion_activity_event_idx on public.gestion_activity (event_id, created_at desc);

create table if not exists public.gestion_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gestion_events (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  dni_last3 text,
  kind text not null default 'general' check (kind in ('general', 'invitado', 'prensa', 'sponsor', 'staff')),
  origin text not null default 'manual' check (origin in ('app', 'ticketera', 'invitado', 'staff', 'puerta', 'manual')),
  origin_ref text,
  companions integer not null default 0 check (companions between 0 and 20),
  companions_in integer not null default 0,
  notes text,
  qr_token text not null unique,
  status text not null default 'anotado' check (status in ('anotado', 'ingreso', 'salio')),
  checked_in_at timestamptz,
  checked_in_device text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index if not exists gestion_attendees_origin_ref_key
  on public.gestion_attendees (event_id, origin, origin_ref) where origin_ref is not null;
create index if not exists gestion_attendees_event_idx on public.gestion_attendees (event_id) where deleted_at is null;

create table if not exists public.gestion_door_pins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gestion_events (id) on delete cascade,
  label text not null,
  pin_hash text not null,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revoked_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists gestion_door_pins_event_idx on public.gestion_door_pins (event_id);

-- Cada check-in lleva un id generado en el celular: reintentos offline no duplican.
create table if not exists public.gestion_checkins (
  id uuid primary key,
  event_id uuid not null references public.gestion_events (id) on delete cascade,
  attendee_id uuid references public.gestion_attendees (id) on delete cascade,
  action text not null check (action in ('ingreso', 'salida', 'acompanante', 'alta')),
  scanned_at timestamptz not null,
  synced_at timestamptz not null default now(),
  device text,
  door_pin_id uuid references public.gestion_door_pins (id) on delete set null,
  operator text,
  duplicate boolean not null default false
);
create index if not exists gestion_checkins_event_idx on public.gestion_checkins (event_id, scanned_at);

alter table public.gestion_users enable row level security;
alter table public.gestion_login_tokens enable row level security;
alter table public.gestion_events enable row level security;
alter table public.gestion_rows enable row level security;
alter table public.gestion_activity enable row level security;
alter table public.gestion_attendees enable row level security;
alter table public.gestion_door_pins enable row level security;
alter table public.gestion_checkins enable row level security;

-- Check-in atómico: el primero que sincroniza gana; los demás quedan como duplicados.
create or replace function public.gestion_apply_checkin(
  p_id uuid,
  p_event_id uuid,
  p_attendee_id uuid,
  p_action text,
  p_scanned_at timestamptz,
  p_device text,
  p_door_pin_id uuid,
  p_operator text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_att public.gestion_attendees;
  v_dup boolean := false;
  v_existing public.gestion_checkins;
begin
  select * into v_existing from public.gestion_checkins where id = p_id;
  if found then
    return jsonb_build_object('status', case when v_existing.duplicate then 'duplicate' else 'ok' end, 'idempotent', true);
  end if;

  select * into v_att from public.gestion_attendees
    where id = p_attendee_id and event_id = p_event_id and deleted_at is null
    for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if p_action = 'ingreso' then
    if v_att.status = 'ingreso' then
      v_dup := true;
    else
      update public.gestion_attendees
        set status = 'ingreso', checked_in_at = coalesce(checked_in_at, p_scanned_at),
            checked_in_device = p_device, updated_at = now()
        where id = v_att.id;
    end if;
  elsif p_action = 'salida' then
    update public.gestion_attendees set status = 'salio', updated_at = now() where id = v_att.id;
  elsif p_action = 'acompanante' then
    if v_att.companions_in >= v_att.companions then
      v_dup := true;
    else
      update public.gestion_attendees set companions_in = companions_in + 1, updated_at = now() where id = v_att.id;
    end if;
  end if;

  insert into public.gestion_checkins (id, event_id, attendee_id, action, scanned_at, device, door_pin_id, operator, duplicate)
    values (p_id, p_event_id, p_attendee_id, p_action, p_scanned_at, p_device, p_door_pin_id, p_operator, v_dup);

  return jsonb_build_object('status', case when v_dup then 'duplicate' else 'ok' end,
    'checked_in_at', (select checked_in_at from public.gestion_attendees where id = v_att.id));
end;
$$;

revoke all on function public.gestion_apply_checkin(uuid, uuid, uuid, text, timestamptz, text, uuid, text) from public, anon, authenticated;

insert into public.gestion_users (email, name, role)
  values ('santiago@pasito.app', 'Santiago', 'admin')
  on conflict (email) do nothing;
