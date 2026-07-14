alter table public.tienda_orders
  add column if not exists pickup_instructions_sent_at timestamptz,
  add column if not exists pickup_instructions_email_id text;

comment on column public.tienda_orders.pickup_instructions_sent_at is
  'When the pickup coordination instructions were successfully sent by email.';

comment on column public.tienda_orders.pickup_instructions_email_id is
  'Resend email identifier for the pickup coordination message or order confirmation.';
