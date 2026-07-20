-- Pickup orders already had a verified Resend id in the legacy tracking
-- columns. Reuse that evidence so historical successful emails do not appear
-- as pending in the unified confirmation tracking.

update public.tienda_orders
   set confirmation_email_sent_at = pickup_instructions_sent_at,
       confirmation_email_id = pickup_instructions_email_id,
       confirmation_email_attempts = greatest(confirmation_email_attempts, 1),
       confirmation_email_last_attempt_at = pickup_instructions_sent_at,
       confirmation_email_last_error = null
 where confirmation_email_sent_at is null
   and pickup_instructions_sent_at is not null
   and pickup_instructions_email_id is not null;
