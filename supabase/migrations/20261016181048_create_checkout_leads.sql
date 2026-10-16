-- Emails de todas las personas que inician un checkout (entradas, tienda, club),
-- hayan pagado o no, para poder retargetear a quienes abandonan.
create table if not exists public.checkout_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null,
  attempts integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint checkout_leads_email_source_key unique (email, source),
  constraint checkout_leads_email_format check (email = lower(btrim(email)) and length(email) between 3 and 254),
  constraint checkout_leads_source_format check (source ~ '^[a-z0-9_-]{2,60}$')
);

alter table public.checkout_leads enable row level security;

create index if not exists checkout_leads_last_seen_at_idx
  on public.checkout_leads (last_seen_at desc);

create or replace function public.record_checkout_lead(
  p_email text,
  p_source text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.checkout_leads (email, source)
  values (lower(btrim(p_email)), p_source)
  on conflict (email, source) do update
    set attempts = public.checkout_leads.attempts + 1,
        last_seen_at = now();
$$;

revoke all on function public.record_checkout_lead(text, text) from public, anon, authenticated;
grant execute on function public.record_checkout_lead(text, text) to service_role;
