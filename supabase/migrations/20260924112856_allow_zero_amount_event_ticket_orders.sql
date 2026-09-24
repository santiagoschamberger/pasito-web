-- Allow 100% promo codes (amount = 0). Free checkouts skip Rebill in the web app.
begin;

alter table public.event_checkout_intents
  drop constraint event_checkout_intents_amount_check;

alter table public.event_checkout_intents
  add constraint event_checkout_intents_amount_check
  check (amount >= 0);

alter table public.event_ticket_orders
  drop constraint event_ticket_orders_amount_check;

alter table public.event_ticket_orders
  add constraint event_ticket_orders_amount_check
  check (amount >= 0);

commit;
