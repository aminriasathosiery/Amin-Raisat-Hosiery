-- ==============================================================================
-- Migration v9: Deals System + Product Sort Order + Order Items Deal Columns
-- Amin Raisat Hosiery (ARH)
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. ADD sort_order TO products table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.products ADD COLUMN sort_order INT DEFAULT 9999;
    -- Populate existing products with sequential sort_order based on created_at
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
      FROM public.products
    )
    UPDATE public.products p
    SET sort_order = r.rn
    FROM ranked r
    WHERE p.id = r.id;
  END IF;
END $$;

-- 2. CREATE deals table
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  pieces_count INT NOT NULL DEFAULT 3 CHECK (pieces_count >= 1),
  original_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (original_price >= 0),
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage < 100),
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  is_free_delivery BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 9999,
  badge_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ADD deal columns to order_items (nullable, fully backward-compatible)
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

  -- Also ensure original_price and discount_percentage exist (from migration_v8)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN original_price NUMERIC(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN discount_percentage NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Ensure discount_percentage exists in product_variants (from migration_v8)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE public.product_variants
    ADD COLUMN discount_percentage NUMERIC(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage < 100);
  END IF;
END $$;

-- 4. RLS Policies for deals table
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Public can read active deals
DROP POLICY IF EXISTS "Public can read active deals" ON public.deals;
CREATE POLICY "Public can read active deals"
  ON public.deals FOR SELECT
  USING (is_active = true);

-- Service role (admin) can do everything
DROP POLICY IF EXISTS "Service role full access deals" ON public.deals;
CREATE POLICY "Service role full access deals"
  ON public.deals FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_deals_sort_order ON public.deals(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_deals_is_active ON public.deals(is_active);
CREATE INDEX IF NOT EXISTS idx_deals_is_featured ON public.deals(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(sort_order ASC);

-- 6. Seed one sample deal for testing (optional — remove if not needed)
-- INSERT INTO public.deals (name, slug, subtitle, description, pieces_count, original_price, discount_percentage, sale_price, is_free_delivery, is_active, is_featured, sort_order, badge_text)
-- VALUES (
--   '3 Vests Deal',
--   '3-vests-deal',
--   'Premium Cotton Bundle',
--   'Get 3 premium quality cotton vests at an unbeatable bundle price. Perfect for daily wear.',
--   3, 3000, 10, 2700, true, true, true, 1, 'Best Value'
-- )
-- ON CONFLICT (slug) DO NOTHING;
