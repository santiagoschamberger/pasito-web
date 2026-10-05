create table if not exists public.pasito_club_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  notify_tickets boolean not null default false,
  source text not null default 'pasito_club_landing',
  user_agent text,
  created_at timestamptz not null default now(),
  constraint pasito_club_waitlist_email_key unique (email)
);

alter table public.pasito_club_waitlist enable row level security;

create index if not exists pasito_club_waitlist_created_at_idx
  on public.pasito_club_waitlist (created_at desc);
