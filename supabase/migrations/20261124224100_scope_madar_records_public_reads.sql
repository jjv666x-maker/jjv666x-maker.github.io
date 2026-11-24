-- Keep anonymous storefront reads limited to published, visible catalog products.
-- The authenticated owner/admin policy remains unchanged.
BEGIN;

ALTER POLICY "Public read" ON public.madar_records
  TO anon
  USING (
    collection = 'madar_products'
    AND value ->> 'status' = 'published'
    AND COALESCE(value ->> 'visible', 'true') <> 'false'
  );

GRANT SELECT ON TABLE public.madar_records TO anon;

COMMIT;
