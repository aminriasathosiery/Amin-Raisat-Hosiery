-- =============================================================================
-- Migration v8: Production-Ready Variant Discount & Sale Pricing System
-- Amin Raisat Hosiery (ARH)
-- =============================================================================

-- 1. Add discount_percentage to product_variants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'product_variants' 
          AND column_name = 'discount_percentage'
    ) THEN
        ALTER TABLE public.product_variants 
        ADD COLUMN discount_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage < 100);
    END IF;
END $$;

-- 2. Populate discount_percentage for existing variants where sale_price is present
UPDATE public.product_variants
SET discount_percentage = ROUND(((price - sale_price) / price) * 100, 2)
WHERE sale_price IS NOT NULL 
  AND sale_price > 0 
  AND price > sale_price 
  AND (discount_percentage IS NULL OR discount_percentage = 0);

-- 3. Add historical pricing audit columns to order_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'order_items' 
          AND column_name = 'original_price'
    ) THEN
        ALTER TABLE public.order_items 
        ADD COLUMN original_price NUMERIC(10, 2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'order_items' 
          AND column_name = 'discount_percentage'
    ) THEN
        ALTER TABLE public.order_items 
        ADD COLUMN discount_percentage NUMERIC(5, 2) DEFAULT 0;
    END IF;
END $$;
