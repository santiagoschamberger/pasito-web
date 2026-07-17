-- Pasito Walking Club x TOMATE: checkout reservations, paid orders, tickets
-- and atomic check-in. All tables are private to service_role; public access
-- goes exclusively through the server routes in this repository.

create table public.event_ticket_tiers (
  id bigint generated always as identity primary key,
  event_slug text not null,
  position smallint not null check (position > 0),
  name text not null,
  unit_price integer not null check (unit_price > 0),
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_slug, position)
);

create table public.event_checkout_intents (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  quantity smallint not null check (quantity between 1 and 6),
  amount integer not null check (amount > 0),
  currency text not null default 'ARS' check (currency = 'ARS'),
  status text not null default 'held' check (status in ('held', 'confirmed', 'cancelled', 'expired')),
  client_key_hash text not null check (char_length(client_key_hash) = 64),
  client_ip_hash text not null check (char_length(client_ip_hash) = 64),
  rebill_payment_id text unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_ticket_reservations (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.event_checkout_intents(id) on delete cascade,
  tier_id bigint not null references public.event_ticket_tiers(id),
  ticket_position smallint not null check (ticket_position > 0),
  unit_price integer not null check (unit_price > 0),
  status text not null default 'held' check (status in ('held', 'consumed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (intent_id, ticket_position)
);

create table public.event_ticket_orders (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  checkout_intent_id uuid not null unique references public.event_checkout_intents(id),
  rebill_payment_id text not null unique,
  customer_email text not null,
  customer_name text,
  quantity smallint not null check (quantity between 1 and 6),
  amount integer not null check (amount > 0),
  currency text not null default 'ARS' check (currency = 'ARS'),
  payment_status text not null default 'approved'
    check (payment_status in ('approved', 'refunded', 'cancelled', 'chargeback', 'disputed')),
  confirmation_email_sent_at timestamptz,
  confirmation_email_id text,
  recovery_email_claimed_at timestamptz,
  recovery_email_sent_at timestamptz,
  recovery_email_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.event_ticket_orders(id),
  reservation_id uuid not null unique references public.event_ticket_reservations(id),
  tier_id bigint not null references public.event_ticket_tiers(id),
  ticket_number smallint not null check (ticket_number > 0),
  short_code text not null unique check (short_code ~ '^[A-F0-9]{10}$'),
  status text not null default 'valid' check (status in ('valid', 'used', 'void')),
  checked_in_at timestamptz,
  checked_in_by text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, ticket_number)
);

create table public.event_ticket_checkins (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.event_tickets(id),
  outcome text not null check (outcome in ('admitted', 'already_used', 'void')),
  source text not null check (source in ('qr', 'code')),
  operator_id text not null,
  created_at timestamptz not null default now()
);

create table public.event_api_rate_limits (
  scope text not null,
  key_hash text not null check (char_length(key_hash) = 64),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  primary key (scope, key_hash)
);

create index event_checkout_intents_active_client_idx
  on public.event_checkout_intents (client_key_hash, expires_at)
  where status = 'held';
create index event_checkout_intents_active_ip_idx
  on public.event_checkout_intents (client_ip_hash, expires_at)
  where status = 'held';
create index event_ticket_reservations_inventory_idx
  on public.event_ticket_reservations (tier_id, status, expires_at);
create index event_ticket_reservations_intent_idx
  on public.event_ticket_reservations (intent_id);
create index event_ticket_orders_email_idx
  on public.event_ticket_orders (event_slug, lower(customer_email));
create index event_tickets_order_idx
  on public.event_tickets (order_id);
create index event_tickets_tier_idx
  on public.event_tickets (tier_id);
create index event_ticket_checkins_ticket_created_idx
  on public.event_ticket_checkins (ticket_id, created_at desc);

alter table public.event_ticket_tiers enable row level security;
alter table public.event_checkout_intents enable row level security;
alter table public.event_ticket_reservations enable row level security;
alter table public.event_ticket_orders enable row level security;
alter table public.event_tickets enable row level security;
alter table public.event_ticket_checkins enable row level security;
alter table public.event_api_rate_limits enable row level security;

insert into public.event_ticket_tiers (event_slug, position, name, unit_price, capacity)
values
  ('pasito-tomate-2026', 1, 'Primeras 100', 25000, 100),
  ('pasito-tomate-2026', 2, 'Siguientes 100', 35000, 100),
  ('pasito-tomate-2026', 3, 'Precio final', 45000, null)
on conflict (event_slug, position) do update
set name = excluded.name,
    unit_price = excluded.unit_price,
    capacity = excluded.capacity,
    is_active = true;

-- Serializes all reservations for one event by locking its tier rows in a
-- stable order. This makes the 100/100 price boundaries exact under load.
create or replace function public.event_reserve_tickets(
  p_event_slug text,
  p_quantity integer,
  p_client_key_hash text,
  p_client_ip_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_intent_id uuid;
  v_tier record;
  v_reserved integer;
  v_available integer;
  v_allocate integer;
  v_remaining integer := p_quantity;
  v_amount integer := 0;
  v_sequence integer := 0;
  v_i integer;
  v_ip_held integer;
  v_breakdown jsonb := '[]'::jsonb;
begin
  if p_event_slug is null or p_event_slug = ''
     or p_quantity is null or p_quantity < 1 or p_quantity > 6
     or p_client_key_hash !~ '^[a-f0-9]{64}$'
     or p_client_ip_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- The tier lock is the concurrency boundary for cleanup and allocation.
  perform t.id
    from public.event_ticket_tiers t
   where t.event_slug = p_event_slug and t.is_active
   order by t.position
   for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  update public.event_ticket_reservations r
     set status = 'released'
    from public.event_checkout_intents i
   where r.intent_id = i.id
     and i.event_slug = p_event_slug
     and r.status = 'held'
     and r.expires_at <= v_now;

  update public.event_checkout_intents i
     set status = 'expired', updated_at = v_now
   where i.event_slug = p_event_slug
     and i.status = 'held'
     and i.expires_at <= v_now;

  -- A browser can only own one active reservation. Starting again replaces it.
  update public.event_ticket_reservations r
     set status = 'released'
    from public.event_checkout_intents i
   where r.intent_id = i.id
     and i.event_slug = p_event_slug
     and i.client_key_hash = p_client_key_hash
     and i.status = 'held'
     and i.expires_at > v_now
     and r.status = 'held';

  update public.event_checkout_intents i
     set status = 'cancelled', updated_at = v_now
   where i.event_slug = p_event_slug
     and i.client_key_hash = p_client_key_hash
     and i.status = 'held'
     and i.expires_at > v_now;

  select coalesce(sum(i.quantity), 0)::integer
    into v_ip_held
    from public.event_checkout_intents i
   where i.event_slug = p_event_slug
     and i.client_ip_hash = p_client_ip_hash
     and i.status = 'held'
     and i.expires_at > v_now;

  if v_ip_held + p_quantity > 24 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  for v_tier in
    select t.id, t.position, t.name, t.unit_price, t.capacity
      from public.event_ticket_tiers t
     where t.event_slug = p_event_slug and t.is_active
     order by t.position
  loop
    exit when v_remaining = 0;

    select count(*)::integer
      into v_reserved
      from public.event_ticket_reservations r
     where r.tier_id = v_tier.id
       and (r.status = 'consumed' or (r.status = 'held' and r.expires_at > v_now));

    if v_tier.capacity is null then
      v_allocate := v_remaining;
      v_available := null;
    else
      v_available := greatest(v_tier.capacity - v_reserved, 0);
      v_allocate := least(v_remaining, v_available);
    end if;

    if v_allocate > 0 then
      v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
        'tierId', v_tier.id,
        'position', v_tier.position,
        'name', v_tier.name,
        'unitPrice', v_tier.unit_price,
        'quantity', v_allocate
      ));
      v_amount := v_amount + (v_allocate * v_tier.unit_price);
      v_remaining := v_remaining - v_allocate;
    end if;
  end loop;

  if v_remaining > 0 then
    return jsonb_build_object('status', 'sold_out');
  end if;

  insert into public.event_checkout_intents (
    event_slug, quantity, amount, currency, status,
    client_key_hash, client_ip_hash, expires_at
  ) values (
    p_event_slug, p_quantity, v_amount, 'ARS', 'held',
    p_client_key_hash, p_client_ip_hash, v_expires_at
  ) returning id into v_intent_id;

  for v_tier in
    select item
      from jsonb_array_elements(v_breakdown) as item
  loop
    v_allocate := (v_tier.item ->> 'quantity')::integer;
    for v_i in 1..v_allocate loop
      v_sequence := v_sequence + 1;
      insert into public.event_ticket_reservations (
        intent_id, tier_id, ticket_position, unit_price, status, expires_at
      ) values (
        v_intent_id,
        (v_tier.item ->> 'tierId')::bigint,
        v_sequence,
        (v_tier.item ->> 'unitPrice')::integer,
        'held',
        v_expires_at
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'status', 'reserved',
    'intentId', v_intent_id,
    'quantity', p_quantity,
    'amount', v_amount,
    'currency', 'ARS',
    'expiresAt', v_expires_at,
    'breakdown', v_breakdown
  );
end;
$$;

create or replace function public.event_ticket_inventory(p_event_slug text)
returns table (
  tier_id bigint,
  tier_position smallint,
  tier_name text,
  unit_price integer,
  capacity integer,
  sold integer,
  held integer,
  available integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.position,
    t.name,
    t.unit_price,
    t.capacity,
    count(r.id) filter (where r.status = 'consumed')::integer as sold,
    count(r.id) filter (where r.status = 'held' and r.expires_at > now())::integer as held,
    case
      when t.capacity is null then null
      else greatest(
        t.capacity - count(r.id) filter (
          where r.status = 'consumed' or (r.status = 'held' and r.expires_at > now())
        ),
        0
      )::integer
    end as available
  from public.event_ticket_tiers t
  left join public.event_ticket_reservations r on r.tier_id = t.id
  where t.event_slug = p_event_slug and t.is_active
  group by t.id, t.position, t.name, t.unit_price, t.capacity
  order by t.position;
$$;

create or replace function public.event_cancel_ticket_reservation(p_intent_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select i.status into v_status
    from public.event_checkout_intents i
   where i.id = p_intent_id
   for update;
  if not found then
    return 'not_found';
  end if;
  if v_status = 'confirmed' then
    return 'confirmed';
  end if;

  update public.event_ticket_reservations
     set status = 'released'
   where intent_id = p_intent_id and status = 'held';
  update public.event_checkout_intents
     set status = 'cancelled', updated_at = now()
   where id = p_intent_id and status in ('held', 'expired');
  return 'cancelled';
end;
$$;

create or replace function public.event_consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.event_api_rate_limits%rowtype;
begin
  if p_scope is null or p_scope = '' or char_length(p_scope) > 80
     or p_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.event_api_rate_limits (scope, key_hash, window_started_at, attempts)
  values (p_scope, p_key_hash, now(), 0)
  on conflict (scope, key_hash) do nothing;

  select r.* into v_row
    from public.event_api_rate_limits r
   where r.scope = p_scope and r.key_hash = p_key_hash
   for update;

  if v_row.window_started_at <= now() - make_interval(secs => p_window_seconds) then
    update public.event_api_rate_limits
       set window_started_at = now(), attempts = 1
     where scope = p_scope and key_hash = p_key_hash;
    return true;
  end if;

  if v_row.attempts >= p_limit then
    return false;
  end if;

  update public.event_api_rate_limits
     set attempts = attempts + 1
   where scope = p_scope and key_hash = p_key_hash;
  return true;
end;
$$;

create or replace function public.event_confirm_ticket_order(
  p_intent_id uuid,
  p_payment_id text,
  p_amount integer,
  p_currency text,
  p_email text,
  p_customer_name text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.event_checkout_intents%rowtype;
  v_order_id uuid;
  v_existing_order_id uuid;
  v_reservation record;
  v_ticket_id uuid;
  v_code text;
  v_tickets jsonb := '[]'::jsonb;
  v_late boolean;
  v_count integer;
begin
  if p_payment_id is null or btrim(p_payment_id) = ''
     or p_email is null or position('@' in p_email) < 2 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select o.id into v_existing_order_id
    from public.event_ticket_orders o
   where o.rebill_payment_id = p_payment_id;
  if found then
    return jsonb_build_object('status', 'duplicate', 'orderId', v_existing_order_id);
  end if;

  select i.* into v_intent
    from public.event_checkout_intents i
   where i.id = p_intent_id
   for update;
  if not found then
    return jsonb_build_object('status', 'invalid_intent');
  end if;

  if v_intent.status = 'confirmed' then
    select o.id into v_existing_order_id
      from public.event_ticket_orders o
     where o.checkout_intent_id = p_intent_id;
    return jsonb_build_object('status', 'duplicate', 'orderId', v_existing_order_id);
  end if;

  if p_amount <> v_intent.amount or upper(p_currency) <> v_intent.currency then
    return jsonb_build_object('status', 'amount_mismatch');
  end if;

  select count(*)::integer into v_count
    from public.event_ticket_reservations r
   where r.intent_id = p_intent_id;
  if v_count <> v_intent.quantity then
    return jsonb_build_object('status', 'invalid_intent');
  end if;

  v_late := v_intent.status <> 'held' or v_intent.expires_at <= now();

  insert into public.event_ticket_orders (
    event_slug, checkout_intent_id, rebill_payment_id,
    customer_email, customer_name, quantity, amount, currency, payment_status
  ) values (
    v_intent.event_slug, v_intent.id, p_payment_id,
    lower(btrim(p_email)), nullif(btrim(p_customer_name), ''),
    v_intent.quantity, v_intent.amount, v_intent.currency, 'approved'
  ) returning id into v_order_id;

  update public.event_checkout_intents
     set status = 'confirmed', rebill_payment_id = p_payment_id, updated_at = now()
   where id = v_intent.id;

  update public.event_ticket_reservations
     set status = 'consumed'
   where intent_id = v_intent.id;

  for v_reservation in
    select r.id, r.tier_id, r.ticket_position
      from public.event_ticket_reservations r
     where r.intent_id = v_intent.id
     order by r.ticket_position
  loop
    loop
      v_code := upper(encode(extensions.gen_random_bytes(5), 'hex'));
      begin
        insert into public.event_tickets (
          order_id, reservation_id, tier_id, ticket_number, short_code, status
        ) values (
          v_order_id, v_reservation.id, v_reservation.tier_id,
          v_reservation.ticket_position, v_code, 'valid'
        ) returning id into v_ticket_id;
        exit;
      exception when unique_violation then
        -- A random-code collision is extraordinarily unlikely; retry safely.
      end;
    end loop;

    v_tickets := v_tickets || jsonb_build_array(jsonb_build_object(
      'id', v_ticket_id,
      'code', v_code,
      'number', v_reservation.ticket_position
    ));
  end loop;

  return jsonb_build_object(
    'status', 'confirmed',
    'orderId', v_order_id,
    'latePayment', v_late,
    'tickets', v_tickets
  );
exception
  when unique_violation then
    select o.id into v_existing_order_id
      from public.event_ticket_orders o
     where o.rebill_payment_id = p_payment_id;
    if found then
      return jsonb_build_object('status', 'duplicate', 'orderId', v_existing_order_id);
    end if;
    raise;
end;
$$;

create or replace function public.event_update_order_payment(
  p_payment_id text,
  p_payment_status text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  if p_payment_status not in ('approved', 'refunded', 'cancelled', 'chargeback', 'disputed') then
    return 'invalid';
  end if;

  select o.id into v_order_id
    from public.event_ticket_orders o
   where o.rebill_payment_id = p_payment_id
   for update;
  if not found then
    return 'not_found';
  end if;

  update public.event_ticket_orders
     set payment_status = p_payment_status, updated_at = now()
   where id = v_order_id;

  if p_payment_status = 'approved' then
    update public.event_tickets
       set status = case when checked_in_at is null then 'valid' else 'used' end,
           voided_at = null,
           updated_at = now()
     where order_id = v_order_id;
  else
    update public.event_tickets
       set status = 'void', voided_at = now(), updated_at = now()
     where order_id = v_order_id;
  end if;

  return 'updated';
end;
$$;

create or replace function public.event_redeem_ticket(
  p_event_slug text,
  p_ticket_id uuid,
  p_short_code text,
  p_operator_id text,
  p_source text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket_id uuid;
  v_ticket_status text;
  v_ticket_code text;
  v_ticket_number smallint;
  v_checked_in_at timestamptz;
  v_payment_status text;
  v_customer_name text;
  v_customer_email text;
  v_order_quantity smallint;
begin
  if (p_ticket_id is null and (p_short_code is null or p_short_code = ''))
     or p_operator_id is null or btrim(p_operator_id) = ''
     or p_source not in ('qr', 'code') then
    return jsonb_build_object('status', 'invalid');
  end if;

  select t.id, t.status, t.short_code, t.ticket_number, t.checked_in_at,
         o.payment_status, o.customer_name, o.customer_email, o.quantity
    into v_ticket_id, v_ticket_status, v_ticket_code, v_ticket_number, v_checked_in_at,
         v_payment_status, v_customer_name, v_customer_email, v_order_quantity
    from public.event_tickets t
    join public.event_ticket_orders o on o.id = t.order_id
   where o.event_slug = p_event_slug
     and ((p_ticket_id is not null and t.id = p_ticket_id)
       or (p_short_code is not null and t.short_code = upper(p_short_code)))
   order by case when p_ticket_id is not null and t.id = p_ticket_id then 0 else 1 end
   limit 1
   for update of t;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_payment_status <> 'approved' or v_ticket_status = 'void' then
    insert into public.event_ticket_checkins (ticket_id, outcome, source, operator_id)
    values (v_ticket_id, 'void', p_source, left(btrim(p_operator_id), 120));
    return jsonb_build_object(
      'status', 'void', 'code', v_ticket_code,
      'customerName', v_customer_name, 'ticketNumber', v_ticket_number,
      'orderQuantity', v_order_quantity
    );
  end if;

  if v_ticket_status = 'used' then
    insert into public.event_ticket_checkins (ticket_id, outcome, source, operator_id)
    values (v_ticket_id, 'already_used', p_source, left(btrim(p_operator_id), 120));
    return jsonb_build_object(
      'status', 'already_used', 'code', v_ticket_code,
      'customerName', v_customer_name, 'customerEmail', v_customer_email,
      'ticketNumber', v_ticket_number, 'orderQuantity', v_order_quantity,
      'checkedInAt', v_checked_in_at
    );
  end if;

  update public.event_tickets
     set status = 'used', checked_in_at = now(),
         checked_in_by = left(btrim(p_operator_id), 120), updated_at = now()
   where id = v_ticket_id
   returning checked_in_at into v_checked_in_at;

  insert into public.event_ticket_checkins (ticket_id, outcome, source, operator_id)
  values (v_ticket_id, 'admitted', p_source, left(btrim(p_operator_id), 120));

  return jsonb_build_object(
    'status', 'admitted', 'code', v_ticket_code,
    'customerName', v_customer_name, 'customerEmail', v_customer_email,
    'ticketNumber', v_ticket_number, 'orderQuantity', v_order_quantity,
    'checkedInAt', v_checked_in_at
  );
end;
$$;

create or replace function public.event_claim_ticket_recovery(
  p_event_slug text,
  p_email text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  v_order_count integer;
  v_last_claim timestamptz;
begin
  if v_email = '' or position('@' in v_email) < 2 then
    return jsonb_build_object('status', 'invalid');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_slug || ':' || v_email, 0));

  select count(*)::integer, max(o.recovery_email_claimed_at)
    into v_order_count, v_last_claim
    from public.event_ticket_orders o
   where o.event_slug = p_event_slug
     and lower(o.customer_email) = v_email
     and o.payment_status = 'approved';

  if v_order_count = 0 then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_last_claim is not null and v_last_claim > now() - interval '2 minutes' then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  update public.event_ticket_orders o
     set recovery_email_claimed_at = now(), updated_at = now()
   where o.event_slug = p_event_slug
     and lower(o.customer_email) = v_email
     and o.payment_status = 'approved';

  return jsonb_build_object('status', 'claimed', 'orderCount', v_order_count);
end;
$$;

-- Explicit grants are required for new projects that no longer expose new
-- tables to the Data API automatically. RLS remains enabled as defense in depth.
revoke all on table public.event_ticket_tiers from public, anon, authenticated;
revoke all on table public.event_checkout_intents from public, anon, authenticated;
revoke all on table public.event_ticket_reservations from public, anon, authenticated;
revoke all on table public.event_ticket_orders from public, anon, authenticated;
revoke all on table public.event_tickets from public, anon, authenticated;
revoke all on table public.event_ticket_checkins from public, anon, authenticated;
revoke all on table public.event_api_rate_limits from public, anon, authenticated;

grant select, insert, update, delete on table public.event_ticket_tiers to service_role;
grant select, insert, update, delete on table public.event_checkout_intents to service_role;
grant select, insert, update, delete on table public.event_ticket_reservations to service_role;
grant select, insert, update, delete on table public.event_ticket_orders to service_role;
grant select, insert, update, delete on table public.event_tickets to service_role;
grant select, insert, update, delete on table public.event_ticket_checkins to service_role;
grant select, insert, update, delete on table public.event_api_rate_limits to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke all on function public.event_reserve_tickets(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.event_ticket_inventory(text) from public, anon, authenticated;
revoke all on function public.event_cancel_ticket_reservation(uuid) from public, anon, authenticated;
revoke all on function public.event_consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.event_confirm_ticket_order(uuid, text, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.event_update_order_payment(text, text) from public, anon, authenticated;
revoke all on function public.event_redeem_ticket(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.event_claim_ticket_recovery(text, text) from public, anon, authenticated;

grant execute on function public.event_reserve_tickets(text, integer, text, text) to service_role;
grant execute on function public.event_ticket_inventory(text) to service_role;
grant execute on function public.event_cancel_ticket_reservation(uuid) to service_role;
grant execute on function public.event_consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.event_confirm_ticket_order(uuid, text, integer, text, text, text) to service_role;
grant execute on function public.event_update_order_payment(text, text) to service_role;
grant execute on function public.event_redeem_ticket(text, uuid, text, text, text) to service_role;
grant execute on function public.event_claim_ticket_recovery(text, text) to service_role;
