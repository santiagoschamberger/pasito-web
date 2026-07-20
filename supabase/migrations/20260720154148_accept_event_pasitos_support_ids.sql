-- The app exposes an eight-character support ID (the first segment of the
-- profile UUID), not the full UUID. Resolve that short code on the server and
-- require it to match exactly one profile before any Pasitos are credited.

create or replace function public.event_claim_order_pasitos_by_support_codes(
  p_order_id uuid,
  p_support_ids text[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.event_ticket_orders%rowtype;
  v_reward public.event_pasito_rewards%rowtype;
  v_entry_count integer;
  v_invalid_positions jsonb;
  v_ambiguous_positions jsonb;
  v_resolved_user_ids uuid[];
  v_single_user_id uuid;
  v_credit record;
begin
  if p_order_id is null
    or p_support_ids is null
    or cardinality(p_support_ids) = 0
    or exists (
      select 1
        from unnest(p_support_ids) as submitted(support_id)
       where submitted.support_id is null
          or btrim(submitted.support_id) !~ '^[A-Fa-f0-9]{8}$'
    )
  then
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

  -- UUID range bounds use the primary-key index and avoid a full profiles scan.
  -- A code with zero or multiple matches is rejected before any write occurs.
  with submitted as (
    select upper(btrim(item.support_id)) as support_id, item.position
      from unnest(p_support_ids) with ordinality as item(support_id, position)
  ), resolved as (
    select
      submitted.position,
      matched.user_ids,
      coalesce(cardinality(matched.user_ids), 0) as match_count
    from submitted
    cross join lateral (
      select array_agg(profile.id order by profile.id) as user_ids
        from public.profiles profile
       where profile.id >= (
         lower(submitted.support_id) || '-0000-0000-0000-000000000000'
       )::uuid
         and profile.id <= (
           lower(submitted.support_id) || '-ffff-ffff-ffff-ffffffffffff'
         )::uuid
    ) matched
  )
  select
    coalesce(
      jsonb_agg(position order by position) filter (where match_count = 0),
      '[]'::jsonb
    ),
    coalesce(
      jsonb_agg(position order by position) filter (where match_count > 1),
      '[]'::jsonb
    ),
    array_agg((user_ids)[1] order by position)
    into v_invalid_positions, v_ambiguous_positions, v_resolved_user_ids
    from resolved;

  if jsonb_array_length(v_invalid_positions) > 0
    or jsonb_array_length(v_ambiguous_positions) > 0
  then
    return jsonb_build_object(
      'status', 'support_id_invalid',
      'amount', v_reward.amount,
      'invalidPositions', v_invalid_positions,
      'ambiguousPositions', v_ambiguous_positions
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
    join unnest(v_resolved_user_ids) with ordinality as submitted(user_id, position)
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

revoke all on function public.event_claim_order_pasitos_by_support_codes(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.event_claim_order_pasitos_by_support_codes(uuid, text[])
  to service_role;
