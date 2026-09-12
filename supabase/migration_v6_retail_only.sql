-- ==============================================================================
-- AMIN RAISAT HOSIERY — PRODUCTION DATABASE MIGRATION V6
-- 100% RETAIL-ONLY STORE ARCHITECTURE
-- Production-Safe, Idempotent Migration
-- ==============================================================================

-- 1. Ensure shipping_settings reflects pure retail business rules:
-- Minimum order quantity = 1 piece (1 piece is a valid order)
-- Free delivery threshold = 3 pieces
-- Base delivery charge = 200 PKR
UPDATE public.shipping_settings 
SET min_order_qty = 1, 
    free_delivery_threshold = 3, 
    base_delivery_charge = 200, 
    updated_at = NOW();

-- 2. Safely drop any legacy wholesale columns from tables if they were ever added
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS is_wholesale_enabled CASCADE;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS wholesale_min_qty CASCADE;
ALTER TABLE IF EXISTS public.product_variants DROP COLUMN IF EXISTS wholesale_price CASCADE;
ALTER TABLE IF EXISTS public.product_variants DROP COLUMN IF EXISTS wholesale_tiers CASCADE;
ALTER TABLE IF EXISTS public.orders DROP COLUMN IF EXISTS is_wholesale CASCADE;
ALTER TABLE IF EXISTS public.orders DROP COLUMN IF EXISTS wholesale_discount CASCADE;
ALTER TABLE IF EXISTS public.order_items DROP COLUMN IF EXISTS is_wholesale CASCADE;
ALTER TABLE IF EXISTS public.order_items DROP COLUMN IF EXISTS wholesale_price CASCADE;
ALTER TABLE IF EXISTS public.site_settings DROP COLUMN IF EXISTS wholesale_enabled CASCADE;
ALTER TABLE IF EXISTS public.site_settings DROP COLUMN IF EXISTS wholesale_min_qty CASCADE;
