begin;

alter table public.event_checkout_intents
  add column terms_accepted_at timestamptz,
  add column terms_version text;

alter table public.event_checkout_intents
  add constraint event_checkout_intents_terms_acceptance_check
  check (
    (terms_accepted_at is null and terms_version is null)
    or
    (terms_accepted_at is not null and terms_version ~ '^[0-9]{4}-[0-9]{2}$')
  );

comment on column public.event_checkout_intents.terms_accepted_at is
  'Server-recorded timestamp when the buyer accepted the event terms.';
comment on column public.event_checkout_intents.terms_version is
  'Version of the event terms accepted by the buyer.';

commit;
