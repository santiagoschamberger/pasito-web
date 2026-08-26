-- Cover the two date-window scans used by the daily data-room refresh.
-- Production creates these concurrently before this migration is deployed;
-- IF NOT EXISTS keeps the migration safe and reproducible elsewhere.

create index if not exists idx_daily_activity_opened_date_user
  on public.daily_activity (date, user_id)
  include (validated_steps, pasitos_earned)
  where opened_app = true;

create index if not exists idx_notification_deliveries_sent_at_user_status
  on public.notification_deliveries (sent_at, user_id)
  include (status)
  where status in ('sent', 'opened');
