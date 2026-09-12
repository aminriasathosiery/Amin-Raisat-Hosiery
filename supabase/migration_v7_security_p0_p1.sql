-- ==============================================================================
-- AMIN RAISAT HOSIERY — PRODUCTION DATABASE MIGRATION V7
-- FINAL P0 / P1 / P3 SECURITY REMEDIATION & DATA INTEGRITY
--
-- Instructions:
-- Run this script in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Project Reference: pqjpgexmupcuuqfzchhc
-- ==============================================================================

-- ==============================================================================
-- 1. P0: SECURE ORDERS TABLE (ENABLE RLS & BLOCK ANONYMOUS SELECT/UPDATE/DELETE)
-- ==============================================================================

-- Enable Row Level Security on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop all existing permissive or outdated policies on orders
DROP POLICY IF EXISTS "Allow public select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow anon select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow full operations orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Deny anon select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow server insert orders" ON public.orders;

-- 1A. Explicitly deny anonymous users from selecting any orders
CREATE POLICY "Deny anon select orders" 
ON public.orders FOR SELECT 
TO anon 
USING (false);

-- 1B. Explicitly deny anonymous users from updating any orders
CREATE POLICY "Deny anon update orders" 
ON public.orders FOR UPDATE 
TO anon 
USING (false)
WITH CHECK (false);

-- 1C. Explicitly deny anonymous users from deleting any orders
CREATE POLICY "Deny anon delete orders" 
ON public.orders FOR DELETE 
TO anon 
USING (false);

-- 1D. Allow server-side order creation (permits order insert via API client)
CREATE POLICY "Allow server insert orders" 
ON public.orders FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Revoke direct anon select/update/delete permissions on orders
REVOKE SELECT, UPDATE, DELETE ON public.orders FROM anon;


-- ==============================================================================
-- 2. P0: SECURE ORDER_ITEMS TABLE (ENABLE RLS & BLOCK ANONYMOUS SELECT/UPDATE/DELETE)
-- ==============================================================================

-- Enable Row Level Security on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Drop all existing permissive or outdated policies on order_items
DROP POLICY IF EXISTS "Allow public select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public delete order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow full operations order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Deny anon select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow server insert order_items" ON public.order_items;

-- 2A. Explicitly deny anonymous users from selecting order items
CREATE POLICY "Deny anon select order_items" 
ON public.order_items FOR SELECT 
TO anon 
USING (false);

-- 2B. Explicitly deny anonymous users from updating order items
CREATE POLICY "Deny anon update order_items" 
ON public.order_items FOR UPDATE 
TO anon 
USING (false)
WITH CHECK (false);

-- 2C. Explicitly deny anonymous users from deleting order items
CREATE POLICY "Deny anon delete order_items" 
ON public.order_items FOR DELETE 
TO anon 
USING (false);

-- 2D. Allow server-side order items creation (permits line items insert via API client)
CREATE POLICY "Allow server insert order_items" 
ON public.order_items FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Revoke direct anon select/update/delete permissions on order_items
REVOKE SELECT, UPDATE, DELETE ON public.order_items FROM anon;


-- ==============================================================================
-- 3. P1: SECURE REVIEWS TABLE (BLOCK AUTO-APPROVED REVIEWS FROM ANONYMOUS CLIENTS)
-- ==============================================================================

-- Enable Row Level Security on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow authenticated insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow anon insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow full operations reviews" ON public.reviews;
DROP POLICY IF EXISTS "Strict anon insert pending reviews only" ON public.reviews;

-- 3A. Public can ONLY read approved reviews
CREATE POLICY "Allow public read approved reviews" 
ON public.reviews FOR SELECT 
TO anon, authenticated
USING (is_approved = true);

-- 3B. Anonymous/public inserts MUST strictly have is_approved = false (Pending Moderation)
-- Any attempt to submit is_approved = true via direct REST API will be rejected by RLS (42501)
CREATE POLICY "Strict anon insert pending reviews only" 
ON public.reviews FOR INSERT 
TO anon, authenticated
WITH CHECK (is_approved = false OR is_approved IS NULL);

-- 3C. Revoke direct anon update/delete permissions on reviews
REVOKE UPDATE, DELETE ON public.reviews FROM anon;


-- ==============================================================================
-- 4. CLEANUP OF KNOWN DEVELOPMENT / TEST ORDERS
-- ==============================================================================

-- Delete dependent line items for known test orders
DELETE FROM public.order_items 
WHERE order_id IN (
    SELECT id FROM public.orders 
    WHERE order_number IN (
        'ARH-TEST-7980',
        'ARH-DEBUG-6383',
        'ARH-967391',
        'ARH-969249',
        'ARH-971334',
        'ARH-973540',
        'ARH-829649',
        'ARH-881586',
        'ARH-002493',
        'ARH-189505',
        'ARH-442706',
        'ARH-443863'
    )
    OR customer_name IN (
        'Test Customer',
        'Debug Customer',
        'Test Buyer 1-Piece',
        'Test Buyer 2-Pieces',
        'Test Buyer 3-Pieces',
        'Test Wholesale Merchant',
        'Audit Test Customer',
        'Tamper Tester',
        'Threshold Tester'
    )
);

-- Delete test orders from orders table
DELETE FROM public.orders 
WHERE order_number IN (
    'ARH-TEST-7980',
    'ARH-DEBUG-6383',
    'ARH-967391',
    'ARH-969249',
    'ARH-971334',
    'ARH-973540',
    'ARH-829649',
    'ARH-881586',
    'ARH-002493',
    'ARH-189505',
    'ARH-442706',
    'ARH-443863'
)
OR customer_name IN (
    'Test Customer',
    'Debug Customer',
    'Test Buyer 1-Piece',
    'Test Buyer 2-Pieces',
    'Test Buyer 3-Pieces',
    'Test Wholesale Merchant',
    'Audit Test Customer',
    'Tamper Tester',
    'Threshold Tester'
);
