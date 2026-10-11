-- Optimize public.refresh_leaderboard_cache() (pg_cron jobs 22, 26, 127).
--
-- Root causes of the cron timeouts / failures:
--   * The build scanned every profile (~1.2M) with a LEFT JOIN to the whole
--     week's daily_activity and grouped/sorted that join, even though the
--     HAVING clause drops every user without positive weekly steps. Its cost
--     grows through the week (Mon ~24 s total run, Sat/Sun 90-120 s).
--   * Job 22 (Mon 03:43 UTC) and job 26 (hourly :43) start at the same time.
--     Overlapping refreshes block each other on leaderboard_cache_users row
--     locks and then fail with a duplicate leaderboard_cache_users_pkey.
--
-- Changes (output is identical to the previous version):
--   * Aggregate this week's daily_activity per user first, keep users with
--     total_steps > 0, then resolve profile attributes by primary key.
--   * Rank on the pre-aggregated rows (no GROUP BY over profile text columns).
--   * Single-flight guard with pg_try_advisory_xact_lock: an overlapping call
--     returns immediately instead of fighting the running refresh.
--   * Function-level work_mem 128MB so the rank sorts stay in memory.
-- No schema, index or grant changes; CREATE OR REPLACE keeps existing ACLs.

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET work_mem TO '128MB'
AS $function$
DECLARE
  v_now_ba TIMESTAMP := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_today DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_week_start DATE := date_trunc(
    'week',
    v_now_ba
  )::date;
  v_impossible_daily_steps CONSTANT INTEGER := 70000;
  v_early_day_rank_grace_steps CONSTANT INTEGER := 500;
  v_early_day_rank_steps_per_minute CONSTANT INTEGER := 220;
  v_minutes_since_day_start INTEGER := GREATEST(
    0,
    FLOOR(EXTRACT(EPOCH FROM (v_now_ba - v_today::timestamp)) / 60)::INTEGER
  );
  v_current_day_rank_step_cap INTEGER :=
    v_early_day_rank_grace_steps
    + (v_minutes_since_day_start * v_early_day_rank_steps_per_minute);
BEGIN
  -- Jobs 22 (Mon 03:43 UTC) and 26 (hourly :43) can start together. Two
  -- overlapping refreshes both DELETE + INSERT the cache, so the second one
  -- either waits on row locks until it hits the cron statement_timeout or fails
  -- with a duplicate leaderboard_cache_users_pkey. Only one refresh runs at a time.
  IF NOT pg_try_advisory_xact_lock(hashtext('public.refresh_leaderboard_cache')) THEN
    RAISE NOTICE 'refresh_leaderboard_cache already running, skipping';
    RETURN;
  END IF;

  DROP TABLE IF EXISTS pg_temp.tmp_leaderboard_user_totals;

  -- Drive the build from this week's daily_activity aggregated per user and
  -- resolve profile attributes by primary key. Users without positive weekly
  -- steps were already dropped by the old HAVING clause, so scanning and
  -- sorting every profile (LEFT JOIN + GROUP BY on ~1.2M rows) was wasted work.
  CREATE TEMP TABLE tmp_leaderboard_user_totals ON COMMIT DROP AS
  WITH weekly_user_steps AS MATERIALIZED (
    SELECT
      da.user_id,
      SUM(
        CASE
          WHEN da.date = v_today THEN LEAST(
            CASE
              WHEN da.raw_steps > v_impossible_daily_steps THEN COALESCE(da.validated_steps, 0)
              WHEN array_length(da.fraud_flags, 1) > 0 THEN COALESCE(da.validated_steps, 0)
              ELSE COALESCE(da.raw_steps, 0)
            END,
            v_current_day_rank_step_cap
          )
          WHEN da.raw_steps > v_impossible_daily_steps THEN COALESCE(da.validated_steps, 0)
          WHEN array_length(da.fraud_flags, 1) > 0 THEN COALESCE(da.validated_steps, 0)
          ELSE COALESCE(da.raw_steps, 0)
        END
      )::BIGINT AS total_steps
    FROM public.daily_activity da
    WHERE da.date >= v_week_start
    GROUP BY da.user_id
  ),
  leaderboard_users AS MATERIALIZED (
    SELECT
      p.id AS user_id,
      p.display_name,
      NULLIF(TRIM(p.barrio), '') AS barrio,
      NULLIF(TRIM(p.province), '') AS province,
      NULLIF(TRIM(p.city), '') AS city,
      COALESCE(NULLIF(UPPER(TRIM(p.country_code)), ''), 'AR') AS country_code,
      w.total_steps
    FROM weekly_user_steps w
    JOIN public.profiles p
      ON p.id = w.user_id
    WHERE w.total_steps > 0
      AND p.hide_from_leaderboard = FALSE
      AND p.display_name IS NOT NULL
      AND TRIM(p.display_name) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.step_anomaly_holds h
        WHERE h.user_id = p.id
          AND h.status = 'active'
      )
  )
  SELECT
    user_id,
    display_name,
    barrio,
    province,
    city,
    country_code,
    total_steps,
    ROW_NUMBER() OVER (
      ORDER BY total_steps DESC, user_id
    )::INTEGER AS global_rank,
    ROW_NUMBER() OVER (
      PARTITION BY barrio
      ORDER BY total_steps DESC, user_id
    )::INTEGER AS barrio_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code
      ORDER BY total_steps DESC, user_id
    )::INTEGER AS country_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code, barrio
      ORDER BY total_steps DESC, user_id
    )::INTEGER AS country_barrio_rank,
    ROW_NUMBER() OVER (
      PARTITION BY province
      ORDER BY total_steps DESC, user_id
    )::INTEGER AS province_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code, province
      ORDER BY total_steps DESC, user_id
    )::INTEGER AS country_province_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code, province, city
      ORDER BY total_steps DESC, user_id
    )::INTEGER AS country_province_city_rank
  FROM leaderboard_users;

  DELETE FROM public.leaderboard_cache_users;

  INSERT INTO public.leaderboard_cache_users
    (
      user_id,
      display_name,
      barrio,
      province,
      city,
      total_steps,
      rank,
      barrio_rank,
      province_rank,
      cached_at,
      country_code,
      country_rank,
      country_barrio_rank,
      country_province_rank,
      country_province_city_rank
    )
  SELECT
    user_id,
    display_name,
    barrio,
    province,
    city,
    total_steps,
    global_rank,
    barrio_rank,
    province_rank,
    now(),
    country_code,
    country_rank,
    country_barrio_rank,
    country_province_rank,
    country_province_city_rank
  FROM pg_temp.tmp_leaderboard_user_totals
  ORDER BY global_rank;

  DELETE FROM public.leaderboard_cache_barrios;

  INSERT INTO public.leaderboard_cache_barrios
    (barrio, total_steps, walker_count, rank, cached_at, top_walkers)
  SELECT
    barrio,
    SUM(total_steps)::BIGINT,
    COUNT(*)::BIGINT,
    ROW_NUMBER() OVER (ORDER BY SUM(total_steps) DESC, barrio)::INTEGER,
    now(),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'display_name', display_name,
          'steps', total_steps
        )
        ORDER BY total_steps DESC, barrio_rank
      ) FILTER (WHERE barrio_rank <= 6),
      '[]'::jsonb
    )
  FROM pg_temp.tmp_leaderboard_user_totals
  WHERE barrio IS NOT NULL
    AND TRIM(barrio) <> ''
    AND barrio <> 'No vivo en CABA'
  GROUP BY barrio;

  DELETE FROM public.leaderboard_cache_country_barrios;

  INSERT INTO public.leaderboard_cache_country_barrios
    (country_code, barrio, total_steps, walker_count, rank, cached_at, top_walkers)
  SELECT
    country_code,
    barrio,
    SUM(total_steps)::BIGINT,
    COUNT(*)::BIGINT,
    ROW_NUMBER() OVER (
      PARTITION BY country_code
      ORDER BY SUM(total_steps) DESC, barrio
    )::INTEGER,
    now(),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'display_name', display_name,
          'steps', total_steps
        )
        ORDER BY total_steps DESC, country_barrio_rank
      ) FILTER (WHERE country_barrio_rank <= 6),
      '[]'::jsonb
    )
  FROM pg_temp.tmp_leaderboard_user_totals
  WHERE barrio IS NOT NULL
    AND TRIM(barrio) <> ''
    AND barrio <> 'No vivo en CABA'
  GROUP BY country_code, barrio;

  DELETE FROM public.leaderboard_cache_provinces;

  INSERT INTO public.leaderboard_cache_provinces
    (province, total_steps, walker_count, rank, cached_at, top_walkers)
  SELECT
    province,
    SUM(total_steps)::BIGINT,
    COUNT(*)::BIGINT,
    ROW_NUMBER() OVER (ORDER BY SUM(total_steps) DESC, province)::INTEGER,
    now(),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'display_name', display_name,
          'steps', total_steps
        )
        ORDER BY total_steps DESC, province_rank
      ) FILTER (WHERE province_rank <= 6),
      '[]'::jsonb
    )
  FROM pg_temp.tmp_leaderboard_user_totals
  WHERE province IS NOT NULL
    AND TRIM(province) <> ''
  GROUP BY province;

  DELETE FROM public.leaderboard_cache_country_provinces;

  INSERT INTO public.leaderboard_cache_country_provinces
    (country_code, province, total_steps, walker_count, rank, cached_at, top_walkers)
  SELECT
    country_code,
    province,
    SUM(total_steps)::BIGINT,
    COUNT(*)::BIGINT,
    ROW_NUMBER() OVER (
      PARTITION BY country_code
      ORDER BY SUM(total_steps) DESC, province
    )::INTEGER,
    now(),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'display_name', display_name,
          'steps', total_steps
        )
        ORDER BY total_steps DESC, country_province_rank
      ) FILTER (WHERE country_province_rank <= 6),
      '[]'::jsonb
    )
  FROM pg_temp.tmp_leaderboard_user_totals
  WHERE province IS NOT NULL
    AND TRIM(province) <> ''
  GROUP BY country_code, province;

  DELETE FROM public.leaderboard_cache_country_province_cities;

  INSERT INTO public.leaderboard_cache_country_province_cities
    (
      country_code,
      province,
      city,
      total_steps,
      walker_count,
      rank,
      cached_at,
      top_walkers
    )
  SELECT
    country_code,
    province,
    city,
    SUM(total_steps)::BIGINT,
    COUNT(*)::BIGINT,
    ROW_NUMBER() OVER (
      PARTITION BY country_code, province
      ORDER BY SUM(total_steps) DESC, city
    )::INTEGER,
    now(),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'display_name', display_name,
          'steps', total_steps
        )
        ORDER BY total_steps DESC, country_province_city_rank
      ) FILTER (WHERE country_province_city_rank <= 6),
      '[]'::jsonb
    )
  FROM pg_temp.tmp_leaderboard_user_totals
  WHERE province IS NOT NULL
    AND TRIM(province) <> ''
    AND city IS NOT NULL
    AND TRIM(city) <> ''
  GROUP BY country_code, province, city;

  INSERT INTO public.leaderboard_cache_totals
    (
      id,
      users_total,
      barrios_total,
      cached_at,
      country_totals,
      barrio_country_totals,
      provinces_total,
      province_country_totals
    )
  VALUES (
    true,
    (SELECT count(*)::integer FROM public.leaderboard_cache_users),
    (SELECT count(*)::integer FROM public.leaderboard_cache_barrios),
    now(),
    COALESCE(
      (
        SELECT jsonb_object_agg(country_code, users_total)
        FROM (
          SELECT country_code, count(*)::integer AS users_total
          FROM pg_temp.tmp_leaderboard_user_totals
          GROUP BY country_code
        ) country_counts
      ),
      '{}'::jsonb
    ),
    COALESCE(
      (
        SELECT jsonb_object_agg(country_code, barrios_total)
        FROM (
          SELECT country_code, count(*)::integer AS barrios_total
          FROM public.leaderboard_cache_country_barrios
          GROUP BY country_code
        ) country_barrio_counts
      ),
      '{}'::jsonb
    ),
    (SELECT count(*)::integer FROM public.leaderboard_cache_provinces),
    COALESCE(
      (
        SELECT jsonb_object_agg(country_code, provinces_total)
        FROM (
          SELECT country_code, count(*)::integer AS provinces_total
          FROM public.leaderboard_cache_country_provinces
          GROUP BY country_code
        ) country_province_counts
      ),
      '{}'::jsonb
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET users_total = EXCLUDED.users_total,
        barrios_total = EXCLUDED.barrios_total,
        cached_at = EXCLUDED.cached_at,
        country_totals = EXCLUDED.country_totals,
        barrio_country_totals = EXCLUDED.barrio_country_totals,
        provinces_total = EXCLUDED.provinces_total,
        province_country_totals = EXCLUDED.province_country_totals;
END;
$function$
;
