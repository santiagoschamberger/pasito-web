-- A paid order now creates one pending Pasitos assignment per ticket. The
-- buyer submits one in-app support ID for every ticket in one atomic claim.

alter table public.event_pasito_rewards
  drop constraint event_pasito_rewards_check;

alter table public.event_pasito_rewards
  add constraint event_pasito_rewards_state_check check (
    (status = 'pending' and user_id is null and credited_at is null and reversed_at is null)
    or (status = 'credited' and credited_at is not null and reversed_at is null)
    or (status = 'reversed' and reversed_at is not null)
  );

comment on column public.event_pasito_rewards.user_id is
  'Legacy/single-recipient shortcut. Per-ticket recipients live in event_pasito_reward_entries.';

create table public.event_pasito_reward_entries (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.event_ticket_orders(id) on delete restrict,
  ticket_id uuid not null unique references public.event_tickets(id) on delete restrict,
  reservation_id uuid not null unique references public.event_ticket_reservations(id) on delete restrict,
  ticket_number smallint not null check (ticket_number > 0),
  user_id uuid references public.profiles(id) on delete restrict,
  amount integer not null check (amount >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'credited', 'reversed')),
  credited_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, ticket_number),
  check (
    (status = 'pending' and user_id is null and credited_at is null and reversed_at is null)
    or (status = 'credited' and user_id is not null and credited_at is not null and reversed_at is null)
    or (status = 'reversed' and reversed_at is not null)
  )
);

create index event_pasito_reward_entries_order_idx
  on public.event_pasito_reward_entries (order_id, ticket_number);

create index event_pasito_reward_entries_user_idx
  on public.event_pasito_reward_entries (user_id)
  where user_id is not null;

alter table public.event_pasito_reward_entries enable row level security;

comment on table public.event_pasito_reward_entries is
  'Server-only, per-ticket Pasitos assignments submitted once through a signed order link.';

-- Preserve any legacy rewards if this migration is applied after sales have
-- started. Production currently has no event orders, but this keeps rollout
-- safe and makes the migration reusable.
insert into public.event_pasito_reward_entries (
  order_id,
  ticket_id,
  reservation_id,
  ticket_number,
  user_id,
  amount,
  status,
  credited_at,
  reversed_at
)
select
  reward.order_id,
  ticket.id,
  ticket.reservation_id,
  ticket.ticket_number,
  reward.user_id,
  reservation.pasitos_bonus,
  reward.status,
  reward.credited_at,
  reward.reversed_at
from public.event_pasito_rewards reward
join public.event_tickets ticket on ticket.order_id = reward.order_id
join public.event_ticket_reservations reservation on reservation.id = ticket.reservation_id
on conflict (reservation_id) do nothing;

create or replace function public.event_prepare_order_pasitos(
  p_order_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.event_ticket_orders%rowtype;
  v_amount integer;
  v_quantity integer;
  v_status text;
  v_entries jsonb;
begin
  if p_order_id is null then
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

  insert into public.event_pasito_reward_entries (
    order_id,
    ticket_id,
    reservation_id,
    ticket_number,
    amount,
    status
  )
  select
    ticket.order_id,
    ticket.id,
    ticket.reservation_id,
    ticket.ticket_number,
    reservation.pasitos_bonus,
    'pending'
  from public.event_tickets ticket
  join public.event_ticket_reservations reservation on reservation.id = ticket.reservation_id
  where ticket.order_id = v_order.id
  order by ticket.ticket_number
  on conflict (reservation_id) do nothing;

  select
    coalesce(sum(entry.amount), 0)::integer,
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'ticketNumber', entry.ticket_number,
          'amount', entry.amount
        ) order by entry.ticket_number
      ),
      '[]'::jsonb
    )
    into v_amount, v_quantity, v_entries
    from public.event_pasito_reward_entries entry
   where entry.order_id = v_order.id;

  if v_quantity <> v_order.quantity or v_amount <= 0 then
    return jsonb_build_object('status', 'no_reward');
  end if;

  insert into public.event_pasito_rewards (order_id, amount, status)
  values (v_order.id, v_amount, 'pending')
  on conflict (order_id) do update
    set amount = excluded.amount,
        updated_at = now()
    where public.event_pasito_rewards.status = 'pending';

  select reward.status, reward.amount
    into v_status, v_amount
    from public.event_pasito_rewards reward
   where reward.order_id = v_order.id;

  return jsonb_build_object(
    'status', v_status,
    'amount', v_amount,
    'quantity', v_quantity,
    'entries', v_entries
  );
end;
$$;

create or replace function public.event_claim_order_pasitos_by_support_ids(
  p_order_id uuid,
  p_support_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.event_ticket_orders%rowtype;
  v_reward public.event_pasito_rewards%rowtype;
  v_entry_count integer;
  v_missing_positions jsonb;
  v_single_user_id uuid;
  v_credit record;
begin
  if p_order_id is null or p_support_ids is null or cardinality(p_support_ids) = 0 then
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

  select reward.* into v_reward
    from public.event_pasito_rewards reward
   where reward.order_id = v_order.id
   for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
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

  select count(*)::integer into v_entry_count
    from public.event_pasito_reward_entries entry
   where entry.order_id = v_order.id
     and entry.status = 'pending';

  if v_entry_count <> v_order.quantity or cardinality(p_support_ids) <> v_entry_count then
    return jsonb_build_object(
      'status', 'invalid_count',
      'expected', v_entry_count,
      'received', cardinality(p_support_ids)
    );
  end if;

  select coalesce(jsonb_agg(submitted.position order by submitted.position), '[]'::jsonb)
    into v_missing_positions
    from unnest(p_support_ids) with ordinality as submitted(user_id, position)
    left join public.profiles profile on profile.id = submitted.user_id
      where submitted.user_id is null or profile.id is null;

  if jsonb_array_length(v_missing_positions) > 0 then
    return jsonb_build_object(
      'status', 'account_not_found',
      'amount', v_reward.amount,
      'invalidPositions', v_missing_positions
    );
  end if;

  with ordered_entries as (
    select
      entry.id,
      row_number() over (order by entry.ticket_number) as position
    from public.event_pasito_reward_entries entry
    where entry.order_id = v_order.id
      and entry.status = 'pending'
  ), assignments as (
    select ordered.id, submitted.user_id
    from ordered_entries ordered
    join unnest(p_support_ids) with ordinality as submitted(user_id, position)
      on submitted.position = ordered.position
  )
  update public.event_pasito_reward_entries entry
     set user_id = assignments.user_id,
         status = 'credited',
         credited_at = now(),
         reversed_at = null,
         updated_at = now()
    from assignments
   where entry.id = assignments.id;

  for v_credit in
    select entry.user_id, sum(entry.amount)::integer as amount
      from public.event_pasito_reward_entries entry
     where entry.order_id = v_order.id
       and entry.status = 'credited'
     group by entry.user_id
  loop
    perform public.increment_pasitos(v_credit.user_id, v_credit.amount);
  end loop;

  select case
      when count(distinct entry.user_id) = 1 then (array_agg(entry.user_id))[1]
      else null
    end
    into v_single_user_id
    from public.event_pasito_reward_entries entry
   where entry.order_id = v_order.id;

  update public.event_pasito_rewards
     set user_id = v_single_user_id,
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

-- Backward-compatible wrapper for the short deployment window where the old
-- server code may still call the email-based function. It prepares the link
-- but deliberately never auto-credits an account.
create or replace function public.event_claim_order_pasitos(
  p_order_id uuid,
  p_account_email text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  v_result := public.event_prepare_order_pasitos(p_order_id);
  if v_result ->> 'status' = 'pending' then
    return v_result || jsonb_build_object('status', 'account_not_found');
  end if;
  return v_result;
end;
$$;

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
  v_credit record;
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

  select reward.* into v_reward
    from public.event_pasito_rewards reward
   where reward.order_id = v_order_id
   for update;
  v_has_reward := found;

  if p_payment_status = 'approved' then
    update public.event_tickets
       set status = case when checked_in_at is null then 'valid' else 'used' end,
           voided_at = null,
           updated_at = now()
     where order_id = v_order_id;

    if v_has_reward and v_reward.status = 'reversed' then
      if exists (
        select 1
          from public.event_pasito_reward_entries entry
         where entry.order_id = v_order_id
           and entry.user_id is not null
      ) then
        for v_credit in
          select entry.user_id, sum(entry.amount)::integer as amount
            from public.event_pasito_reward_entries entry
           where entry.order_id = v_order_id
             and entry.status = 'reversed'
             and entry.user_id is not null
           group by entry.user_id
        loop
          perform public.increment_pasitos(v_credit.user_id, v_credit.amount);
        end loop;

        update public.event_pasito_reward_entries
           set status = 'credited', credited_at = now(), reversed_at = null, updated_at = now()
         where order_id = v_order_id
           and user_id is not null;

        update public.event_pasito_rewards
           set status = 'credited', credited_at = now(), reversed_at = null, updated_at = now()
         where order_id = v_order_id;
      else
        update public.event_pasito_reward_entries
           set status = 'pending', credited_at = null, reversed_at = null, updated_at = now()
         where order_id = v_order_id;

        update public.event_pasito_rewards
           set user_id = null, status = 'pending', credited_at = null, reversed_at = null, updated_at = now()
         where order_id = v_order_id;
      end if;
    end if;
  else
    update public.event_tickets
       set status = 'void', voided_at = now(), updated_at = now()
     where order_id = v_order_id;

    if v_has_reward and v_reward.status = 'credited' then
      for v_credit in
        select entry.user_id, sum(entry.amount)::integer as amount
          from public.event_pasito_reward_entries entry
         where entry.order_id = v_order_id
           and entry.status = 'credited'
           and entry.user_id is not null
         group by entry.user_id
      loop
        update public.profiles
           set pasitos_balance = greatest(0, pasitos_balance - v_credit.amount),
               total_pasitos_earned = greatest(0, total_pasitos_earned - v_credit.amount),
               updated_at = now()
         where id = v_credit.user_id;
      end loop;
    end if;

    if v_has_reward and v_reward.status <> 'reversed' then
      update public.event_pasito_reward_entries
         set status = 'reversed', reversed_at = now(), updated_at = now()
       where order_id = v_order_id;

      update public.event_pasito_rewards
         set status = 'reversed', reversed_at = now(), updated_at = now()
       where order_id = v_order_id;
    end if;
  end if;

  return 'updated';
end;
$$;

revoke all on table public.event_pasito_reward_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.event_pasito_reward_entries to service_role;

revoke all on function public.event_prepare_order_pasitos(uuid) from public, anon, authenticated;
revoke all on function public.event_claim_order_pasitos_by_support_ids(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.event_claim_order_pasitos(uuid, text) from public, anon, authenticated;

grant execute on function public.event_prepare_order_pasitos(uuid) to service_role;
grant execute on function public.event_claim_order_pasitos_by_support_ids(uuid, uuid[]) to service_role;
grant execute on function public.event_claim_order_pasitos(uuid, text) to service_role;
