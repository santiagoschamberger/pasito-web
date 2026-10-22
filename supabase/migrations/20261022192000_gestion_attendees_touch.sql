-- Toda modificación de un asistente mueve updated_at: la puerta sincroniza por
-- esa marca, así que borrados y restauraciones también le llegan.
create or replace function public.gestion_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger gestion_attendees_touch before update on public.gestion_attendees
  for each row execute function public.gestion_touch_updated_at();

-- Para no mandar el QR dos veces a la misma persona.
alter table public.gestion_attendees add column if not exists qr_sent_at timestamptz;
