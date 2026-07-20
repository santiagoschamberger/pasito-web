-- Keep ticket inventory aligned with the latest payment state. A cancelled,
-- refunded, disputed or charged-back order must release its reservations;
-- re-approving the payment consumes them again.

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
  v_intent_id uuid;
  v_reward public.event_pasito_rewards%rowtype;
  v_has_reward boolean := false;
  v_credit record;
begin
  if p_payment_status not in ('approved', 'refunded', 'cancelled', 'chargeback', 'disputed') then
    return 'invalid';
  end if;

  select o.id, o.checkout_intent_id into v_order_id, v_intent_id
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
    update public.event_ticket_reservations
       set status = 'consumed'
     where intent_id = v_intent_id;

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
    update public.event_ticket_reservations
       set status = 'released'
     where intent_id = v_intent_id;

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

-- Repair any existing drift without touching unpaid/held reservations.
update public.event_ticket_reservations reservation
   set status = case
     when orders.payment_status = 'approved' then 'consumed'
     else 'released'
   end
  from public.event_ticket_orders orders
 where orders.checkout_intent_id = reservation.intent_id
   and reservation.status is distinct from case
     when orders.payment_status = 'approved' then 'consumed'
     else 'released'
   end;

revoke all on function public.event_update_order_payment(text, text)
  from public, anon, authenticated;
grant execute on function public.event_update_order_payment(text, text)
  to service_role;
