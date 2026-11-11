-- ==============================================================================
-- Migration v14: Atomic Order Creation RPC, Checkout Idempotency,
-- WhatsApp Transactional Outbox Queue, and High-Performance Order Indexes
-- Amin Raisat Hosiery (ARH)
-- Safe, Idempotent, Additive Only (Preserves All Production Records)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENSURE ALL REQUIRED COLUMNS EXIST ON orders & order_items (Idempotent & Safe)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'GUEST',
  ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'COD_PENDING',
  ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_verified_by TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_deal_item BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deal_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_slug TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_pieces_count INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_original_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_discount_percentage NUMERIC(5, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_is_free_delivery BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Ensure deal items do not fail NOT NULL checks on quality/sleeve/size
DO $$
BEGIN
  ALTER TABLE public.order_items ALTER COLUMN quality DROP NOT NULL;
  ALTER TABLE public.order_items ALTER COLUMN sleeve DROP NOT NULL;
  ALTER TABLE public.order_items ALTER COLUMN size DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. HIGH-VALUE QUERY INDEXES FOR ADMIN ORDERS & ANALYTICS (No bloat)
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc
  ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_created_desc
  ON public.orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status_created_desc
  ON public.orders (payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items (order_id);

-- 3. DURABLE WHATSAPP / NOTIFICATION TRANSACTIONAL OUTBOX TABLE
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  recipient_type TEXT NOT NULL, -- 'admin' | 'customer'
  recipient_phone TEXT NOT NULL,
  event_type TEXT NOT NULL,     -- 'order_created' | 'order_status_updated'
  dedupe_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'sent' | 'failed' | 'manual_required'
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending
  ON public.notification_outbox (status, next_retry_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_notification_outbox_order_id
  ON public.notification_outbox (order_id, created_at DESC);

-- Strictly restrict outbox table to service_role (never expose customer phone/order PII publicly)
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access notification_outbox" ON public.notification_outbox;
CREATE POLICY "Service role full access notification_outbox"
  ON public.notification_outbox FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.notification_outbox FROM anon, authenticated;
GRANT ALL ON public.notification_outbox TO service_role;

-- 4. ATOMIC TRANSACTION-SAFE ORDER CREATION RPC
-- Succeeds or fails cleanly as ONE PostgreSQL transaction:
--   - Idempotency check (returns existing order without duplicate write/stock deduction)
--   - Deterministic FOR UPDATE locking of requested variant rows (prevents overselling)
--   - Stock validation & atomic decrement
--   - Order insert + order_items insert + notification_outbox enqueue
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_idempotency_key TEXT,
  p_order JSONB,
  p_items JSONB,
  p_notifications JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_order RECORD;
  v_existing_items JSONB;
  v_order RECORD;
  v_item JSONB;
  v_notif JSONB;
  v_variant RECORD;
  v_qty INT;
  v_variant_id UUID;
BEGIN
  -- A. Idempotent duplicate protection
  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE idempotency_key = trim(p_idempotency_key)
    LIMIT 1;

    IF FOUND THEN
      SELECT COALESCE(jsonb_agg(to_jsonb(oi)), '[]'::jsonb)
      INTO v_existing_items
      FROM public.order_items oi
      WHERE oi.order_id = v_existing_order.id;

      RETURN jsonb_build_object(
        'deduplicated', true,
        'order', to_jsonb(v_existing_order),
        'items', v_existing_items
      );
    END IF;
  END IF;

  -- B. Lock & validate stock deterministically (ordered by variant_id to prevent deadlocks)
  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items) AS value
    WHERE NULLIF(value->>'variant_id', '') IS NOT NULL
    ORDER BY value->>'variant_id' ASC
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));

    SELECT id, stock, is_available, is_archived
    INTO v_variant
    FROM public.product_variants
    WHERE id = v_variant_id
    FOR UPDATE;

    IF NOT FOUND OR COALESCE(v_variant.is_archived, false) THEN
      RAISE EXCEPTION 'VARIANT_UNAVAILABLE:%', COALESCE(v_item->>'product_name', v_variant_id::TEXT);
    END IF;

    IF COALESCE(v_variant.stock, 0) < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%:%:%',
        COALESCE(v_item->>'product_name', 'Item'),
        COALESCE(v_variant.stock, 0),
        v_qty;
    END IF;
  END LOOP;

  -- C. Insert Order Header
  INSERT INTO public.orders (
    order_number,
    idempotency_key,
    user_id,
    customer_type,
    customer_name,
    customer_phone,
    customer_email,
    address,
    city,
    province,
    order_notes,
    subtotal,
    delivery_fee,
    total_amount,
    payment_method,
    payment_reference,
    payment_screenshot_url,
    payment_status,
    status
  )
  VALUES (
    p_order->>'order_number',
    NULLIF(trim(COALESCE(p_idempotency_key, '')), ''),
    NULLIF(p_order->>'user_id', '')::UUID,
    COALESCE(NULLIF(p_order->>'customer_type', ''), 'GUEST'),
    p_order->>'customer_name',
    p_order->>'customer_phone',
    NULLIF(p_order->>'customer_email', ''),
    p_order->>'address',
    p_order->>'city',
    COALESCE(NULLIF(p_order->>'province', ''), 'Punjab'),
    NULLIF(p_order->>'order_notes', ''),
    COALESCE((p_order->>'subtotal')::NUMERIC, 0),
    COALESCE((p_order->>'delivery_fee')::NUMERIC, 0),
    COALESCE((p_order->>'total_amount')::NUMERIC, 0),
    COALESCE(NULLIF(p_order->>'payment_method', ''), 'cod'),
    NULLIF(p_order->>'payment_reference', ''),
    NULLIF(p_order->>'payment_screenshot_url', ''),
    COALESCE(NULLIF(p_order->>'payment_status', ''), 'COD_PENDING'),
    COALESCE(NULLIF(p_order->>'status', ''), 'Pending')
  )
  RETURNING * INTO v_order;

  -- D. Batch-insert Order Items
  INSERT INTO public.order_items (
    order_id,
    is_deal_item,
    deal_id,
    deal_name,
    deal_slug,
    deal_pieces_count,
    deal_original_price,
    deal_discount_percentage,
    deal_is_free_delivery,
    product_id,
    variant_id,
    product_name,
    quality,
    sleeve,
    size,
    color,
    color_hex,
    unit_price,
    original_price,
    discount_percentage,
    quantity,
    total_price,
    image_url
  )
  SELECT
    v_order.id,
    COALESCE((it->>'is_deal_item')::BOOLEAN, false),
    NULLIF(it->>'deal_id', '')::UUID,
    NULLIF(it->>'deal_name', ''),
    NULLIF(it->>'deal_slug', ''),
    NULLIF(it->>'deal_pieces_count', '')::INT,
    NULLIF(it->>'deal_original_price', '')::NUMERIC,
    NULLIF(it->>'deal_discount_percentage', '')::NUMERIC,
    COALESCE((it->>'deal_is_free_delivery')::BOOLEAN, false),
    NULLIF(it->>'product_id', '')::UUID,
    NULLIF(it->>'variant_id', '')::UUID,
    it->>'product_name',
    NULLIF(it->>'quality', ''),
    NULLIF(it->>'sleeve', ''),
    NULLIF(it->>'size', ''),
    NULLIF(it->>'color', ''),
    NULLIF(it->>'color_hex', ''),
    COALESCE((it->>'unit_price')::NUMERIC, 0),
    NULLIF(it->>'original_price', '')::NUMERIC,
    COALESCE((it->>'discount_percentage')::NUMERIC, 0),
    GREATEST(1, COALESCE((it->>'quantity')::INT, 1)),
    COALESCE((it->>'total_price')::NUMERIC, 0),
    NULLIF(it->>'image_url', '')
  FROM jsonb_array_elements(p_items) AS it;

  -- E. Atomically decrement stock (protected by FOR UPDATE above)
  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items) AS value
    WHERE NULLIF(value->>'variant_id', '') IS NOT NULL
  LOOP
    v_variant_id := (v_item->>'variant_id')::UUID;
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::INT, 1));

    UPDATE public.product_variants
    SET
      stock = GREATEST(0, COALESCE(stock, 0) - v_qty),
      updated_at = NOW()
    WHERE id = v_variant_id;
  END LOOP;

  -- F. Transactional Outbox Enqueue (same commit as order!)
  FOR v_notif IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_notifications, '[]'::jsonb)) AS value
  LOOP
    INSERT INTO public.notification_outbox (
      order_id,
      channel,
      recipient_type,
      recipient_phone,
      event_type,
      dedupe_key,
      payload,
      status
    )
    VALUES (
      v_order.id,
      COALESCE(NULLIF(v_notif->>'channel', ''), 'whatsapp'),
      COALESCE(NULLIF(v_notif->>'recipient_type', ''), 'admin'),
      v_notif->>'recipient_phone',
      COALESCE(NULLIF(v_notif->>'event_type', ''), 'order_created'),
      v_notif->>'dedupe_key',
      COALESCE(v_notif->'payload', '{}'::jsonb),
      'pending'
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'deduplicated', false,
    'order', to_jsonb(v_order)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, JSONB, JSONB, JSONB) TO service_role;

