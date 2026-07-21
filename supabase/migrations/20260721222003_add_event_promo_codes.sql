-- Limited-use promo codes for event ticket checkout. A use is counted only
-- after the payment is confirmed; unpaid holds reserve capacity for 5 minutes.
begin;

create table public.event_promo_codes (
  event_slug text not null,
  code text not null,
  discount_percent smallint not null check (discount_percent between 1 and 100),
  max_redemptions integer not null check (max_redemptions > 0),
  redemptions_used integer not null default 0 check (redemptions_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_slug, code),
  check (code = upper(btrim(code)) and code ~ '^[A-Z0-9_-]{3,40}$')
);

alter table public.event_promo_codes enable row level security;

revoke all on table public.event_promo_codes from public, anon, authenticated;
grant select, insert, update, delete on table public.event_promo_codes to service_role;

alter table public.event_checkout_intents
  add column subtotal_amount integer,
  add column promo_code text,
  add column discount_percent smallint,
  add column discount_amount integer not null default 0;

update public.event_checkout_intents
   set subtotal_amount = amount;

alter table public.event_checkout_intents
  alter column subtotal_amount set not null,
  add constraint event_checkout_intents_subtotal_amount_check
    check (subtotal_amount > 0),
  add constraint event_checkout_intents_discount_percent_check
    check (discount_percent is null or discount_percent between 1 and 100),
  add constraint event_checkout_intents_discount_amount_check
    check (discount_amount >= 0 and amount = subtotal_amount - discount_amount),
  add constraint event_checkout_intents_promo_code_fkey
    foreign key (event_slug, promo_code)
    references public.event_promo_codes (event_slug, code),
  add constraint event_checkout_intents_promo_fields_check
    check (
      (promo_code is null and discount_percent is null and discount_amount = 0)
      or
      (promo_code is not null and discount_percent is not null and discount_amount > 0)
    );

create index event_checkout_intents_active_promo_idx
  on public.event_checkout_intents (event_slug, promo_code, status, expires_at)
  where promo_code is not null;

insert into public.event_promo_codes (
  event_slug, code, discount_percent, max_redemptions
) values
  ('pasito-tomate-2026', 'PASEVE15', 15, 30),
  ('pasito-tomate-2026', 'PASTEV10', 10, 30)
on conflict (event_slug, code) do update
set discount_percent = excluded.discount_percent,
    max_redemptions = excluded.max_redemptions,
    is_active = true,
    updated_at = now();

create or replace function public.event_count_confirmed_promo_redemption()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'confirmed'
     and old.status is distinct from 'confirmed'
     and new.promo_code is not null then
    update public.event_promo_codes
       set redemptions_used = redemptions_used + 1,
           updated_at = now()
     where event_slug = new.event_slug
       and code = new.promo_code;
  end if;
  return new;
end;
$$;

revoke all on function public.event_count_confirmed_promo_redemption()
  from public, anon, authenticated;

create trigger event_checkout_intent_count_promo
after update of status on public.event_checkout_intents
for each row execute function public.event_count_confirmed_promo_redemption();

create or replace function public.event_reserve_tickets(
  p_event_slug text,
  p_quantity integer,
  p_client_key_hash text,
  p_client_ip_hash text,
  p_promo_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_expires_at timestamptz := now() + interval '5 minutes';
  v_intent_id uuid;
  v_tier record;
  v_promo public.event_promo_codes%rowtype;
  v_promo_code text := nullif(upper(btrim(coalesce(p_promo_code, ''))), '');
  v_promo_held integer := 0;
  v_reserved integer;
  v_available integer;
  v_allocate integer;
  v_remaining integer := p_quantity;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_amount integer := 0;
  v_sequence integer := 0;
  v_i integer;
  v_ip_held integer;
  v_breakdown jsonb := '[]'::jsonb;
begin
  if p_event_slug is null or p_event_slug = ''
     or p_quantity is null or p_quantity < 1 or p_quantity > 6
     or p_client_key_hash !~ '^[a-f0-9]{64}$'
     or p_client_ip_hash !~ '^[a-f0-9]{64}$'
     or (v_promo_code is not null and v_promo_code !~ '^[A-Z0-9_-]{3,40}$') then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- The tier lock serializes inventory cleanup and allocation for the event.
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

  if v_promo_code is not null then
    select p.* into v_promo
      from public.event_promo_codes p
     where p.event_slug = p_event_slug
       and p.code = v_promo_code
       and p.is_active
     for update;
    if not found then
      return jsonb_build_object('status', 'promo_invalid');
    end if;

    select count(*)::integer into v_promo_held
      from public.event_checkout_intents i
     where i.event_slug = p_event_slug
       and i.promo_code = v_promo_code
       and i.status = 'held'
       and i.expires_at > v_now;

    if v_promo.redemptions_used + v_promo_held >= v_promo.max_redemptions then
      return jsonb_build_object('status', 'promo_exhausted');
    end if;
  end if;

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

    select count(*)::integer into v_reserved
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
      v_subtotal := v_subtotal + (v_allocate * v_tier.unit_price);
      v_remaining := v_remaining - v_allocate;
    end if;
  end loop;

  if v_remaining > 0 then
    return jsonb_build_object('status', 'sold_out');
  end if;

  if v_promo_code is not null then
    v_discount := round(v_subtotal * v_promo.discount_percent / 100.0)::integer;
  end if;
  v_amount := v_subtotal - v_discount;

  insert into public.event_checkout_intents (
    event_slug, quantity, subtotal_amount, discount_amount, amount, currency, status,
    promo_code, discount_percent, client_key_hash, client_ip_hash, expires_at
  ) values (
    p_event_slug, p_quantity, v_subtotal, v_discount, v_amount, 'ARS', 'held',
    v_promo_code, v_promo.discount_percent, p_client_key_hash, p_client_ip_hash, v_expires_at
  ) returning id into v_intent_id;

  for v_tier in select item from jsonb_array_elements(v_breakdown) as item
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
    'subtotalAmount', v_subtotal,
    'discountAmount', v_discount,
    'amount', v_amount,
    'currency', 'ARS',
    'promoCode', v_promo_code,
    'discountPercent', v_promo.discount_percent,
    'expiresAt', v_expires_at,
    'breakdown', v_breakdown
  );
end;
$$;

revoke all on function public.event_reserve_tickets(text, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.event_reserve_tickets(text, integer, text, text, text)
  to service_role;

drop function public.event_reserve_tickets(text, integer, text, text);

commit;
