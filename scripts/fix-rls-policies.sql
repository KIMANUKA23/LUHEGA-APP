-- Fix RLS Policies for LUHEGA App
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- ============================================
-- CATEGORIES TABLE - Allow authenticated users to read all
-- ============================================
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "categories_insert_admin" ON public.categories;
CREATE POLICY "categories_insert_admin" ON public.categories
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "categories_update_admin" ON public.categories;
CREATE POLICY "categories_update_admin" ON public.categories
FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS "categories_delete_admin" ON public.categories;
CREATE POLICY "categories_delete_admin" ON public.categories
FOR DELETE TO authenticated
USING (true);

-- ============================================
-- SUPPLIERS TABLE - Allow authenticated users to read all
-- ============================================
DROP POLICY IF EXISTS "suppliers_select_all" ON public.suppliers;
CREATE POLICY "suppliers_select_all" ON public.suppliers
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "suppliers_insert_admin" ON public.suppliers;
CREATE POLICY "suppliers_insert_admin" ON public.suppliers
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers_update_admin" ON public.suppliers;
CREATE POLICY "suppliers_update_admin" ON public.suppliers
FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS "suppliers_delete_admin" ON public.suppliers;
CREATE POLICY "suppliers_delete_admin" ON public.suppliers
FOR DELETE TO authenticated
USING (true);

-- ============================================
-- SPAREPARTS TABLE - Allow authenticated users to read all
-- ============================================
DROP POLICY IF EXISTS "spareparts_select_all" ON public.spareparts;
CREATE POLICY "spareparts_select_all" ON public.spareparts
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "spareparts_insert_admin" ON public.spareparts;
CREATE POLICY "spareparts_insert_admin" ON public.spareparts
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "spareparts_update_admin" ON public.spareparts;
CREATE POLICY "spareparts_update_admin" ON public.spareparts
FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS "spareparts_delete_admin" ON public.spareparts;
CREATE POLICY "spareparts_delete_admin" ON public.spareparts
FOR DELETE TO authenticated
USING (true);

-- ============================================
-- SALES TABLE
-- ============================================
DROP POLICY IF EXISTS "sales_select_all" ON public.sales;
CREATE POLICY "sales_select_all" ON public.sales
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "sales_insert_all" ON public.sales;
CREATE POLICY "sales_insert_all" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "sales_update_all" ON public.sales;
CREATE POLICY "sales_update_all" ON public.sales
FOR UPDATE TO authenticated
USING (true);

-- ============================================
-- SALEITEMS TABLE
-- ============================================
DROP POLICY IF EXISTS "saleitems_select_all" ON public.saleitems;
CREATE POLICY "saleitems_select_all" ON public.saleitems
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "saleitems_insert_all" ON public.saleitems;
CREATE POLICY "saleitems_insert_all" ON public.saleitems
FOR INSERT TO authenticated
WITH CHECK (true);

-- ============================================
-- USERS TABLE
-- ============================================
DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all" ON public.users
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
CREATE POLICY "users_insert_admin" ON public.users
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_admin" ON public.users;
CREATE POLICY "users_update_admin" ON public.users
FOR UPDATE TO authenticated
USING (true);

-- ============================================
-- CUSTOMERDEBTS TABLE
-- ============================================
DROP POLICY IF EXISTS "customerdebts_select_all" ON public.customerdebts;
CREATE POLICY "customerdebts_select_all" ON public.customerdebts
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "customerdebts_insert_all" ON public.customerdebts;
CREATE POLICY "customerdebts_insert_all" ON public.customerdebts
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "customerdebts_update_all" ON public.customerdebts;
CREATE POLICY "customerdebts_update_all" ON public.customerdebts
FOR UPDATE TO authenticated
USING (true);

-- ============================================
-- RETURNS TABLE
-- ============================================
DROP POLICY IF EXISTS "returns_select_all" ON public.returns;
CREATE POLICY "returns_select_all" ON public.returns
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "returns_insert_all" ON public.returns;
CREATE POLICY "returns_insert_all" ON public.returns
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "returns_update_all" ON public.returns;
CREATE POLICY "returns_update_all" ON public.returns
FOR UPDATE TO authenticated
USING (true);

-- ============================================
-- PURCHASEORDERS TABLE
-- ============================================
DROP POLICY IF EXISTS "purchaseorders_select_all" ON public.purchaseorders;
CREATE POLICY "purchaseorders_select_all" ON public.purchaseorders
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "purchaseorders_insert_admin" ON public.purchaseorders;
CREATE POLICY "purchaseorders_insert_admin" ON public.purchaseorders
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "purchaseorders_update_admin" ON public.purchaseorders;
CREATE POLICY "purchaseorders_update_admin" ON public.purchaseorders
FOR UPDATE TO authenticated
USING (true);

-- ============================================
-- INVENTORYAUDIT TABLE
-- ============================================
DROP POLICY IF EXISTS "inventoryaudit_select_all" ON public.inventoryaudit;
CREATE POLICY "inventoryaudit_select_all" ON public.inventoryaudit
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "inventoryaudit_insert_all" ON public.inventoryaudit;
CREATE POLICY "inventoryaudit_insert_all" ON public.inventoryaudit
FOR INSERT TO authenticated
WITH CHECK (true);

-- Done!
SELECT 'RLS Policies updated successfully!' as result;
