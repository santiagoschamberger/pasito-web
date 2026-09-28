-- Add dlocal go payment tracking columns

-- Add dlocalgo_payment_id to orders for Uruguay dLocal Go payments
alter table public.event_ticket_orders
  add column if not exists dlocalgo_payment_id text;

create unique index if not exists event_ticket_orders_dlocalgo_payment_id_key
  on public.event_ticket_orders (dlocalgo_payment_id)
  where dlocalgo_payment_id is not null;

comment on column public.event_ticket_orders.dlocalgo_payment_id is
  'dLocal Go payment ID for Uruguay events. Ensures idempotency: the same dLocal Go payment cannot create multiple orders.';

-- Add payment provider tracking to checkout intents
alter table public.event_checkout_intents
  add column if not exists payment_provider text;

alter table public.event_checkout_intents
  add column if not exists payment_provider_id text;

comment on column public.event_checkout_intents.payment_provider is
  'Payment provider used for this checkout: rebill, dlocalgo, etc.';

comment on column public.event_checkout_intents.payment_provider_id is
  'Payment ID from the external provider (e.g. dLocal Go payment ID).';

