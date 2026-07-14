create index if not exists brand_data_room_accesses_created_by_idx
  on public.brand_data_room_accesses (created_by)
  where created_by is not null;

create index if not exists brand_data_room_events_session_id_idx
  on public.brand_data_room_events (session_id)
  where session_id is not null;
