-- Tracks each transactional confirmation email and lets webhook retries
-- record success/failure atomically, including duplicate payment callbacks.

alter table public.tienda_orders
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_id text,
  add column if not exists confirmation_email_attempts integer not null default 0,
  add column if not exists confirmation_email_last_attempt_at timestamptz,
  add column if not exists confirmation_email_last_error text;

alter table public.tienda_orders
  drop constraint if exists tienda_orders_confirmation_email_attempts_check;
alter table public.tienda_orders
  add constraint tienda_orders_confirmation_email_attempts_check
  check (confirmation_email_attempts >= 0);

alter table public.event_ticket_orders
  add column if not exists confirmation_email_attempts integer not null default 0,
  add column if not exists confirmation_email_last_attempt_at timestamptz,
  add column if not exists confirmation_email_last_error text;

alter table public.event_ticket_orders
  drop constraint if exists event_ticket_orders_confirmation_email_attempts_check;
alter table public.event_ticket_orders
  add constraint event_ticket_orders_confirmation_email_attempts_check
  check (confirmation_email_attempts >= 0);

update public.event_ticket_orders
   set confirmation_email_attempts = 1,
       confirmation_email_last_attempt_at = confirmation_email_sent_at
 where confirmation_email_sent_at is not null
   and confirmation_email_attempts = 0;

create index if not exists tienda_orders_confirmation_email_pending_idx
  on public.tienda_orders (created_at)
  where confirmation_email_sent_at is null and status = 'paid';

create index if not exists event_ticket_orders_confirmation_email_pending_idx
  on public.event_ticket_orders (created_at)
  where confirmation_email_sent_at is null and payment_status = 'approved';

create or replace function public.tienda_record_confirmation_email_attempt(
  p_order_id uuid,
  p_attempt_count integer,
  p_email_id text,
  p_error text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.tienda_orders
     set confirmation_email_attempts = confirmation_email_attempts + greatest(coalesce(p_attempt_count, 1), 1),
         confirmation_email_last_attempt_at = now(),
         confirmation_email_last_error = case
           when p_email_id is not null then null
           when confirmation_email_sent_at is null then left(coalesce(p_error, 'Error desconocido.'), 1000)
           else confirmation_email_last_error
         end,
         confirmation_email_sent_at = case when p_email_id is not null then coalesce(confirmation_email_sent_at, now()) else confirmation_email_sent_at end,
         confirmation_email_id = case when p_email_id is not null then coalesce(confirmation_email_id, p_email_id) else confirmation_email_id end,
         pickup_instructions_sent_at = case
           when p_email_id is not null and delivery = 'retiro' then coalesce(pickup_instructions_sent_at, now())
           else pickup_instructions_sent_at
         end,
         pickup_instructions_email_id = case
           when p_email_id is not null and delivery = 'retiro' then coalesce(pickup_instructions_email_id, p_email_id)
           else pickup_instructions_email_id
         end
   where id = p_order_id;

  if not found then
    raise exception 'No se encontró la orden de tienda.';
  end if;
end;
$$;

create or replace function public.event_record_confirmation_email_attempt(
  p_order_id uuid,
  p_attempt_count integer,
  p_email_id text,
  p_error text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.event_ticket_orders
     set confirmation_email_attempts = confirmation_email_attempts + greatest(coalesce(p_attempt_count, 1), 1),
         confirmation_email_last_attempt_at = now(),
         confirmation_email_last_error = case
           when p_email_id is not null then null
           when confirmation_email_sent_at is null then left(coalesce(p_error, 'Error desconocido.'), 1000)
           else confirmation_email_last_error
         end,
         confirmation_email_sent_at = case when p_email_id is not null then coalesce(confirmation_email_sent_at, now()) else confirmation_email_sent_at end,
         confirmation_email_id = case when p_email_id is not null then coalesce(confirmation_email_id, p_email_id) else confirmation_email_id end,
         updated_at = now()
   where id = p_order_id;

  if not found then
    raise exception 'No se encontró la orden de entradas.';
  end if;
end;
$$;

revoke all on function public.tienda_record_confirmation_email_attempt(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.tienda_record_confirmation_email_attempt(uuid, integer, text, text)
  to service_role;

revoke all on function public.event_record_confirmation_email_attempt(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.event_record_confirmation_email_attempt(uuid, integer, text, text)
  to service_role;

comment on column public.tienda_orders.confirmation_email_last_error is
  'Último error de entrega. Se limpia cuando Resend acepta el email.';
comment on column public.event_ticket_orders.confirmation_email_last_error is
  'Último error de entrega. Se limpia cuando Resend acepta el email.';
