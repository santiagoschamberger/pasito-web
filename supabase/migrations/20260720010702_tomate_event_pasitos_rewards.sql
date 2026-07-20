-- Credits the Pasitos included with each TOMATE event ticket. The payment
-- email is tried automatically; a signed order link lets the buyer select a
-- different verified Pasito account when the emails do not match.

alter table public.event_ticket_tiers
  add column pasitos_bonus integer not null default 0
  check (pasitos_bonus >= 0);

update public.event_ticket_tiers
set pasitos_bonus = case position
  when 1 then 50
  when 2 then 20
  when 3 then 70
  else 0
end
where event_slug = 'pasito-tomate-2026';

alter table public.event_ticket_reservations
  add column pasitos_bonus integer not null default 0
  check (pasitos_bonus >= 0);

update public.event_ticket_reservations r
set pasitos_bonus = t.pasitos_bonus
from public.event_ticket_tiers t
where t.id = r.tier_id;

-- Freeze the bonus when the price is reserved, just like unit_price. This
-- keeps a paid order stable if a tier is edited before the buyer claims it.
create or replace function public.event_set_reservation_pasitos_bonus()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select t.pasitos_bonus
    into new.pasitos_bonus
    from public.event_ticket_tiers t
   where t.id = new.tier_id;

  if not found then
    raise foreign_key_violation using message = 'Unknown event ticket tier';
  end if;

  return new;
end;
$$;

create trigger event_ticket_reservation_pasitos_bonus
before insert on public.event_ticket_reservations
for each row execute function public.event_set_reservation_pasitos_bonus();

create table public.event_pasito_rewards (
  order_id uuid primary key references public.event_ticket_orders(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete restrict,
  amount integer not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'credited', 'reversed')),
  created_at timestamptz not null default now(),
  credited_at timestamptz,
  reversed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending' and user_id is null and credited_at is null and reversed_at is null)
    or (status = 'credited' and user_id is not null and credited_at is not null and reversed_at is null)
    or (status = 'reversed' and reversed_at is not null)
  )
);

create index event_pasito_rewards_user_idx
  on public.event_pasito_rewards (user_id)
  where user_id is not null;

alter table public.event_pasito_rewards enable row level security;

comment on table public.event_pasito_rewards is
  'Server-only, idempotent Pasitos ledger for paid event orders. One reward per order.';

create or replace function public.event_claim_order_pasitos(
  p_order_id uuid,
  p_account_email text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.event_ticket_orders%rowtype;
  v_reward public.event_pasito_rewards%rowtype;
  v_email text := lower(btrim(p_account_email));
  v_amount integer;
  v_user_id uuid;
begin
  if p_order_id is null
     or v_email = ''
     or char_length(v_email) > 254
     or position('@' in v_email) < 2 then
    return jsonb_build_object('status', 'invalid');
  end if;

  select o.* into v_order
    from public.event_ticket_orders o
   where o.id = p_order_id
   for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_order.payment_status <> 'approved' then
    return jsonb_build_object('status', 'payment_not_approved');
  end if;

  select coalesce(sum(r.pasitos_bonus), 0)::integer
    into v_amount
    from public.event_ticket_reservations r
   where r.intent_id = v_order.checkout_intent_id
     and r.status = 'consumed';

  if v_amount <= 0 then
    return jsonb_build_object('status', 'no_reward');
  end if;

  insert into public.event_pasito_rewards (order_id, amount, status)
  values (v_order.id, v_amount, 'pending')
  on conflict (order_id) do nothing;

  select r.* into v_reward
    from public.event_pasito_rewards r
   where r.order_id = v_order.id
   for update;

  if v_reward.status = 'credited' then
    return jsonb_build_object(
      'status', 'credited',
      'amount', v_reward.amount,
      'alreadyCredited', true
    );
  end if;
  if v_reward.status = 'reversed' then
    return jsonb_build_object('status', 'payment_not_approved', 'amount', v_reward.amount);
  end if;

  select u.id into v_user_id
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(btrim(u.email)) = v_email
     and u.email_confirmed_at is not null
   limit 1;

  if not found then
    return jsonb_build_object('status', 'account_not_found', 'amount', v_reward.amount);
  end if;

  perform public.increment_pasitos(v_user_id, v_reward.amount);

  update public.event_pasito_rewards
     set user_id = v_user_id,
         status = 'credited',
         credited_at = now(),
         reversed_at = null,
         updated_at = now()
   where order_id = v_order.id;

  return jsonb_build_object(
    'status', 'credited',
    'amount', v_reward.amount,
    'alreadyCredited', false
  );
end;
$$;

-- Keep the reward aligned with Rebill. A refund/dispute reverses a credited
-- reward once; a later approval restores it once.
create or replace function public.event_update_order_payment(
  p_payment_id text,
  p_payment_status text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_reward public.event_pasito_rewards%rowtype;
  v_has_reward boolean := false;
begin
  if p_payment_status not in ('approved', 'refunded', 'cancelled', 'chargeback', 'disputed') then
    return 'invalid';
  end if;

  select o.id into v_order_id
    from public.event_ticket_orders o
   where o.rebill_payment_id = p_payment_id
   for update;
  if not found then
    return 'not_found';
  end if;

  update public.event_ticket_orders
     set payment_status = p_payment_status, updated_at = now()
   where id = v_order_id;

  select r.* into v_reward
    from public.event_pasito_rewards r
   where r.order_id = v_order_id
   for update;
  v_has_reward := found;

  if p_payment_status = 'approved' then
    update public.event_tickets
       set status = case when checked_in_at is null then 'valid' else 'used' end,
           voided_at = null,
           updated_at = now()
     where order_id = v_order_id;

    if v_has_reward and v_reward.status = 'reversed' and v_reward.user_id is not null then
      perform public.increment_pasitos(v_reward.user_id, v_reward.amount);
      update public.event_pasito_rewards
         set status = 'credited', credited_at = now(), reversed_at = null, updated_at = now()
       where order_id = v_order_id;
    elsif v_has_reward and v_reward.status = 'reversed' then
      update public.event_pasito_rewards
         set status = 'pending', reversed_at = null, updated_at = now()
       where order_id = v_order_id;
    end if;
  else
    update public.event_tickets
       set status = 'void', voided_at = now(), updated_at = now()
     where order_id = v_order_id;

    if v_has_reward and v_reward.status = 'credited' and v_reward.user_id is not null then
      update public.profiles
         set pasitos_balance = greatest(0, pasitos_balance - v_reward.amount),
             total_pasitos_earned = greatest(0, total_pasitos_earned - v_reward.amount),
             updated_at = now()
       where id = v_reward.user_id;
    end if;

    if v_has_reward and v_reward.status <> 'reversed' then
      update public.event_pasito_rewards
         set status = 'reversed', reversed_at = now(), updated_at = now()
       where order_id = v_order_id;
    end if;
  end if;

  return 'updated';
end;
$$;

revoke all on table public.event_pasito_rewards from public, anon, authenticated;
grant select, insert, update, delete on table public.event_pasito_rewards to service_role;

revoke all on function public.event_set_reservation_pasitos_bonus() from public, anon, authenticated;
revoke all on function public.event_claim_order_pasitos(uuid, text) from public, anon, authenticated;
revoke all on function public.event_update_order_payment(text, text) from public, anon, authenticated;

grant execute on function public.event_set_reservation_pasitos_bonus() to service_role;
grant execute on function public.event_claim_order_pasitos(uuid, text) to service_role;
grant execute on function public.event_update_order_payment(text, text) to service_role;
