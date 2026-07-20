-- Keep scarce event inventory moving: unpaid checkout holds now last 15 minutes.
-- Existing holds are capped too, so the public inventory and the new policy agree
-- immediately after this migration is applied.
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
  v_expires_at timestamptz := now() + interval '15 minutes';
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

revoke all on function public.event_reserve_tickets(text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.event_reserve_tickets(text, integer, text, text)
  to service_role;

update public.event_checkout_intents
   set expires_at = least(expires_at, created_at + interval '15 minutes'),
       updated_at = now()
 where event_slug = 'pasito-tomate-2026'
   and status = 'held'
   and expires_at > created_at + interval '15 minutes';

update public.event_ticket_reservations r
   set expires_at = least(r.expires_at, i.expires_at)
  from public.event_checkout_intents i
 where r.intent_id = i.id
   and i.event_slug = 'pasito-tomate-2026'
   and r.status = 'held';

update public.event_ticket_reservations r
   set status = 'released'
  from public.event_checkout_intents i
 where r.intent_id = i.id
   and i.event_slug = 'pasito-tomate-2026'
   and r.status = 'held'
   and r.expires_at <= now();

update public.event_checkout_intents
   set status = 'expired', updated_at = now()
 where event_slug = 'pasito-tomate-2026'
   and status = 'held'
   and expires_at <= now();
