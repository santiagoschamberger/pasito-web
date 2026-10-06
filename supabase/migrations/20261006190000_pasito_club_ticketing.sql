-- Pasito Club 2026: per-date ticketing on top of the shared event_* tables.
-- Each Wednesday training is a tier with its own capacity, so a pack consumes
-- exactly one spot on each date the buyer picked. The Carrera Pasito Club is a
-- separate tier included (at $0) in packs of 4 or more.

-- A pack of 8 trainings plus the race is 9 tickets in a single order, and the
-- included race ticket is free. Other events keep their own 1–6 limit inside
-- their reservation functions.
alter table public.event_checkout_intents drop constraint event_checkout_intents_quantity_check;
alter table public.event_checkout_intents add constraint event_checkout_intents_quantity_check
  check (quantity >= 1 and quantity <= 12);
alter table public.event_ticket_orders drop constraint event_ticket_orders_quantity_check;
alter table public.event_ticket_orders add constraint event_ticket_orders_quantity_check
  check (quantity >= 1 and quantity <= 12);
alter table public.event_ticket_tiers drop constraint event_ticket_tiers_unit_price_check;
alter table public.event_ticket_tiers add constraint event_ticket_tiers_unit_price_check
  check (unit_price >= 0);
alter table public.event_ticket_reservations drop constraint event_ticket_reservations_unit_price_check;
alter table public.event_ticket_reservations add constraint event_ticket_reservations_unit_price_check
  check (unit_price >= 0);

insert into public.event_ticket_tiers (event_slug, position, name, unit_price, capacity) values
  ('pasito-club-2026', 1, 'Pasito Club #1 · Mié 14/10', 10000, 200),
  ('pasito-club-2026', 2, 'Pasito Club #2 · Mié 21/10', 10000, 200),
  ('pasito-club-2026', 3, 'Pasito Club #3 · Mié 28/10', 10000, 200),
  ('pasito-club-2026', 4, 'Pasito Club #4 · Mié 04/11', 10000, 200),
  ('pasito-club-2026', 5, 'Pasito Club #5 · Mié 11/11', 10000, 200),
  ('pasito-club-2026', 6, 'Pasito Club #6 · Mié 18/11', 10000, 200),
  ('pasito-club-2026', 7, 'Pasito Club #7 · Mié 25/11', 10000, 200),
  ('pasito-club-2026', 8, 'Pasito Club #8 · Mié 02/12', 10000, 200),
  ('pasito-club-2026', 9, 'Carrera Pasito Club · Dom 06/12', 0, null)
on conflict (event_slug, position) do nothing;

-- Contact captured before payment so the team can add buyers to the club's
-- WhatsApp group. Nothing is sent automatically from this data.
create table public.pasito_club_ticket_contacts (
  intent_id uuid primary key references public.event_checkout_intents(id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null check (phone ~ '^\+[0-9]{8,15}$'),
  pack_size smallint not null check (pack_size between 1 and 8),
  pricing_option text not null check (pricing_option in ('A', 'B')),
  includes_race boolean not null default false,
  whatsapp_added_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pasito_club_ticket_contacts enable row level security;
revoke all on public.pasito_club_ticket_contacts from anon, authenticated;

-- One row per paid order: who to add to the WhatsApp group and which dates
-- they bought. Mark people as added by setting whatsapp_added_at.
create view public.pasito_club_buyers
with (security_invoker = true) as
select
  o.id as order_id,
  o.created_at as paid_at,
  c.email,
  c.phone,
  o.customer_name,
  c.pack_size,
  c.includes_race,
  o.amount,
  o.payment_status,
  c.whatsapp_added_at,
  array_agg(t.name order by t.position) as tickets
from public.event_ticket_orders o
join public.pasito_club_ticket_contacts c on c.intent_id = o.checkout_intent_id
join public.event_tickets k on k.order_id = o.id
join public.event_ticket_tiers t on t.id = k.tier_id
where o.event_slug = 'pasito-club-2026'
group by o.id, c.intent_id;

revoke all on public.pasito_club_buyers from anon, authenticated;

create or replace function public.pasito_club_reserve_pack(
  p_event_slug text,
  p_tier_ids bigint[],
  p_race_tier_id bigint,
  p_amount integer,
  p_pack_size integer,
  p_pricing_option text,
  p_email text,
  p_phone text,
  p_terms_version text,
  p_client_key_hash text,
  p_client_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_now timestamptz := now();
  v_expires_at timestamptz := now() + interval '10 minutes';
  v_intent_id uuid;
  v_count integer := coalesce(array_length(p_tier_ids, 1), 0);
  v_quantity integer;
  v_tier record;
  v_reserved integer;
  v_sold_out jsonb := '[]'::jsonb;
  v_ip_held integer;
  v_position integer := 0;
  v_unit integer;
  v_remainder integer;
  v_breakdown jsonb := '[]'::jsonb;
  v_tier_id bigint;
begin
  if p_event_slug is null or p_event_slug = ''
     or v_count < 1 or v_count > 8 or v_count <> p_pack_size
     or (select count(distinct x) from unnest(p_tier_ids) x) <> v_count
     or p_amount is null or p_amount < 1
     or p_pricing_option not in ('A', 'B')
     or p_client_key_hash !~ '^[a-f0-9]{64}$'
     or p_client_ip_hash !~ '^[a-f0-9]{64}$'
     or p_terms_version !~ '^[0-9]{4}-[0-9]{2}(-[0-9]{2})?$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Locking every tier of the event serializes allocation across dates.
  perform t.id
    from public.event_ticket_tiers t
   where t.event_slug = p_event_slug and t.is_active
   order by t.position
   for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if (select count(*) from public.event_ticket_tiers t
       where t.id = any(p_tier_ids) and t.event_slug = p_event_slug and t.is_active) <> v_count
     or (p_race_tier_id is not null and not exists (
       select 1 from public.event_ticket_tiers t
        where t.id = p_race_tier_id and t.event_slug = p_event_slug and t.is_active)) then
    return jsonb_build_object('status', 'invalid');
  end if;

  update public.event_ticket_reservations r
     set status = 'released'
    from public.event_checkout_intents i
   where r.intent_id = i.id
     and i.event_slug = p_event_slug
     and r.status = 'held'
     and (r.expires_at <= v_now or (i.client_key_hash = p_client_key_hash and i.status = 'held'));

  update public.event_checkout_intents i
     set status = case when i.expires_at <= v_now then 'expired' else 'cancelled' end,
         updated_at = v_now
   where i.event_slug = p_event_slug
     and i.status = 'held'
     and (i.expires_at <= v_now or i.client_key_hash = p_client_key_hash);

  select coalesce(sum(i.quantity), 0)::integer into v_ip_held
    from public.event_checkout_intents i
   where i.event_slug = p_event_slug
     and i.client_ip_hash = p_client_ip_hash
     and i.status = 'held'
     and i.expires_at > v_now;
  if v_ip_held + v_count > 40 then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  for v_tier in
    select t.id, t.position, t.name, t.capacity
      from public.event_ticket_tiers t
     where t.id = any(p_tier_ids) or t.id = p_race_tier_id
     order by t.position
  loop
    if v_tier.capacity is not null then
      select count(*)::integer into v_reserved
        from public.event_ticket_reservations r
       where r.tier_id = v_tier.id
         and (r.status = 'consumed' or (r.status = 'held' and r.expires_at > v_now));
      if v_reserved >= v_tier.capacity then
        v_sold_out := v_sold_out || to_jsonb(v_tier.id);
      end if;
    end if;
  end loop;
  if jsonb_array_length(v_sold_out) > 0 then
    return jsonb_build_object('status', 'sold_out', 'tierIds', v_sold_out);
  end if;

  v_quantity := v_count + case when p_race_tier_id is null then 0 else 1 end;
  insert into public.event_checkout_intents (
    event_slug, quantity, subtotal_amount, discount_amount, amount, currency, status,
    client_key_hash, client_ip_hash, expires_at, terms_accepted_at, terms_version, payment_provider
  ) values (
    p_event_slug, v_quantity, p_amount, 0, p_amount, 'ARS', 'held',
    p_client_key_hash, p_client_ip_hash, v_expires_at, v_now, p_terms_version, 'rebill'
  ) returning id into v_intent_id;

  insert into public.pasito_club_ticket_contacts (intent_id, email, phone, pack_size, pricing_option, includes_race)
  values (v_intent_id, lower(btrim(p_email)), p_phone, p_pack_size, p_pricing_option, p_race_tier_id is not null);

  -- The pack price is spread over the trainings so per-date revenue adds up
  -- to the amount charged; the race ticket is included at $0.
  v_unit := p_amount / v_count;
  v_remainder := p_amount - v_unit * v_count;
  for v_tier in
    select t.id, t.position, t.name
      from public.event_ticket_tiers t
     where t.id = any(p_tier_ids) or t.id = p_race_tier_id
     order by t.position
  loop
    v_position := v_position + 1;
    insert into public.event_ticket_reservations (intent_id, tier_id, ticket_position, unit_price, status, expires_at)
    values (
      v_intent_id, v_tier.id, v_position,
      case when v_tier.id = p_race_tier_id then 0
           when v_position = 1 then v_unit + v_remainder
           else v_unit end,
      'held', v_expires_at
    );
    v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
      'tierId', v_tier.id, 'position', v_tier.position, 'name', v_tier.name
    ));
  end loop;

  return jsonb_build_object(
    'status', 'reserved',
    'intentId', v_intent_id,
    'quantity', v_quantity,
    'amount', p_amount,
    'currency', 'ARS',
    'expiresAt', v_expires_at,
    'breakdown', v_breakdown
  );
end;
$function$;

revoke all on function public.pasito_club_reserve_pack(text, bigint[], bigint, integer, integer, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.pasito_club_reserve_pack(text, bigint[], bigint, integer, integer, text, text, text, text, text, text) to service_role;
