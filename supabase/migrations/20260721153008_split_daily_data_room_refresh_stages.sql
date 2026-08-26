-- Keep one atomic daily refresh while giving each expensive stage its own
-- statement timeout. PostgreSQL applies statement_timeout per statement, and
-- pg_cron executes this multi-statement command as one transaction: either all
-- stages commit or none of them do.

do $$
begin
  perform cron.unschedule('refresh-brand-data-room-snapshots-daily');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'refresh-brand-data-room-snapshots-daily',
  '0 12 * * *',
  $cron$
    set statement_timeout = '9min';
    select public.refresh_brand_data_room_engagement_snapshots();
    select public.refresh_brand_data_room_marketing_snapshots();
    select public.refresh_brand_data_room_push_snapshots();
    select public.refresh_brand_data_room_mixpanel_snapshots();
    select public.refresh_brand_data_room_activity_timeline_snapshots();
  $cron$
);
