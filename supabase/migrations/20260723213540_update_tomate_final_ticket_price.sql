-- Keep the database-authoritative checkout price aligned with the landing.
-- This tier has no issued tickets or active holds at the time of the change.
update public.event_ticket_tiers
set unit_price = 48000
where event_slug = 'pasito-tomate-2026'
  and position = 3;

do $$
begin
  if not exists (
    select 1
    from public.event_ticket_tiers
    where event_slug = 'pasito-tomate-2026'
      and position = 3
      and unit_price = 48000
  ) then
    raise exception 'TOMATE final ticket tier price was not updated to ARS 48,000';
  end if;
end
$$;
