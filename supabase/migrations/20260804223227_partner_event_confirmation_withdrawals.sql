-- Confirmation campaign tracking and one-use withdrawal links for partner
-- events. The public Edge Function only receives an opaque token; all email,
-- participant and balance mutations remain private to service_role.

create table public.partner_event_confirmation_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.partner_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign text not null,
  token_hash text check (token_hash is null or token_hash ~ '^[a-f0-9]{64}$'),
  token_expires_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'sent', 'failed')),
  claim_expires_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  resend_email_id text,
  last_error text,
  sent_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_event_confirmation_delivery_recipient_key
    unique (event_id, user_id, campaign),
  constraint partner_event_confirmation_delivery_token_key
    unique (token_hash)
);

create index partner_event_confirmation_deliveries_claim_idx
  on public.partner_event_confirmation_deliveries (event_id, campaign, status, created_at)
  where sent_at is null;

alter table public.partner_event_confirmation_deliveries enable row level security;

revoke all on table public.partner_event_confirmation_deliveries
  from public, anon, authenticated;
grant select, insert, update, delete on table public.partner_event_confirmation_deliveries
  to service_role;

comment on table public.partner_event_confirmation_deliveries is
  'Private delivery ledger and hashed one-use withdrawal tokens for partner-event confirmation campaigns.';

create or replace function public.partner_event_claim_confirmation_email_batch(
  p_event_slug text,
  p_campaign text,
  p_limit integer default 50
) returns table (
  delivery_id uuid,
  event_id uuid,
  user_id uuid,
  email text,
  display_name text,
  token text,
  token_expires_at timestamptz,
  attempt_number integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if p_event_slug is null
     or p_event_slug !~ '^[a-z0-9][a-z0-9-]{0,99}$'
     or p_campaign is null
     or p_campaign !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'Invalid event or campaign';
  end if;

  insert into public.partner_event_confirmation_deliveries (
    event_id, user_id, campaign
  )
  select participant.event_id, participant.user_id, p_campaign
    from public.partner_events event
    join public.partner_event_participants participant
      on participant.event_id = event.id
     and participant.status = 'active'
    join auth.users account
      on account.id = participant.user_id
     and account.email is not null
   where event.slug = p_event_slug
     and event.is_active = true
     and now() < coalesce(event.join_closes_at, event.start_at)
  on conflict on constraint partner_event_confirmation_delivery_recipient_key
  do nothing;

  return query
  with candidates as (
    select delivery.id
      from public.partner_event_confirmation_deliveries delivery
      join public.partner_events event on event.id = delivery.event_id
      join public.partner_event_participants participant
        on participant.event_id = delivery.event_id
       and participant.user_id = delivery.user_id
       and participant.status = 'active'
      join auth.users account
        on account.id = delivery.user_id
       and account.email is not null
     where event.slug = p_event_slug
       and delivery.campaign = p_campaign
       and delivery.sent_at is null
       and now() < coalesce(event.join_closes_at, event.start_at)
       and (
         delivery.status in ('pending', 'failed')
         or (
           delivery.status = 'claimed'
           and delivery.claim_expires_at <= now()
         )
       )
     order by delivery.created_at, delivery.id
     limit v_limit
     for update of delivery skip locked
  ), generated_tokens as (
    select candidate.id, encode(extensions.gen_random_bytes(32), 'hex') as raw_token
      from candidates candidate
  ), claimed as (
    update public.partner_event_confirmation_deliveries delivery
       set token_hash = encode(extensions.digest(generated.raw_token, 'sha256'), 'hex'),
           token_expires_at = coalesce(event.join_closes_at, event.start_at),
           status = 'claimed',
           claim_expires_at = now() + interval '30 minutes',
           attempts = delivery.attempts + 1,
           last_error = null,
           updated_at = now()
      from generated_tokens generated,
           public.partner_events event
     where delivery.id = generated.id
       and event.id = delivery.event_id
    returning delivery.id,
              delivery.event_id,
              delivery.user_id,
              generated.raw_token,
              delivery.token_expires_at,
              delivery.attempts
  )
  select claimed.id,
         claimed.event_id,
         claimed.user_id,
         lower(account.email)::text,
         profile.display_name,
         claimed.raw_token,
         claimed.token_expires_at,
         claimed.attempts
    from claimed
    join auth.users account on account.id = claimed.user_id
    left join public.profiles profile on profile.id = claimed.user_id
   order by claimed.id;
end;
$$;

create or replace function public.partner_event_record_confirmation_email_attempt(
  p_delivery_id uuid,
  p_resend_email_id text,
  p_error text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.partner_event_confirmation_deliveries
     set status = case when p_resend_email_id is not null then 'sent' else 'failed' end,
         resend_email_id = case
           when p_resend_email_id is not null then coalesce(resend_email_id, p_resend_email_id)
           else resend_email_id
         end,
         sent_at = case
           when p_resend_email_id is not null then coalesce(sent_at, now())
           else sent_at
         end,
         last_error = case
           when p_resend_email_id is not null then null
           else left(coalesce(p_error, 'Unknown email delivery error'), 1000)
         end,
         claim_expires_at = null,
         updated_at = now()
   where id = p_delivery_id
     and sent_at is null;

  if not found then
    raise exception 'Confirmation delivery not found or already sent';
  end if;
end;
$$;

create or replace function public.partner_event_preview_withdrawal(
  p_token_hash text
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select delivery.withdrawn_at,
         delivery.token_expires_at,
         participant.status as participant_status,
         participant.entry_cost_paid,
         event.title,
         event.start_at,
         event.end_at,
         event.address,
         event.max_participants,
         event.participant_count
    into v_row
    from public.partner_event_confirmation_deliveries delivery
    join public.partner_events event on event.id = delivery.event_id
    join public.partner_event_participants participant
      on participant.event_id = delivery.event_id
     and participant.user_id = delivery.user_id
   where delivery.token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_row.withdrawn_at is not null or v_row.participant_status = 'refunded' then
    return jsonb_build_object(
      'status', 'already_withdrawn',
      'title', v_row.title,
      'refunded_pasitos', v_row.entry_cost_paid
    );
  end if;

  if v_row.participant_status <> 'active' then
    return jsonb_build_object('status', 'not_active', 'title', v_row.title);
  end if;

  if v_row.token_expires_at is null or now() >= v_row.token_expires_at then
    return jsonb_build_object('status', 'expired', 'title', v_row.title);
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'title', v_row.title,
    'start_at', v_row.start_at,
    'end_at', v_row.end_at,
    'address', v_row.address,
    'refunded_pasitos', v_row.entry_cost_paid,
    'spots_left', case
      when v_row.max_participants is null then null
      else greatest(v_row.max_participants - v_row.participant_count, 0)
    end
  );
end;
$$;

create or replace function public.partner_event_withdraw_registration(
  p_token_hash text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery public.partner_event_confirmation_deliveries%rowtype;
  v_event public.partner_events%rowtype;
  v_participant public.partner_event_participants%rowtype;
  v_spots_left integer;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  select *
    into v_delivery
    from public.partner_event_confirmation_deliveries delivery
   where delivery.token_hash = p_token_hash
   for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  select *
    into v_event
    from public.partner_events event
   where event.id = v_delivery.event_id
   for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  select *
    into v_participant
    from public.partner_event_participants participant
   where participant.event_id = v_delivery.event_id
     and participant.user_id = v_delivery.user_id
   for update;

  if not found then
    return jsonb_build_object('status', 'not_active', 'title', v_event.title);
  end if;

  if v_delivery.withdrawn_at is not null or v_participant.status = 'refunded' then
    return jsonb_build_object(
      'status', 'already_withdrawn',
      'title', v_event.title,
      'refunded_pasitos', v_participant.entry_cost_paid
    );
  end if;

  if v_participant.status <> 'active' then
    return jsonb_build_object('status', 'not_active', 'title', v_event.title);
  end if;

  if v_delivery.token_expires_at is null or now() >= v_delivery.token_expires_at then
    return jsonb_build_object('status', 'expired', 'title', v_event.title);
  end if;

  if v_participant.entry_cost_paid > 0 then
    perform public.refund_pasitos(v_delivery.user_id, v_participant.entry_cost_paid);

    insert into public.partner_event_transactions (
      event_id, user_id, type, amount, idempotency_key
    ) values (
      v_delivery.event_id,
      v_delivery.user_id,
      'refund',
      v_participant.entry_cost_paid,
      'partner_event_email_withdrawal:' || v_delivery.event_id::text || ':' || v_delivery.user_id::text
    )
    on conflict (idempotency_key) do nothing;
  end if;

  update public.partner_event_participants
     set status = 'refunded'
   where event_id = v_delivery.event_id
     and user_id = v_delivery.user_id;

  update public.partner_events
     set participant_count = greatest(participant_count - 1, 0),
         pasitos_pool = greatest(pasitos_pool - v_participant.entry_cost_paid, 0),
         updated_at = now()
   where id = v_delivery.event_id
  returning case
    when max_participants is null then null
    else greatest(max_participants - participant_count, 0)
  end into v_spots_left;

  update public.partner_event_confirmation_deliveries
     set withdrawn_at = now(), updated_at = now()
   where event_id = v_delivery.event_id
     and user_id = v_delivery.user_id;

  return jsonb_build_object(
    'status', 'withdrawn',
    'title', v_event.title,
    'refunded_pasitos', v_participant.entry_cost_paid,
    'spots_left', v_spots_left
  );
end;
$$;

revoke all on function public.partner_event_claim_confirmation_email_batch(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.partner_event_claim_confirmation_email_batch(text, text, integer)
  to service_role;

revoke all on function public.partner_event_record_confirmation_email_attempt(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.partner_event_record_confirmation_email_attempt(uuid, text, text)
  to service_role;

revoke all on function public.partner_event_preview_withdrawal(text)
  from public, anon, authenticated;
grant execute on function public.partner_event_preview_withdrawal(text)
  to service_role;

revoke all on function public.partner_event_withdraw_registration(text)
  from public, anon, authenticated;
grant execute on function public.partner_event_withdraw_registration(text)
  to service_role;
