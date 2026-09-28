-- Uruguay Walking Club event ticketing setup
-- Oct 10, 2026 at Casa Fauno, Parque Rodó (Montevideo)

insert into public.event_ticket_tiers (event_slug, position, name, unit_price, capacity)
values
  ('pasito-walking-club-uy-2026', 1, 'Tanda 1 · 100 cupos', 1190, 100),
  ('pasito-walking-club-uy-2026', 2, 'Tanda 2 · 70 cupos', 1290, 70),
  ('pasito-walking-club-uy-2026', 3, 'Tanda 3 · 30 cupos', 1390, 30);

comment on column public.event_ticket_tiers.unit_price is
  'Price per ticket in major currency units. For UYU events like walking-club-uy-2026: 1190 = $1190 UYU.';
