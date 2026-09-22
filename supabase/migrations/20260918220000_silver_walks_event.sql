-- Silver Walks: single-tier event with 200 capacity at ARS 35.000

begin;

insert into public.event_ticket_tiers (event_slug, position, name, unit_price, capacity)
values
  ('silver-walks-2026-09', 1, 'Entrada general', 35000, 200)
on conflict (event_slug, position) do update
set name = excluded.name,
    unit_price = excluded.unit_price,
    capacity = excluded.capacity,
    is_active = true;

commit;
