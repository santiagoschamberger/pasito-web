-- Tienda Pasito: stock y órdenes de la remera (lote limitado).
-- Tablas AISLADAS con prefijo tienda_ para no interferir con nada existente.
-- RLS activado sin políticas → sólo accesible con service_role (server-side).

-- ── Stock por color y talle ──────────────────────────────────────────────
create table if not exists public.tienda_stock (
  base text not null,                       -- 'blanca' | 'negra'
  size text not null,                       -- 'S' | 'M' | 'L' | 'XL'
  qty  integer not null default 0 check (qty >= 0),
  primary key (base, size)
);

alter table public.tienda_stock enable row level security;

-- Semilla: 93 por color (24 + 23 + 23 + 23). Editable luego con un UPDATE.
insert into public.tienda_stock (base, size, qty) values
  ('blanca', 'S', 24), ('blanca', 'M', 23), ('blanca', 'L', 23), ('blanca', 'XL', 23),
  ('negra',  'S', 24), ('negra',  'M', 23), ('negra',  'L', 23), ('negra',  'XL', 23)
on conflict (base, size) do nothing;

-- ── Órdenes confirmadas ──────────────────────────────────────────────────
create table if not exists public.tienda_orders (
  id                uuid primary key default gen_random_uuid(),
  rebill_payment_id text unique not null,   -- idempotencia
  base              text not null,
  print             text,
  size              text not null,
  qty               integer not null check (qty > 0),
  delivery          text not null,          -- 'retiro' | 'envio'
  amount            numeric not null,
  currency          text not null default 'ARS',
  email             text,
  customer_name     text,
  status            text not null default 'paid',
  created_at        timestamptz not null default now()
);

alter table public.tienda_orders enable row level security;

create index if not exists tienda_orders_created_at_idx
  on public.tienda_orders (created_at desc);

-- ── Confirmación atómica + descuento de stock (idempotente) ──────────────
-- Devuelve: 'confirmed' | 'duplicate' | 'insufficient_stock'
create or replace function public.tienda_confirm_order(
  p_payment_id    text,
  p_base          text,
  p_print         text,
  p_size          text,
  p_qty           integer,
  p_delivery      text,
  p_amount        numeric,
  p_currency      text,
  p_email         text,
  p_customer_name text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
begin
  -- ¿Ya procesamos este pago? → no volver a descontar.
  perform 1 from tienda_orders where rebill_payment_id = p_payment_id;
  if found then
    return 'duplicate';
  end if;

  -- Bloqueamos la fila de stock para evitar sobreventa en concurrencia.
  select qty into v_stock
    from tienda_stock
   where base = p_base and size = p_size
   for update;

  if not found or v_stock < p_qty then
    return 'insufficient_stock';
  end if;

  update tienda_stock
     set qty = qty - p_qty
   where base = p_base and size = p_size;

  insert into tienda_orders
    (rebill_payment_id, base, print, size, qty, delivery, amount, currency, email, customer_name, status)
  values
    (p_payment_id, p_base, p_print, p_size, p_qty, p_delivery, p_amount, p_currency, p_email, p_customer_name, 'paid');

  return 'confirmed';

exception
  when unique_violation then
    -- Carrera con otra confirmación del mismo pago: la otra ya descontó.
    return 'duplicate';
end;
$$;
