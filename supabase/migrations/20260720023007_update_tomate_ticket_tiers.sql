-- Set the final TOMATE ticket promotion. The database is authoritative for
-- reservations and rewards; the website mirrors these values for display.
with desired_tiers (position, name, capacity, pasitos_bonus) as (
  values
    (1, 'Tanda 1', 100, 70),
    (2, 'Tanda 2', 100, 50),
    (3, 'Tanda 3', null::integer, 20)
)
update public.event_ticket_tiers tier
   set name = desired.name,
       capacity = desired.capacity,
       pasitos_bonus = desired.pasitos_bonus
  from desired_tiers desired
 where tier.event_slug = 'pasito-tomate-2026'
   and tier.position = desired.position;

-- Preserve completed orders. Active unpaid holds only receive increases, so
-- no buyer loses a bonus that was shown when the price was reserved.
update public.event_ticket_reservations reservation
   set pasitos_bonus = tier.pasitos_bonus
  from public.event_ticket_tiers tier
 where reservation.tier_id = tier.id
   and tier.event_slug = 'pasito-tomate-2026'
   and reservation.status = 'held'
   and reservation.pasitos_bonus < tier.pasitos_bonus;
