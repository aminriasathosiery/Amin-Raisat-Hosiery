-- ==============================================================================
-- Migration v11: Category Sizes, Product Color Variants & Delivery Thresholds
-- Amin Raisat Hosiery (ARH)
-- Safe, Idempotent, Backward-Compatible
-- ==============================================================================

-- 1. ADD size_type AND available_sizes TO categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'size_type'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN size_type TEXT DEFAULT 'alphabetic';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'available_sizes'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN available_sizes JSONB DEFAULT '["S", "M", "L", "XL", "XXL"]'::jsonb;
  END IF;
END $$;

-- Update existing default categories with reasonable defaults if empty
UPDATE public.categories
SET 
  size_type = COALESCE(size_type, 'alphabetic'),
  available_sizes = COALESCE(available_sizes, '["S", "M", "L", "XL", "XXL"]'::jsonb)
WHERE available_sizes IS NULL;

-- 2. ADD colors TO products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'colors'
  ) THEN
    ALTER TABLE public.products ADD COLUMN colors JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3. ADD color & color_hex TO product_variants AND UPDATE UNIQUE CONSTRAINT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'color'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN color TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'color_hex'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN color_hex TEXT DEFAULT NULL;
  END IF;
END $$;

-- Drop old unique constraint that prevented multiple colors per quality/sleeve/size
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND constraint_name = 'unique_variant'
  ) THEN
    ALTER TABLE public.product_variants DROP CONSTRAINT unique_variant;
  END IF;
END $$;

-- Create composite unique index supporting nullable color
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique_combo 
ON public.product_variants (product_id, quality, sleeve, size, COALESCE(color, ''));

-- 4. ADD color TO product_media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_media' AND column_name = 'color'
  ) THEN
    ALTER TABLE public.product_media ADD COLUMN color TEXT DEFAULT NULL;
  END IF;
END $$;

-- 5. ADD color & color_hex TO order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'color'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN color TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'color_hex'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN color_hex TEXT DEFAULT NULL;
  END IF;
END $$;

-- 6. ENSURE shipping_settings CONTAINS PROPER DEFAULTS
UPDATE public.shipping_settings
SET 
  min_order_qty = COALESCE(min_order_qty, 1),
  max_order_qty = COALESCE(max_order_qty, 100),
  base_delivery_charge = COALESCE(base_delivery_charge, 200.00),
  free_delivery_threshold = COALESCE(free_delivery_threshold, 3)
WHERE id IS NOT NULL;

