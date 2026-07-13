-- Direcciones de envío para Tienda Pasito.
-- La PII nunca viaja en metadata de Rebill: el checkout sólo guarda este UUID.

create table if not exists public.tienda_checkout_intents (
  id                       uuid primary key default gen_random_uuid(),
  base                     text not null check (base in ('blanca', 'negra')),
  print                    text not null check (print in ('verde', 'blanca')),
  size                     text not null check (size in ('S', 'M', 'L', 'XL')),
  qty                      integer not null check (qty between 1 and 10),
  delivery                 text not null default 'envio' check (delivery = 'envio'),
  shipping_address_line1   text not null check (char_length(shipping_address_line1) between 5 and 140),
  shipping_address_line2   text check (shipping_address_line2 is null or char_length(shipping_address_line2) <= 80),
  shipping_city            text not null check (char_length(shipping_city) between 2 and 80),
  shipping_province        text not null check (char_length(shipping_province) between 2 and 80),
  shipping_postal_code     text not null check (char_length(shipping_postal_code) between 3 and 12),
  shipping_country_code    text not null default 'AR' check (shipping_country_code = 'AR'),
  shipping_phone           text not null check (char_length(shipping_phone) between 8 and 30),
  shipping_notes           text check (shipping_notes is null or char_length(shipping_notes) <= 240),
  consumed_at              timestamptz,
  consumed_by_payment_id   text,
  created_at               timestamptz not null default now(),
  expires_at               timestamptz not null default (now() + interval '2 hours'),
  check (expires_at > created_at),
  check ((base = 'blanca' and print = 'verde') or (base = 'negra' and print = 'blanca'))
);

alter table public.tienda_checkout_intents enable row level security;

-- Changelog 2026: los grants de Data API ya no se deben asumir. Esta tabla es
-- exclusivamente server-side y nunca queda accesible a anon/authenticated.
revoke all on table public.tienda_checkout_intents from public, anon, authenticated;
grant select, insert, update, delete on table public.tienda_checkout_intents to service_role;

create index if not exists tienda_checkout_intents_expires_at_idx
  on public.tienda_checkout_intents (expires_at);

alter table public.tienda_orders
  add column if not exists checkout_intent_id uuid,
  add column if not exists shipping_address_line1 text,
  add column if not exists shipping_address_line2 text,
  add column if not exists shipping_city text,
  add column if not exists shipping_province text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country_code text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_notes text;

-- Hay órdenes históricas con envío sin dirección. Las columnas quedan nullable
-- para preservar ese historial; la función v2 exige intent válido desde ahora.
create unique index if not exists tienda_orders_checkout_intent_id_idx
  on public.tienda_orders (checkout_intent_id)
  where checkout_intent_id is not null;

comment on table public.tienda_checkout_intents is
  'Direcciones temporales de checkout. Expiran a las 2 horas y sólo son accesibles con service_role.';
comment on column public.tienda_orders.checkout_intent_id is
  'UUID opaco enviado en metadata de Rebill para vincular el pago con la dirección server-side.';

-- La tienda no usa acceso directo desde el navegador. Reducimos grants además
-- de mantener RLS cerrado, especialmente porque orders ahora contiene PII.
revoke all on table public.tienda_stock, public.tienda_orders from anon, authenticated;
grant select, insert, update, delete on table public.tienda_stock, public.tienda_orders to service_role;

create or replace function public.tienda_confirm_order_v2(
  p_payment_id         text,
  p_base               text,
  p_print              text,
  p_size               text,
  p_qty                integer,
  p_delivery           text,
  p_amount             numeric,
  p_currency           text,
  p_email              text,
  p_customer_name      text,
  p_checkout_intent_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock  integer;
  v_intent public.tienda_checkout_intents%rowtype;
begin
  perform 1 from public.tienda_orders where rebill_payment_id = p_payment_id;
  if found then
    return 'duplicate';
  end if;

  if p_delivery = 'envio' then
    if p_checkout_intent_id is null then
      return 'invalid_checkout_intent';
    end if;

    select * into v_intent
      from public.tienda_checkout_intents
     where id = p_checkout_intent_id
     for update;

    if not found
      or v_intent.consumed_at is not null
      or v_intent.expires_at <= now()
      or v_intent.base is distinct from p_base
      or v_intent.print is distinct from p_print
      or v_intent.size is distinct from p_size
      or v_intent.qty is distinct from p_qty
      or v_intent.delivery is distinct from p_delivery
    then
      return 'invalid_checkout_intent';
    end if;
  elsif p_delivery <> 'retiro' or p_checkout_intent_id is not null then
    return 'invalid_checkout_intent';
  end if;

  select qty into v_stock
    from public.tienda_stock
   where base = p_base and size = p_size
   for update;

  if not found or v_stock < p_qty then
    return 'insufficient_stock';
  end if;

  update public.tienda_stock
     set qty = qty - p_qty
   where base = p_base and size = p_size;

  insert into public.tienda_orders (
    rebill_payment_id,
    base,
    print,
    size,
    qty,
    delivery,
    amount,
    currency,
    email,
    customer_name,
    status,
    checkout_intent_id,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_province,
    shipping_postal_code,
    shipping_country_code,
    shipping_phone,
    shipping_notes
  ) values (
    p_payment_id,
    p_base,
    p_print,
    p_size,
    p_qty,
    p_delivery,
    p_amount,
    p_currency,
    p_email,
    p_customer_name,
    'paid',
    p_checkout_intent_id,
    case when p_delivery = 'envio' then v_intent.shipping_address_line1 end,
    case when p_delivery = 'envio' then v_intent.shipping_address_line2 end,
    case when p_delivery = 'envio' then v_intent.shipping_city end,
    case when p_delivery = 'envio' then v_intent.shipping_province end,
    case when p_delivery = 'envio' then v_intent.shipping_postal_code end,
    case when p_delivery = 'envio' then v_intent.shipping_country_code end,
    case when p_delivery = 'envio' then v_intent.shipping_phone end,
    case when p_delivery = 'envio' then v_intent.shipping_notes end
  );

  if p_delivery = 'envio' then
    update public.tienda_checkout_intents
       set consumed_at = now(), consumed_by_payment_id = p_payment_id
     where id = p_checkout_intent_id;
  end if;

  return 'confirmed';
exception
  when unique_violation then
    return 'duplicate';
end;
$$;

-- La función anterior sigue disponible para un rollout sin downtime, pero ya
-- no puede ser invocada por PUBLIC/anon/authenticated.
revoke execute on function public.tienda_confirm_order(
  text, text, text, text, integer, text, numeric, text, text, text
) from public, anon, authenticated;
grant execute on function public.tienda_confirm_order(
  text, text, text, text, integer, text, numeric, text, text, text
) to service_role;

revoke all on function public.tienda_confirm_order_v2(
  text, text, text, text, integer, text, numeric, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.tienda_confirm_order_v2(
  text, text, text, text, integer, text, numeric, text, text, text, uuid
) to service_role;
