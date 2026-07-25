-- Ticket sales were manually closed after 239 confirmed tickets. Disabling
-- every tier keeps the reservation RPC authoritative even if display data is
-- stale or unavailable.
update public.event_ticket_tiers
set is_active = false
where event_slug = 'pasito-tomate-2026';
