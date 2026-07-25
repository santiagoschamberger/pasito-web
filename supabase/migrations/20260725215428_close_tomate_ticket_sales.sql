-- Ticket sales were manually closed after 239 confirmed tickets. Keeping the
-- tiers active with capacity equal to confirmed sales makes the reservation
-- RPC return `sold_out` while preserving the final inventory breakdown.
with final_tiers (position, capacity) as (
  values
    (1, 100),
    (2, 100),
    (3, 39)
)
update public.event_ticket_tiers tier
set capacity = final.capacity,
    is_active = true
from final_tiers final
where tier.event_slug = 'pasito-tomate-2026'
  and tier.position = final.position;
