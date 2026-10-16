-- Unified check-in: resolve event from ticket without knowing event_slug upfront.
-- This lets a single check-in scanner work for all events (Pasito Club, Silver,
-- TOMATE, Walking Club Uruguay, and any future event).

create or replace function public.event_resolve_and_redeem_ticket(
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
  v_event_slug text;
  v_event_name text;
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

  -- Look up the ticket and get its event_slug (no event filter)
  select t.id, t.status, t.short_code, t.ticket_number, t.checked_in_at,
         o.event_slug, o.payment_status, o.customer_name, o.customer_email, o.quantity
    into v_ticket_id, v_ticket_status, v_ticket_code, v_ticket_number, v_checked_in_at,
         v_event_slug, v_payment_status, v_customer_name, v_customer_email, v_order_quantity
    from public.event_tickets t
    join public.event_ticket_orders o on o.id = t.order_id
   where (p_ticket_id is not null and t.id = p_ticket_id)
      or (p_short_code is not null and t.short_code = upper(p_short_code))
   order by case when p_ticket_id is not null and t.id = p_ticket_id then 0 else 1 end
   limit 1
   for update of t;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Get event name for display (optional, fallback to slug)
  case v_event_slug
    when 'pasito-tomate-2026' then v_event_name := 'Pasito × TOMATE';
    when 'silver-walks-2026-09' then v_event_name := 'Silver Walks';
    when 'pasito-club-2026' then v_event_name := 'Pasito Club';
    when 'walking-club-uy-2026' then v_event_name := 'Walking Club Uruguay';
    else v_event_name := v_event_slug;
  end case;

  -- Handle void tickets
  if v_payment_status <> 'approved' or v_ticket_status = 'void' then
    insert into public.event_ticket_checkins (ticket_id, outcome, source, operator_id)
    values (v_ticket_id, 'void', p_source, left(btrim(p_operator_id), 120));
    return jsonb_build_object(
      'status', 'void',
      'eventSlug', v_event_slug,
      'eventName', v_event_name,
      'code', v_ticket_code,
      'customerName', v_customer_name,
      'ticketNumber', v_ticket_number,
      'orderQuantity', v_order_quantity
    );
  end if;

  -- Handle already used tickets
  if v_ticket_status = 'used' then
    insert into public.event_ticket_checkins (ticket_id, outcome, source, operator_id)
    values (v_ticket_id, 'already_used', p_source, left(btrim(p_operator_id), 120));
    return jsonb_build_object(
      'status', 'already_used',
      'eventSlug', v_event_slug,
      'eventName', v_event_name,
      'code', v_ticket_code,
      'customerName', v_customer_name,
      'customerEmail', v_customer_email,
      'ticketNumber', v_ticket_number,
      'orderQuantity', v_order_quantity,
      'checkedInAt', v_checked_in_at
    );
  end if;

  -- Admit the ticket
  update public.event_tickets
     set status = 'used',
         checked_in_at = now(),
         checked_in_by = left(btrim(p_operator_id), 120),
         updated_at = now()
   where id = v_ticket_id;

  insert into public.event_ticket_checkins (ticket_id, outcome, source, operator_id)
  values (v_ticket_id, 'admitted', p_source, left(btrim(p_operator_id), 120));

  return jsonb_build_object(
    'status', 'admitted',
    'eventSlug', v_event_slug,
    'eventName', v_event_name,
    'code', v_ticket_code,
    'customerName', v_customer_name,
    'customerEmail', v_customer_email,
    'ticketNumber', v_ticket_number,
    'orderQuantity', v_order_quantity
  );
end;
$$;

revoke all on function public.event_resolve_and_redeem_ticket(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.event_resolve_and_redeem_ticket(uuid, text, text, text) to service_role;
