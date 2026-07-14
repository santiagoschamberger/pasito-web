-- Guarda el barrio de retiro elegido y lo valida dentro de la misma
-- transacción que confirma el pago y descuenta stock.

alter table public.tienda_orders
  add column if not exists pickup_location text;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'tienda_orders_pickup_location_check'
       and conrelid = 'public.tienda_orders'::regclass
  ) then
    alter table public.tienda_orders
      add constraint tienda_orders_pickup_location_check
      check (pickup_location is null or pickup_location in ('belgrano', 'palermo'));
  end if;
end
$$;

comment on column public.tienda_orders.pickup_location is
  'Pickup neighborhood selected at checkout: belgrano or palermo. Historical orders may be null.';

create or replace function public.tienda_confirm_order_v3(
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
  p_checkout_intent_id uuid,
  p_pickup_location    text
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
    if p_pickup_location is not null then
      return 'invalid_pickup_location';
    end if;

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
  elsif p_delivery = 'retiro' then
    if p_checkout_intent_id is not null then
      return 'invalid_checkout_intent';
    end if;

    if p_pickup_location is null or p_pickup_location not in ('belgrano', 'palermo') then
      return 'invalid_pickup_location';
    end if;
  else
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
    pickup_location,
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
    p_pickup_location,
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

revoke all on function public.tienda_confirm_order_v3(
  text, text, text, text, integer, text, numeric, text, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.tienda_confirm_order_v3(
  text, text, text, text, integer, text, numeric, text, text, text, uuid, text
) to service_role;
