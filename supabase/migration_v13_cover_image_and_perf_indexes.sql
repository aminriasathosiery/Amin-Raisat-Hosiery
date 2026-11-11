-- ==============================================================================
-- Migration v13: Product Primary Cover Image Column + Storefront Query Indexes
-- Amin Raisat Hosiery (ARH)
-- Safe, Idempotent, Additive Only (Preserves All Existing Products & Media)
-- ==============================================================================

-- 1. ADD primary cover_image COLUMN TO products (Nullable, preserves all legacy media)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'cover_image'
  ) THEN
    ALTER TABLE public.products ADD COLUMN cover_image TEXT DEFAULT NULL;
  END IF;
END $$;

-- 2. SAFE PERFORMANCE INDEXES FOR HOT PUBLIC CATALOG & VARIANT QUERIES
CREATE INDEX IF NOT EXISTS idx_products_published_sort
  ON public.products (is_published, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_variants_prod_archived
  ON public.product_variants (product_id, is_archived);

CREATE INDEX IF NOT EXISTS idx_product_media_prod_order
  ON public.product_media (product_id, display_order);

CREATE INDEX IF NOT EXISTS idx_deals_active_featured_sort
  ON public.deals (is_active, is_featured, sort_order);

CREATE INDEX IF NOT EXISTS idx_reviews_prod_approved
  ON public.reviews (product_id, is_approved, created_at DESC);

