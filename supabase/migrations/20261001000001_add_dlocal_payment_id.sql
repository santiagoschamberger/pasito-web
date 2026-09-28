-- Add dlocal_payment_id column to event_ticket_orders for Uruguay Dlocal integration
-- This mirrors the existing rebill_payment_id pattern but for Dlocal payments

alter table public.event_ticket_orders
  add column if not exists dlocal_payment_id text;

create unique index if not exists event_ticket_orders_dlocal_payment_id_key
  on public.event_ticket_orders (dlocal_payment_id)
  where dlocal_payment_id is not null;

comment on column public.event_ticket_orders.dlocal_payment_id is
  'Dlocal payment ID for Uruguay events. Ensures idempotency: the same Dlocal payment cannot create multiple orders.';
