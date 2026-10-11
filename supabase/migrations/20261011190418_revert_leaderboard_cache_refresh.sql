-- Revert public.refresh_leaderboard_cache() to its pre-20261011180656
-- definition (original weekly build over profiles LEFT JOIN daily_activity,
-- no function-level work_mem). The speedup of 20261011180656 was negligible
-- (82 s vs 84-96 s); the hourly cost is the full rewrite of
-- leaderboard_cache_users, not the build.
--
-- The only difference from the original body is the overlap guard at the top
-- (pg_try_advisory_xact_lock), which does not change any computed result.
-- CREATE OR REPLACE resets the SET clauses, so work_mem=128MB is removed and
-- search_path=public is kept. Existing grants are preserved. The function body
-- keeps the original CRLF line endings.

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  -- Overlap guard only: jobs 22 (Mon 03:43 UTC) and 26 (hourly :43) start
  -- together; a second concurrent refresh returns instead of colliding on
  -- leaderboard_cache_users_pkey. Everything below is the original body.
  IF NOT pg_try_advisory_xact_lock(hashtext('public.refresh_leaderboard_cache')) THEN
    RAISE NOTICE 'refresh_leaderboard_cache already running, skipping';
    RETURN;
  END IF;

  DROP TABLE IF EXISTS pg_temp.tmp_leaderboard_user_totals;

  CREATE TEMP TABLE tmp_leaderboard_user_totals ON COMMIT DROP AS
  WITH leaderboard_daily_rows AS (
    SELECT
      p.id AS user_id,
      p.display_name,
      NULLIF(TRIM(p.barrio), '') AS barrio,
      NULLIF(TRIM(p.province), '') AS province,
      NULLIF(TRIM(p.city), '') AS city,
      COALESCE(NULLIF(UPPER(TRIM(p.country_code)), ''), 'AR') AS country_code,
      CASE
        WHEN da.user_id IS NULL THEN 0
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
      END AS rank_steps
    FROM public.profiles p
    LEFT JOIN public.daily_activity da
      ON da.user_id = p.id
     AND da.date >= v_week_start
    WHERE p.hide_from_leaderboard = FALSE
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
    COALESCE(SUM(rank_steps), 0)::BIGINT AS total_steps,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(SUM(rank_steps), 0) DESC, user_id
    )::INTEGER AS global_rank,
    ROW_NUMBER() OVER (
      PARTITION BY barrio
      ORDER BY COALESCE(SUM(rank_steps), 0) DESC, user_id
    )::INTEGER AS barrio_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code
      ORDER BY COALESCE(SUM(rank_steps), 0) DESC, user_id
    )::INTEGER AS country_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code, barrio
      ORDER BY COALESCE(SUM(rank_steps), 0) DESC, user_id
    )::INTEGER AS country_barrio_rank,
    ROW_NUMBER() OVER (
      PARTITION BY province
      ORDER BY COALESCE(SUM(rank_steps), 0) DESC, user_id
    )::INTEGER AS province_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code, province
      ORDER BY COALESCE(SUM(rank_steps), 0) DESC, user_id
    )::INTEGER AS country_province_rank,
    ROW_NUMBER() OVER (
      PARTITION BY country_code, province, city
      ORDER BY COALESCE(SUM(rank_steps), 0) DESC, user_id
    )::INTEGER AS country_province_city_rank
  FROM leaderboard_daily_rows
  GROUP BY user_id, display_name, barrio, province, city, country_code
  HAVING COALESCE(SUM(rank_steps), 0) > 0;

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
