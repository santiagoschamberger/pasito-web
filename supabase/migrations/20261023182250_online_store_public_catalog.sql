-- Public discovery for the web storefront. Do not reuse the home RPC: it
-- deliberately omits online rewards for ordinary clients. Explicit field
-- allowlists keep coupon codes, PINs and partner billing/contact data private.
CREATE OR REPLACE FUNCTION public.get_online_store_catalog(p_country_code text DEFAULT 'AR')
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(item ORDER BY display_order, pasitos_cost, title, id), '[]'::jsonb)
  FROM (
    SELECT r.id, r.display_order, r.pasitos_cost, r.title,
      (SELECT jsonb_object_agg(field.key, field.value)
       FROM jsonb_each(to_jsonb(r)) AS field
       WHERE field.key = ANY (ARRAY[
         'id','partner_id','country_code','type','kind','title','description',
         'pasitos_cost','display_order','category','remaining_stock','monthly_stock',
         'max_per_user_per_day','cupo_per_slot','valid_from_hour','valid_to_hour',
         'valid_days','valid_hours','emoji','original_value','conditions','image_url',
         'daily_limit','daily_limit_scope','stock_paused_until','redemption_mode',
         'redemption_url','redemption_instructions','external_code_available_count',
         'redemption_count','starts_at','expires_at'
       ]::text[])) || jsonb_build_object(
         'online_catalog_eligible', true,
         'partner', jsonb_build_object(
           'name', p.name, 'logo_url', p.logo_url,
           'country_code', p.country_code, 'fulfillment_type', p.fulfillment_type,
           'online_store_url', p.online_store_url,
           'online_store_label', p.online_store_label,
           'online_redemption_instructions', p.online_redemption_instructions
         )
       ) AS item
    FROM public.rewards r
    JOIN public.partners p ON p.id = r.partner_id
    WHERE r.country_code = upper(btrim(coalesce(p_country_code, 'AR')))
      AND coalesce(nullif(p.country_code, ''), 'AR') = r.country_code
      AND r.is_active AND p.is_active AND p.approval_status = 'approved'
      AND r.archived_at IS NULL
      AND r.starts_at <= now() AND (r.expires_at IS NULL OR r.expires_at > now())
      AND r.kind = 'web'
      AND r.redemption_mode IN ('external_code', 'shared_code')
  ) AS catalog;
$$;
REVOKE ALL ON FUNCTION public.get_online_store_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_online_store_catalog(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.get_online_store_catalog(text) IS
  'Safe public online storefront discovery. No coupon codes, partner PINs, contacts or billing fields.';
