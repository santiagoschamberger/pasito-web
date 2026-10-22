-- Eventos Pasito: portada por evento y bucket público para logos y portadas.
alter table public.gestion_events add column if not exists cover_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gestion-public', 'gestion-public', true, 3145728, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
