-- Preserve the existing ARS checkout; the Uruguay wrapper sets UYU atomically.
alter table public.event_checkout_intents drop constraint event_checkout_intents_currency_check;
alter table public.event_checkout_intents add constraint event_checkout_intents_currency_check check (currency in ('ARS', 'UYU'));
alter table public.event_ticket_orders drop constraint event_ticket_orders_currency_check;
alter table public.event_ticket_orders add constraint event_ticket_orders_currency_check check (currency in ('ARS', 'UYU'));

create or replace function public.event_reserve_walking_club_uy_tickets(
  p_quantity integer, p_client_key_hash text, p_client_ip_hash text, p_promo_code text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb;
begin
  v_result := public.event_reserve_tickets('pasito-walking-club-uy-2026', p_quantity, p_client_key_hash, p_client_ip_hash, p_promo_code);
  if v_result->>'status' = 'reserved' then
    update public.event_checkout_intents set currency = 'UYU' where id = (v_result->>'intentId')::uuid;
    v_result := jsonb_set(v_result, '{currency}', '"UYU"'::jsonb);
  end if;
  return v_result;
end;
$$;
revoke all on function public.event_reserve_walking_club_uy_tickets(integer, text, text, text) from public, anon, authenticated;
grant execute on function public.event_reserve_walking_club_uy_tickets(integer, text, text, text) to service_role;
