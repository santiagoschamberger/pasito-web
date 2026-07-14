-- A zero returned before the first tracked event means there was no event
-- instrumentation yet, not a measured zero. Remove only those leading rows so
-- the data room states the honest start of its Mixpanel coverage.

delete from public.brand_data_room_catalog_metrics_daily metrics
where metrics.exported_events = 0
  and metrics.metric_date < (
    select min(measured.metric_date)
    from public.brand_data_room_catalog_metrics_daily measured
    where measured.country_code = metrics.country_code
      and measured.exported_events > 0
  );

select public.refresh_brand_data_room_catalog_metrics_snapshots();
