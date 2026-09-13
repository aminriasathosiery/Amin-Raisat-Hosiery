-- ==============================================================================
-- Migration v10: Security Remediation, RLS Tightening & Deals Integrity
-- Amin Raisat Hosiery (ARH)
-- ==============================================================================

-- 1. FIX DEALS RLS POLICY: Restrict full access strictly to service_role
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access deals" ON public.deals;
CREATE POLICY "Service role full access deals"
  ON public.deals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read active deals" ON public.deals;
CREATE POLICY "Public can read active deals"
  ON public.deals FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

REVOKE INSERT, UPDATE, DELETE ON public.deals FROM anon, authenticated;
GRANT SELECT ON public.deals TO anon, authenticated;
GRANT ALL ON public.deals TO service_role;

-- 2. FIX PRODUCTS & VARIANTS RLS: Drop public write policies and restrict to service_role
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full operations products" ON public.products;
DROP POLICY IF EXISTS "Allow full operations product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow full operations product_media" ON public.product_media;

-- Public can only read published products and variants
DROP POLICY IF EXISTS "Public can read published products" ON public.products;
CREATE POLICY "Public can read published products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Public can read variants" ON public.product_variants;
CREATE POLICY "Public can read variants"
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can read product media" ON public.product_media;
CREATE POLICY "Public can read product media"
  ON public.product_media FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role full access for catalog
DROP POLICY IF EXISTS "Service role full access products" ON public.products;
CREATE POLICY "Service role full access products"
  ON public.products FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access product_variants" ON public.product_variants;
CREATE POLICY "Service role full access product_variants"
  ON public.product_variants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access product_media" ON public.product_media;
CREATE POLICY "Service role full access product_media"
  ON public.product_media FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.product_variants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.product_media FROM anon, authenticated;

-- 3. FIX SETTINGS RLS: Restrict modifications strictly to service_role
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full operations shipping_settings" ON public.shipping_settings;
DROP POLICY IF EXISTS "Allow full operations site_settings" ON public.site_settings;

DROP POLICY IF EXISTS "Public can read shipping settings" ON public.shipping_settings;
CREATE POLICY "Public can read shipping settings"
  ON public.shipping_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role full access shipping_settings" ON public.shipping_settings;
CREATE POLICY "Service role full access shipping_settings"
  ON public.shipping_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access site_settings" ON public.site_settings;
CREATE POLICY "Service role full access site_settings"
  ON public.site_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE INSERT, UPDATE, DELETE ON public.shipping_settings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.site_settings FROM anon, authenticated;

-- 4. ENSURE ORDER_ITEMS HAS ALL REQUIRED COLUMNS (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'is_deal_item'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN is_deal_item BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'deal_id'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'deal_name'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN deal_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'deal_pieces_count'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN deal_pieces_count INT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'deal_original_price'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN deal_original_price NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'deal_discount_percentage'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN deal_discount_percentage NUMERIC(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'deal_is_free_delivery'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN deal_is_free_delivery BOOLEAN DEFAULT false;
  END IF;
END $$;
