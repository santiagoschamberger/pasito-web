-- Run after the ticketing migration inside a transaction that is rolled back.
-- Any failed assertion aborts the query.
do $$
declare
  v_result jsonb;
  v_first_intent uuid;
  v_replacement_intent uuid;
  v_cross jsonb;
  v_cross_intent uuid;
  v_same_support_intent uuid;
  v_same_support_order_id uuid;
  v_confirm jsonb;
  v_duplicate jsonb;
  v_order_id uuid;
  v_ticket_id uuid;
  v_second_ticket_id uuid;
  v_redeem jsonb;
  v_reward jsonb;
  v_reward_user_id uuid;
  v_second_reward_user_id uuid;
  v_reward_balance integer;
  v_reward_total integer;
  v_second_reward_balance integer;
  v_second_reward_total integer;
  v_count integer;
  v_i integer;
begin
  insert into public.event_ticket_tiers (
    event_slug, position, name, unit_price, capacity, pasitos_bonus
  ) values
    ('pasito-tomate-sql-test', 1, 'Primeras 100', 35000, 100, 50),
    ('pasito-tomate-sql-test', 2, 'Siguientes 100', 45000, 100, 20),
    ('pasito-tomate-sql-test', 3, 'Precio final', 55000, null, 70);

  select count(*)::integer into v_count
    from public.event_ticket_tiers
   where event_slug = 'pasito-tomate-sql-test';
  assert v_count = 3, 'expected three seeded tiers';

  v_result := public.event_reserve_tickets(
    'pasito-tomate-sql-test', 1, repeat('1', 64), repeat('2', 64)
  );
  assert v_result ->> 'status' = 'reserved', 'first reservation failed';
  assert (v_result ->> 'amount')::integer = 35000, 'first-tier amount mismatch';
  v_first_intent := (v_result ->> 'intentId')::uuid;

  -- A new reservation in the same browser replaces the old hold atomically.
  v_result := public.event_reserve_tickets(
    'pasito-tomate-sql-test', 6, repeat('1', 64), repeat('2', 64)
  );
  v_replacement_intent := (v_result ->> 'intentId')::uuid;
  assert v_result ->> 'status' = 'reserved', 'replacement reservation failed';
  assert (select status from public.event_checkout_intents where id = v_first_intent) = 'cancelled',
    'previous browser hold was not cancelled';
  assert (select count(*) from public.event_ticket_reservations where intent_id = v_first_intent and status = 'held') = 0,
    'previous browser tickets stayed held';
  assert public.event_cancel_ticket_reservation(v_replacement_intent) = 'cancelled',
    'reservation cancellation failed';

  -- Hold 98 tickets in separate client/IP buckets to exercise the exact
  -- boundary without weakening the production per-IP abuse protection.
  for v_i in 1..16 loop
    v_result := public.event_reserve_tickets(
      'pasito-tomate-sql-test',
      6,
      lpad(to_hex(v_i + 100), 64, 'a'),
      lpad(to_hex(v_i + 200), 64, 'b')
    );
    assert v_result ->> 'status' = 'reserved', 'bulk boundary reservation failed';
  end loop;
  v_result := public.event_reserve_tickets(
    'pasito-tomate-sql-test', 2, repeat('3', 64), repeat('4', 64)
  );
  assert v_result ->> 'status' = 'reserved', '98-ticket setup failed';

  -- Four tickets now span the 100-ticket price boundary: two at 35k and two at 45k.
  v_cross := public.event_reserve_tickets(
    'pasito-tomate-sql-test', 4, repeat('5', 64), repeat('6', 64)
  );
  assert v_cross ->> 'status' = 'reserved', 'cross-tier reservation failed';
  assert (v_cross ->> 'amount')::integer = 160000, 'cross-tier total must be 2x35k + 2x45k';
  assert jsonb_array_length(v_cross -> 'breakdown') = 2, 'cross-tier breakdown should have two lines';
  assert (v_cross #>> '{breakdown,0,quantity}')::integer = 2, 'first-tier boundary quantity mismatch';
  assert (v_cross #>> '{breakdown,1,quantity}')::integer = 2, 'second-tier boundary quantity mismatch';
  v_cross_intent := (v_cross ->> 'intentId')::uuid;
  assert (
    select sum(pasitos_bonus)::integer
      from public.event_ticket_reservations
     where intent_id = v_cross_intent
  ) = 140, 'cross-tier Pasitos bonus must be frozen at 2x50 + 2x20';

  v_confirm := public.event_confirm_ticket_order(
    v_cross_intent,
    'pay_tomate_transactional_test',
    160000,
    'ARS',
    'E2E.TEST@PASITO.APP',
    'Prueba Transaccional'
  );
  assert v_confirm ->> 'status' = 'confirmed', 'order confirmation failed';
  assert jsonb_array_length(v_confirm -> 'tickets') = 4, 'confirmation did not create four tickets';
  assert (v_confirm ->> 'latePayment')::boolean = false, 'fresh payment marked late';
  v_order_id := (v_confirm ->> 'orderId')::uuid;

  select count(*)::integer into v_count from public.event_tickets where order_id = v_order_id;
  assert v_count = 4, 'ticket row count mismatch';
  assert not exists (
    select 1 from public.event_tickets
     where order_id = v_order_id and short_code !~ '^[A-F0-9]{10}$'
  ), 'ticket code format mismatch';

  -- Payment replay is idempotent and cannot mint extra tickets.
  v_duplicate := public.event_confirm_ticket_order(
    v_cross_intent,
    'pay_tomate_transactional_test',
    160000,
    'ARS',
    'e2e.test@pasito.app',
    'Prueba Transaccional'
  );
  assert v_duplicate ->> 'status' = 'duplicate', 'duplicate payment was not idempotent';
  select count(*)::integer into v_count from public.event_tickets where order_id = v_order_id;
  assert v_count = 4, 'duplicate payment minted extra tickets';

  -- Preparing a reward creates one pending assignment per ticket. The signed
  -- link later submits one support ID for every entry in one atomic claim.
  v_reward := public.event_prepare_order_pasitos(v_order_id);
  assert v_reward ->> 'status' = 'pending', 'reward preparation failed';
  assert (v_reward ->> 'amount')::integer = 140, 'pending reward amount mismatch';
  assert (v_reward ->> 'quantity')::integer = 4, 'pending reward quantity mismatch';
  assert jsonb_array_length(v_reward -> 'entries') = 4, 'expected one reward entry per ticket';
  assert (select status from public.event_pasito_rewards where order_id = v_order_id) = 'pending',
    'reward summary did not stay pending';
  assert (select count(*) from public.event_pasito_reward_entries where order_id = v_order_id and status = 'pending') = 4,
    'reward entries were not prepared';

  select p.id, p.pasitos_balance, p.total_pasitos_earned
    into v_reward_user_id, v_reward_balance, v_reward_total
    from public.profiles p
   order by p.created_at, p.id
   limit 1;
  select p.id, p.pasitos_balance, p.total_pasitos_earned
    into v_second_reward_user_id, v_second_reward_balance, v_second_reward_total
    from public.profiles p
   order by p.created_at, p.id
   offset 1
   limit 1;
  assert v_reward_user_id is not null and v_second_reward_user_id is not null,
    'two support IDs are required for the group reward test';

  -- One unknown support ID rejects the whole submission; no account receives
  -- a partial credit and the link remains available for correction.
  v_reward := public.event_claim_order_pasitos_by_support_ids(
    v_order_id,
    array[
      v_reward_user_id,
      v_second_reward_user_id,
      v_reward_user_id,
      '00000000-0000-4000-8000-000000000000'::uuid
    ]
  );
  assert v_reward ->> 'status' = 'account_not_found', 'unknown support ID was accepted';
  assert v_reward -> 'invalidPositions' = '[4]'::jsonb, 'invalid support ID position was not returned';
  assert (select count(*) from public.event_pasito_reward_entries where order_id = v_order_id and status = 'credited') = 0,
    'invalid group claim partially credited entries';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance,
    'invalid group claim changed the first balance';
  assert (select pasitos_balance from public.profiles where id = v_second_reward_user_id) = v_second_reward_balance,
    'invalid group claim changed the second balance';

  -- Reusing one support ID is allowed. With ticket bonuses 50, 50, 20, 20,
  -- alternating two IDs gives each account 70 Pasitos.
  v_reward := public.event_claim_order_pasitos_by_support_ids(
    v_order_id,
    array[v_reward_user_id, v_second_reward_user_id, v_reward_user_id, v_second_reward_user_id]
  );
  assert v_reward ->> 'status' = 'credited', 'support IDs did not receive the group reward';
  assert not (v_reward ->> 'alreadyCredited')::boolean, 'first reward claim marked as duplicate';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 70,
    'reward did not increment first balance';
  assert (select total_pasitos_earned from public.profiles where id = v_reward_user_id) = v_reward_total + 70,
    'reward did not increment first lifetime earnings';
  assert (select pasitos_balance from public.profiles where id = v_second_reward_user_id) = v_second_reward_balance + 70,
    'reward did not increment second balance';
  assert (select total_pasitos_earned from public.profiles where id = v_second_reward_user_id) = v_second_reward_total + 70,
    'reward did not increment second lifetime earnings';

  v_reward := public.event_claim_order_pasitos_by_support_ids(
    v_order_id,
    array[v_second_reward_user_id, v_second_reward_user_id, v_second_reward_user_id, v_second_reward_user_id]
  );
  assert (v_reward ->> 'alreadyCredited')::boolean, 'duplicate reward claim was not idempotent';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 70,
    'duplicate reward claim minted extra Pasitos';
  assert (select pasitos_balance from public.profiles where id = v_second_reward_user_id) = v_second_reward_balance + 70,
    'duplicate reward claim changed the second balance';

  -- A separate two-ticket order can intentionally send every ticket bonus to
  -- one support ID.
  v_result := public.event_reserve_tickets(
    'pasito-tomate-sql-test', 2, repeat('8', 64), repeat('9', 64)
  );
  assert v_result ->> 'status' = 'reserved', 'same-support reservation failed';
  assert (v_result ->> 'amount')::integer = 90000, 'same-support order should use two 45k tickets';
  v_same_support_intent := (v_result ->> 'intentId')::uuid;
  v_confirm := public.event_confirm_ticket_order(
    v_same_support_intent,
    'pay_tomate_same_support_test',
    90000,
    'ARS',
    'same-support@pasito.app',
    'Mismo ID'
  );
  v_same_support_order_id := (v_confirm ->> 'orderId')::uuid;
  v_reward := public.event_prepare_order_pasitos(v_same_support_order_id);
  assert (v_reward ->> 'amount')::integer = 40, 'same-support reward amount mismatch';
  v_reward := public.event_claim_order_pasitos_by_support_ids(
    v_same_support_order_id,
    array[v_reward_user_id, v_reward_user_id]
  );
  assert v_reward ->> 'status' = 'credited', 'same support ID for every ticket was rejected';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 110,
    'same support ID did not receive both ticket bonuses';
  assert public.event_update_order_payment('pay_tomate_same_support_test', 'refunded') = 'updated',
    'same-support cleanup refund failed';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 70,
    'same-support refund did not restore the first-order balance';

  -- Recovery claims are generic and rate-limited per purchaser.
  assert public.event_claim_ticket_recovery('pasito-tomate-sql-test', 'e2e.test@pasito.app') ->> 'status' = 'claimed',
    'first recovery claim failed';
  assert public.event_claim_ticket_recovery('pasito-tomate-sql-test', 'e2e.test@pasito.app') ->> 'status' = 'rate_limited',
    'recovery cooldown failed';

  select id into v_ticket_id from public.event_tickets where order_id = v_order_id order by ticket_number limit 1;
  select id into v_second_ticket_id from public.event_tickets where order_id = v_order_id order by ticket_number offset 1 limit 1;

  v_redeem := public.event_redeem_ticket(
    'pasito-tomate-sql-test', v_ticket_id, null, 'SQL test', 'qr'
  );
  assert v_redeem ->> 'status' = 'admitted', 'valid ticket was not admitted';
  v_redeem := public.event_redeem_ticket(
    'pasito-tomate-sql-test', v_ticket_id, null, 'SQL test', 'qr'
  );
  assert v_redeem ->> 'status' = 'already_used', 'double check-in was not rejected';

  assert public.event_update_order_payment('pay_tomate_transactional_test', 'refunded') = 'updated',
    'refund update failed';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance,
    'refund did not reverse first Pasitos balance';
  assert (select total_pasitos_earned from public.profiles where id = v_reward_user_id) = v_reward_total,
    'refund did not reverse first lifetime earnings';
  assert (select pasitos_balance from public.profiles where id = v_second_reward_user_id) = v_second_reward_balance,
    'refund did not reverse second Pasitos balance';
  assert (select total_pasitos_earned from public.profiles where id = v_second_reward_user_id) = v_second_reward_total,
    'refund did not reverse second lifetime earnings';

  assert public.event_update_order_payment('pay_tomate_transactional_test', 'approved') = 'updated',
    'payment reapproval failed';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 70,
    'payment reapproval did not restore first account Pasitos';
  assert (select pasitos_balance from public.profiles where id = v_second_reward_user_id) = v_second_reward_balance + 70,
    'payment reapproval did not restore second account Pasitos';
  assert public.event_update_order_payment('pay_tomate_transactional_test', 'refunded') = 'updated',
    'second refund update failed';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance,
    'second refund was not idempotent';
  assert (select pasitos_balance from public.profiles where id = v_second_reward_user_id) = v_second_reward_balance,
    'second refund changed the second account balance';
  v_redeem := public.event_redeem_ticket(
    'pasito-tomate-sql-test', v_second_ticket_id, null, 'SQL test', 'qr'
  );
  assert v_redeem ->> 'status' = 'void', 'refunded ticket was not voided';

  assert public.event_consume_rate_limit('sql-test', repeat('7', 64), 2, 900),
    'rate limit attempt one failed';
  assert public.event_consume_rate_limit('sql-test', repeat('7', 64), 2, 900),
    'rate limit attempt two failed';
  assert not public.event_consume_rate_limit('sql-test', repeat('7', 64), 2, 900),
    'rate limit allowed attempt three';

  assert not has_table_privilege('anon', 'public.event_ticket_orders', 'select'),
    'anon can read private orders';
  assert not has_table_privilege('authenticated', 'public.event_tickets', 'select'),
    'authenticated users can read private tickets';
  assert not has_table_privilege('authenticated', 'public.event_pasito_rewards', 'select'),
    'authenticated users can read private Pasitos rewards';
  assert not has_table_privilege('authenticated', 'public.event_pasito_reward_entries', 'select'),
    'authenticated users can read private per-ticket Pasitos rewards';
  assert (select relrowsecurity from pg_class where oid = 'public.event_ticket_orders'::regclass),
    'orders RLS is disabled';
end;
$$;
