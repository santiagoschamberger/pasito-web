-- Run after the ticketing migration inside a transaction that is rolled back.
-- Any failed assertion aborts the query.
do $$
declare
  v_result jsonb;
  v_first_intent uuid;
  v_replacement_intent uuid;
  v_cross jsonb;
  v_cross_intent uuid;
  v_confirm jsonb;
  v_duplicate jsonb;
  v_order_id uuid;
  v_ticket_id uuid;
  v_second_ticket_id uuid;
  v_redeem jsonb;
  v_reward jsonb;
  v_reward_user_id uuid;
  v_reward_email text;
  v_reward_balance integer;
  v_reward_total integer;
  v_count integer;
  v_i integer;
begin
  insert into public.event_ticket_tiers (
    event_slug, position, name, unit_price, capacity, pasitos_bonus
  ) values
    ('pasito-tomate-sql-test', 1, 'Primeras 100', 25000, 100, 50),
    ('pasito-tomate-sql-test', 2, 'Siguientes 100', 35000, 100, 20),
    ('pasito-tomate-sql-test', 3, 'Precio final', 45000, null, 70);

  select count(*)::integer into v_count
    from public.event_ticket_tiers
   where event_slug = 'pasito-tomate-sql-test';
  assert v_count = 3, 'expected three seeded tiers';

  v_result := public.event_reserve_tickets(
    'pasito-tomate-sql-test', 1, repeat('1', 64), repeat('2', 64)
  );
  assert v_result ->> 'status' = 'reserved', 'first reservation failed';
  assert (v_result ->> 'amount')::integer = 25000, 'first-tier amount mismatch';
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

  -- Four tickets now span the 100-ticket price boundary: two at 25k and two at 35k.
  v_cross := public.event_reserve_tickets(
    'pasito-tomate-sql-test', 4, repeat('5', 64), repeat('6', 64)
  );
  assert v_cross ->> 'status' = 'reserved', 'cross-tier reservation failed';
  assert (v_cross ->> 'amount')::integer = 120000, 'cross-tier total must be 2x25k + 2x35k';
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
    120000,
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
    120000,
    'ARS',
    'e2e.test@pasito.app',
    'Prueba Transaccional'
  );
  assert v_duplicate ->> 'status' = 'duplicate', 'duplicate payment was not idempotent';
  select count(*)::integer into v_count from public.event_tickets where order_id = v_order_id;
  assert v_count = 4, 'duplicate payment minted extra tickets';

  -- A missing payment-email match creates one pending reward with the frozen
  -- amount. A verified alternate account can claim it exactly once.
  v_reward := public.event_claim_order_pasitos(v_order_id, 'missing-e2e-account@pasito.invalid');
  assert v_reward ->> 'status' = 'account_not_found', 'missing account should leave reward pending';
  assert (v_reward ->> 'amount')::integer = 140, 'pending reward amount mismatch';
  assert (select status from public.event_pasito_rewards where order_id = v_order_id) = 'pending',
    'missing account did not persist pending reward';

  select u.id, u.email, p.pasitos_balance, p.total_pasitos_earned
    into v_reward_user_id, v_reward_email, v_reward_balance, v_reward_total
    from auth.users u
    join public.profiles p on p.id = u.id
   where u.email is not null and u.email_confirmed_at is not null
   order by u.created_at
   limit 1;
  assert v_reward_user_id is not null, 'no verified test account available';

  v_reward := public.event_claim_order_pasitos(v_order_id, v_reward_email);
  assert v_reward ->> 'status' = 'credited', 'verified account did not receive reward';
  assert not (v_reward ->> 'alreadyCredited')::boolean, 'first reward claim marked as duplicate';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 140,
    'reward did not increment balance';
  assert (select total_pasitos_earned from public.profiles where id = v_reward_user_id) = v_reward_total + 140,
    'reward did not increment lifetime earnings';

  v_reward := public.event_claim_order_pasitos(v_order_id, v_reward_email);
  assert (v_reward ->> 'alreadyCredited')::boolean, 'duplicate reward claim was not idempotent';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 140,
    'duplicate reward claim minted extra Pasitos';

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
    'refund did not reverse Pasitos balance';
  assert (select total_pasitos_earned from public.profiles where id = v_reward_user_id) = v_reward_total,
    'refund did not reverse lifetime earnings';

  assert public.event_update_order_payment('pay_tomate_transactional_test', 'approved') = 'updated',
    'payment reapproval failed';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance + 140,
    'payment reapproval did not restore Pasitos';
  assert public.event_update_order_payment('pay_tomate_transactional_test', 'refunded') = 'updated',
    'second refund update failed';
  assert (select pasitos_balance from public.profiles where id = v_reward_user_id) = v_reward_balance,
    'second refund was not idempotent';
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
  assert (select relrowsecurity from pg_class where oid = 'public.event_ticket_orders'::regclass),
    'orders RLS is disabled';
end;
$$;
