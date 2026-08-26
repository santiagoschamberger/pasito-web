-- The complete snapshot remains daily because it is intentionally expensive.
-- Refresh only the optimized marketing rollup during the day so late-arriving
-- daily_activity rows converge toward the live Metabase result.

do $$
begin
  perform cron.unschedule('refresh-brand-data-room-marketing-intraday');
exception
  when others then null;
end;
$$;

-- 11:00, 14:00, 17:00 and 20:00 in Argentina (UTC-3). The full snapshot runs
-- separately at 09:00. Production history keeps this function below 2 minutes.
select cron.schedule(
  'refresh-brand-data-room-marketing-intraday',
  '0 14,17,20,23 * * *',
  'select public.refresh_brand_data_room_marketing_snapshots()'
);
