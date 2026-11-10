-- ==============================================================================
-- Migration v12: Atomic Product Variant Persistence, Unique Combo Index,
-- Archive Flag for Historical Order Safety & Dynamic Delivery Verification
-- Amin Raisat Hosiery (ARH)
-- Safe, Idempotent, Backward-Compatible (Zero Destructive Data Deletion)
-- ==============================================================================

-- 1. ENSURE ALL REQUIRED COLUMNS FROM v11 & v12 EXIST IDEMPOTENTLY

-- 1a. Categories sizing configuration
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

UPDATE public.categories
SET
  size_type = COALESCE(size_type, 'alphabetic'),
  available_sizes = COALESCE(available_sizes, '["S", "M", "L", "XL", "XXL"]'::jsonb)
WHERE available_sizes IS NULL OR size_type IS NULL;

-- 1b. Products columns (colors, short_description, video_url, size_guide_url, sort_order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'colors'
  ) THEN
    ALTER TABLE public.products ADD COLUMN colors JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'short_description'
  ) THEN
    ALTER TABLE public.products ADD COLUMN short_description TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public.products ADD COLUMN video_url TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'size_guide_url'
  ) THEN
    ALTER TABLE public.products ADD COLUMN size_guide_url TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.products ADD COLUMN sort_order INT DEFAULT 9999;
  END IF;
END $$;

-- 1c. Product Variants columns (color, color_hex, discount_percentage, is_archived)
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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN discount_percentage NUMERIC(5, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE public.product_variants ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 1d. Product Media color binding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_media' AND column_name = 'color'
  ) THEN
    ALTER TABLE public.product_media ADD COLUMN color TEXT DEFAULT NULL;
  END IF;
END $$;

-- 1e. Order Items color & snapshot columns
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

-- 2. FIX UNIQUE CONSTRAINT ON product_variants
-- Drop the legacy `unique_variant` constraint on (product_id, quality, sleeve, size)
-- which lacked `color` and caused duplicate key failures across multiple colors.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND constraint_name = 'unique_variant'
  ) THEN
    ALTER TABLE public.product_variants DROP CONSTRAINT unique_variant;
  END IF;
END $$;

-- Replace with normalized composite unique index including COALESCE(color, '')
DROP INDEX IF EXISTS public.idx_product_variants_unique_combo;
CREATE UNIQUE INDEX idx_product_variants_unique_combo
ON public.product_variants (
  product_id,
  LOWER(TRIM(quality)),
  LOWER(TRIM(sleeve)),
  LOWER(TRIM(size)),
  LOWER(TRIM(COALESCE(color, '')))
);

-- 3. ATOMIC VARIANT SYNC FUNCTION (Single PostgreSQL Transaction)
-- Preserves existing variant UUIDs, prevents duplicates, and archives instead of
-- deleting any variant referenced by historical order_items.
CREATE OR REPLACE FUNCTION public.sync_product_variants_atomic(
  p_product_id UUID,
  p_variants JSONB
)
RETURNS SETOF public.product_variants
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_item JSONB;
  v_quality TEXT;
  v_sleeve TEXT;
  v_size TEXT;
  v_color TEXT;
  v_color_hex TEXT;
  v_price NUMERIC(10, 2);
  v_sale_price NUMERIC(10, 2);
  v_discount NUMERIC(5, 2);
  v_stock INT;
  v_sku TEXT;
  v_is_available BOOLEAN;
  v_existing_id UUID;
  v_target_id UUID;
  v_combo_key TEXT;
  v_seen_keys TEXT[] := ARRAY[]::TEXT[];
  v_kept_ids UUID[] := ARRAY[]::UUID[];
  v_removed_rec RECORD;
  v_has_order_ref BOOLEAN;
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'Product ID is required';
  END IF;

  IF p_variants IS NULL OR jsonb_typeof(p_variants) <> 'array' THEN
    RAISE EXCEPTION 'Variants payload must be a JSON array';
  END IF;

  -- Pass 1: Validate all combinations upfront before mutating anything
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    v_quality := COALESCE(NULLIF(TRIM(v_item->>'quality'), ''), 'High Quality');
    v_sleeve  := COALESCE(NULLIF(TRIM(v_item->>'sleeve'), ''), 'Sleeveless');
    v_size    := COALESCE(NULLIF(TRIM(v_item->>'size'), ''), 'L');
    v_color   := NULLIF(TRIM(v_item->>'color'), '');

    v_combo_key := LOWER(v_quality) || '::' || LOWER(v_sleeve) || '::' || LOWER(v_size) || '::' || LOWER(COALESCE(v_color, ''));
    IF v_combo_key = ANY(v_seen_keys) THEN
      RAISE EXCEPTION 'Duplicate color and size combination: % / % / % / %', COALESCE(v_color, 'No Color'), v_quality, v_sleeve, v_size
        USING ERRCODE = '23505';
    END IF;
    v_seen_keys := array_append(v_seen_keys, v_combo_key);
  END LOOP;

  -- Pass 2: Match by combination key first so existing IDs stay bound cleanly
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    v_quality      := COALESCE(NULLIF(TRIM(v_item->>'quality'), ''), 'High Quality');
    v_sleeve       := COALESCE(NULLIF(TRIM(v_item->>'sleeve'), ''), 'Sleeveless');
    v_size         := COALESCE(NULLIF(TRIM(v_item->>'size'), ''), 'L');
    v_color        := NULLIF(TRIM(v_item->>'color'), '');
    v_color_hex    := NULLIF(TRIM(v_item->>'color_hex'), '');
    v_price        := COALESCE((v_item->>'price')::NUMERIC(10, 2), 480.00);
    v_sale_price   := (v_item->>'sale_price')::NUMERIC(10, 2);
    v_discount     := COALESCE((v_item->>'discount_percentage')::NUMERIC(5, 2), 0);
    v_stock        := GREATEST(0, COALESCE((v_item->>'stock')::INT, 0));
    v_sku          := COALESCE(NULLIF(TRIM(v_item->>'sku'), ''), '');
    v_is_available := COALESCE((v_item->>'is_available')::BOOLEAN, true);

    SELECT id INTO v_existing_id
    FROM public.product_variants
    WHERE product_id = p_product_id
      AND LOWER(TRIM(quality)) = LOWER(v_quality)
      AND LOWER(TRIM(sleeve))  = LOWER(v_sleeve)
      AND LOWER(TRIM(size))    = LOWER(v_size)
      AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(COALESCE(v_color, ''))
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.product_variants
      SET
        quality = v_quality,
        sleeve = v_sleeve,
        size = v_size,
        color = v_color,
        color_hex = v_color_hex,
        price = v_price,
        sale_price = v_sale_price,
        discount_percentage = v_discount,
        stock = v_stock,
        sku = v_sku,
        is_available = v_is_available,
        is_archived = false,
        updated_at = NOW()
      WHERE id = v_existing_id;

      v_kept_ids := array_append(v_kept_ids, v_existing_id);
    ELSE
      BEGIN
        v_target_id := NULLIF(TRIM(v_item->>'id'), '')::UUID;
      EXCEPTION WHEN others THEN
        v_target_id := NULL;
      END;

      IF v_target_id IS NULL OR EXISTS (SELECT 1 FROM public.product_variants WHERE id = v_target_id) THEN
        v_target_id := uuid_generate_v4();
      END IF;

      INSERT INTO public.product_variants (
        id, product_id, quality, sleeve, size, color, color_hex,
        price, sale_price, discount_percentage, stock, sku, is_available, is_archived, updated_at
      ) VALUES (
        v_target_id, p_product_id, v_quality, v_sleeve, v_size, v_color, v_color_hex,
        v_price, v_sale_price, v_discount, v_stock, v_sku, v_is_available, false, NOW()
      );

      v_kept_ids := array_append(v_kept_ids, v_target_id);
    END IF;
  END LOOP;

  -- Pass 3: Safely handle removed variants without breaking historical order references
  FOR v_removed_rec IN
    SELECT id FROM public.product_variants
    WHERE product_id = p_product_id
      AND NOT (id = ANY(v_kept_ids))
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.order_items WHERE variant_id = v_removed_rec.id
    ) INTO v_has_order_ref;

    IF v_has_order_ref THEN
      UPDATE public.product_variants
      SET
        is_available = false,
        is_archived = true,
        stock = 0,
        updated_at = NOW()
      WHERE id = v_removed_rec.id;
    ELSE
      DELETE FROM public.product_variants WHERE id = v_removed_rec.id;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT * FROM public.product_variants
  WHERE product_id = p_product_id AND is_archived = false
  ORDER BY created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_product_variants_atomic(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_product_variants_atomic(UUID, JSONB) TO service_role;

-- 4. ENSURE shipping_settings ONLY RECEIVES DEFAULTS WHERE NULL
-- Preserves any admin-configured base_delivery_charge and free_delivery_threshold.
UPDATE public.shipping_settings
SET
  min_order_qty = COALESCE(min_order_qty, 1),
  max_order_qty = COALESCE(max_order_qty, 100),
  base_delivery_charge = COALESCE(base_delivery_charge, 200.00),
  free_delivery_threshold = COALESCE(free_delivery_threshold, 3)
WHERE id IS NOT NULL;

