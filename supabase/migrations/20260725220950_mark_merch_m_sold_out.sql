-- The M size is no longer available for either shirt color. The storefront
-- reads these rows on every request and disables sold-out size options.
update public.tienda_stock
set qty = 0
where size = 'M'
  and base in ('blanca', 'negra');
