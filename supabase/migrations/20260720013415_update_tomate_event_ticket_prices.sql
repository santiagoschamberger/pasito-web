update public.event_ticket_tiers
set unit_price = case position
  when 1 then 35000
  when 2 then 45000
  when 3 then 55000
  else unit_price
end
where event_slug = 'pasito-tomate-2026'
  and position in (1, 2, 3);
