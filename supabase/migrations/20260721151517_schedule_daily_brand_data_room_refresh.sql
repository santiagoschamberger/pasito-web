-- Refresh the private data room once per completed reporting day.
--
-- The previous SQL cron called the function while the database-wide 2 minute
-- statement timeout was already active. Function-level settings cannot extend
-- a timer that started before the function call, so the refresh was cancelled
-- every time. Set the timeout in a separate statement before starting the
-- refresh query.

do $$
begin
  perform cron.unschedule('brand-data-room-catalog-sync-five-times-daily');
exception
  when others then null;
end;
$$;

do $$
begin
  perform cron.unschedule('brand-data-room-mixpanel-sync-daily');
exception
  when others then null;
end;
$$;

do $$
begin
  perform cron.unschedule('refresh-brand-data-room-snapshots');
exception
  when others then null;
end;
$$;

do $$
begin
  perform cron.unschedule('refresh-brand-data-room-snapshots-daily');
exception
  when others then null;
end;
$$;

-- 08:30 in Argentina (UTC-3): load Mixpanel's last completed calendar day.
select cron.schedule(
  'brand-data-room-mixpanel-sync-daily',
  '30 11 * * *',
  $cron$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'brand_data_room_sync_project_url'
      ) || '/functions/v1/sync-catalog-analytics',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'brand_data_room_mixpanel_sync_token'
        )
      ),
      body := jsonb_build_object('source', 'cron'),
      timeout_milliseconds := 120000
    ) as request_id;
  $cron$
);

-- 09:00 in Argentina (UTC-3): publish one coherent snapshot after Mixpanel.
-- Supabase recommends keeping cron jobs under 10 minutes, so retain the
-- function's existing 9 minute ceiling rather than disabling the timeout.
select cron.schedule(
  'refresh-brand-data-room-snapshots-daily',
  '0 12 * * *',
  $cron$
    set statement_timeout = '9min';
    select public.refresh_brand_data_room_snapshots();
  $cron$
);

comment on table public.brand_data_room_snapshots is
  'Server-only aggregate, anonymized brand insights. Refreshed daily after the Mixpanel sync.';
