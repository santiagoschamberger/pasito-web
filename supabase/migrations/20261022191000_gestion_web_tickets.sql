-- Eventos Pasito: entradas vendidas en la web (Rebill / dLocal) como fuente de
-- asistentes y de ingresos, y check-in que también marca el ticket original.

alter table public.gestion_events add column if not exists web_tiers text[] not null default '{}';
alter table public.gestion_events add column if not exists series text;

-- Tandas de entradas que se pueden vincular ("slug:posición").
create or replace function public.gestion_web_tier_options()
returns table (tier_key text, event_slug text, tier_position int, name text, unit_price int, capacity int)
language sql
stable
security definer
set search_path = public
as $$
  select t.event_slug || ':' || t.position, t.event_slug, t.position::int, t.name, t.unit_price::int, t.capacity::int
    from public.event_ticket_tiers t
   order by t.created_at desc, t.position;
$$;

-- Entradas de las tandas vinculadas. El ingreso de cada orden se reparte entre
-- sus entradas según el precio de lista (las de regalo no suman).
create or replace function public.gestion_web_tickets(p_tiers text[])
returns table (
  ticket_id uuid,
  short_code text,
  ticket_number int,
  order_quantity int,
  customer_name text,
  customer_email text,
  checked_in_at timestamptz,
  ticket_status text,
  approved boolean,
  tier_key text,
  revenue numeric,
  ordered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with tickets as (
    select k.*, o.amount, o.payment_status, o.customer_name, o.customer_email, o.quantity, o.created_at as ordered_at,
           tr.event_slug || ':' || tr.position as key, tr.unit_price
      from public.event_tickets k
      join public.event_ticket_orders o on o.id = k.order_id
      join public.event_ticket_tiers tr on tr.id = k.tier_id
     where tr.event_slug || ':' || tr.position = any (p_tiers)
  ),
  order_weights as (
    select k.order_id, sum(tr.unit_price) as list_total
      from public.event_tickets k
      join public.event_ticket_tiers tr on tr.id = k.tier_id
     where k.order_id in (select order_id from tickets)
     group by k.order_id
  )
  select t.id, t.short_code, t.ticket_number::int, t.quantity::int, t.customer_name, t.customer_email,
         t.checked_in_at, t.status, t.payment_status = 'approved', t.key,
         case when w.list_total > 0 then round(t.amount::numeric * t.unit_price / w.list_total) else 0 end,
         t.ordered_at
    from tickets t
    join order_weights w on w.order_id = t.order_id;
$$;

revoke all on function public.gestion_web_tier_options() from public, anon, authenticated;
revoke all on function public.gestion_web_tickets(text[]) from public, anon, authenticated;

-- Check-in: además de la lista, marca usado el ticket web original para que el
-- escáner viejo y este sistema no dejen pasar dos veces la misma entrada.
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
  v_ticket_id uuid;
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

  if v_att.origin_ref like 'web:%' then
    v_ticket_id := substring(v_att.origin_ref from 5)::uuid;
  end if;

  if p_action = 'ingreso' then
    if v_att.status = 'ingreso' then
      v_dup := true;
    else
      update public.gestion_attendees
        set status = 'ingreso', checked_in_at = coalesce(checked_in_at, p_scanned_at),
            checked_in_device = p_device, updated_at = now()
        where id = v_att.id;
      if v_ticket_id is not null then
        update public.event_tickets
          set status = 'used', checked_in_at = coalesce(checked_in_at, p_scanned_at),
              checked_in_by = left('eventos:' || coalesce(p_operator, ''), 120), updated_at = now()
          where id = v_ticket_id and status = 'valid';
        if found then
          insert into public.event_ticket_checkins (ticket_id, outcome, source, operator_id)
            values (v_ticket_id, 'admitted', 'qr', left('eventos:' || coalesce(p_operator, ''), 120));
        end if;
      end if;
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
