-- Allow support to clear one reviewed false-positive heuristic without
-- suppressing unrelated or future security warnings for the same user.

create table if not exists public.admin_user_suspicion_exemptions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  flag_key text not null check (flag_key ~ '^[a-z0-9_]{1,64}$'),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_by text not null check (char_length(btrim(created_by)) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (user_id, flag_key)
);

comment on table public.admin_user_suspicion_exemptions is
  'Auditable, flag-specific exceptions for false positives in admin suspicious-user heuristics.';

alter table public.admin_user_suspicion_exemptions enable row level security;
revoke all on table public.admin_user_suspicion_exemptions
  from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_user_suspicion_exemptions
  to service_role;

-- The admin RPCs predate this repository's migration history. Update whichever
-- supported overloads are present, while keeping the migration idempotent for
-- environments where the functions were already updated operationally.
do $change_functions$
declare
  target record;
  original_definition text;
  updated_definition text;
begin
  for target in
    select p.oid, requested.user_alias
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join (
      values
        ('get_admin_users_initial_sample'::text, 4::integer, 's'::text),
        ('get_admin_users_page'::text, 9::integer, 'pp'::text),
        ('get_admin_users_page'::text, 10::integer, 'pu'::text),
        ('get_admin_users_summary'::text, 3::integer, 'p'::text),
        ('get_admin_users_export'::text, 9::integer, 'cp'::text)
    ) as requested(function_name, argument_count, user_alias)
      on requested.function_name = p.proname
     and requested.argument_count = p.pronargs
    where n.nspname = 'public'
  loop
    original_definition := pg_get_functiondef(target.oid);

    if strpos(lower(original_definition), 'admin_user_suspicion_exemptions') > 0
       or strpos(lower(original_definition), 'saldo alto con pocos canjes') = 0 then
      continue;
    end if;

    updated_definition := regexp_replace(
      original_definition,
      'then[[:space:]]+''Saldo alto con pocos canjes''[[:space:]]+end',
      format(
        'AND NOT EXISTS (
          SELECT 1
          FROM public.admin_user_suspicion_exemptions exemption
          WHERE exemption.user_id = %I.id
            AND exemption.flag_key = ''high_balance_low_redemptions''
        ) THEN ''Saldo alto con pocos canjes'' END',
        target.user_alias
      ),
      'i'
    );

    if updated_definition = original_definition then
      raise exception 'Suspicious flag expression not found for function oid %', target.oid;
    end if;

    execute updated_definition;
  end loop;
end;
$change_functions$;
