-- Run after the Uruguay migrations, inside a transaction and roll back.
do $$
declare
  v_quote jsonb;
  v_order jsonb;
  v_duplicate jsonb;
  v_currency text;
  v_count integer;
begin
  if has_function_privilege('anon', 'public.event_reserve_walking_club_uy_tickets(integer,text,text,text)', 'execute') then
    raise exception 'Anonymous clients must not reserve directly';
  end if;
  v_quote := public.event_reserve_walking_club_uy_tickets(2, repeat('a',64), repeat('b',64));
  if v_quote->>'status' <> 'reserved' or v_quote->>'currency' <> 'UYU' or (v_quote->>'amount')::int <> 2380 then
    raise exception 'Unexpected Uruguay quote: %', v_quote;
  end if;
  select currency into v_currency from public.event_checkout_intents where id=(v_quote->>'intentId')::uuid;
  if v_currency <> 'UYU' then raise exception 'Intent stored wrong currency'; end if;
  v_order := public.event_confirm_ticket_order((v_quote->>'intentId')::uuid, 'dlocalgo:DP-rollback-test', 2380, 'ARS', 'rollback@example.com', 'Test');
  if v_order->>'status' <> 'amount_mismatch' then raise exception 'ARS confirmation accepted'; end if;
  v_order := public.event_confirm_ticket_order((v_quote->>'intentId')::uuid, 'dlocalgo:DP-rollback-test', 2380, 'UYU', 'rollback@example.com', 'Test');
  if v_order->>'status' <> 'confirmed' then raise exception 'Confirmation failed: %', v_order; end if;
  v_duplicate := public.event_confirm_ticket_order((v_quote->>'intentId')::uuid, 'dlocalgo:DP-rollback-test', 2380, 'UYU', 'rollback@example.com', 'Test');
  if v_duplicate->>'status' <> 'duplicate' or v_duplicate->>'orderId' <> v_order->>'orderId' then raise exception 'Idempotency failed'; end if;
  select count(*) into v_count from public.event_tickets where order_id=(v_order->>'orderId')::uuid;
  if v_count <> 2 then raise exception 'Wrong ticket count'; end if;
  -- Existing events still use the original ARS function.
  insert into public.event_ticket_tiers(event_slug, position, name, unit_price, capacity)
    values ('rollback-ars-test', 1, 'Test', 100, 2);
  v_quote := public.event_reserve_tickets('rollback-ars-test', 1, repeat('c',64), repeat('d',64));
  if v_quote->>'currency' <> 'ARS' then raise exception 'ARS regression'; end if;
end;
$$;
