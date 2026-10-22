-- Eventos Pasito: moneda por evento (Uruguay vende en pesos uruguayos con dLocal).
alter table public.gestion_events add column if not exists currency text not null default 'ARS';
do $$ begin
  alter table public.gestion_events add constraint gestion_events_currency_check check (currency in ('ARS', 'UYU', 'USD'));
exception when duplicate_object then null; end $$;
