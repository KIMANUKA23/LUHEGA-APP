-- ===============================================
-- LUHEGA APP - PRODUCTION DATABASE CLEANUP SCRIPT (V3 - Admin Reset)
-- ===============================================
-- Run this in Supabase SQL Editor to clean all data
-- while PRESERVING admin user credentials.
-- 
-- IMPORTANT: Run this BEFORE building the APK!
-- The app will download fresh data from cleaned server.
-- ===============================================

BEGIN;

-- ===============================================
-- DELETE ALL TRANSACTIONAL DATA (Order matters!)
-- ===============================================

-- 1. Notifications
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;

-- 2. Feedback
TRUNCATE TABLE feedback RESTART IDENTITY CASCADE;

-- 3. Inventory Audits
TRUNCATE TABLE inventoryaudit RESTART IDENTITY CASCADE;

-- 4. Returns
TRUNCATE TABLE returns RESTART IDENTITY CASCADE;

-- 5. Customer Debts
TRUNCATE TABLE customerdebts RESTART IDENTITY CASCADE;

-- 6. Sale Items
TRUNCATE TABLE saleitems RESTART IDENTITY CASCADE;

-- 7. Sales
TRUNCATE TABLE sales RESTART IDENTITY CASCADE;

-- 8. Purchase Items
TRUNCATE TABLE purchaseitems RESTART IDENTITY CASCADE;

-- 9. Purchase Orders
TRUNCATE TABLE purchaseorders RESTART IDENTITY CASCADE;

-- ===============================================
-- DELETE MASTER DATA
-- ===============================================

-- 10. Customers
TRUNCATE TABLE customers RESTART IDENTITY CASCADE;

-- 11. Spare Parts
TRUNCATE TABLE spareparts RESTART IDENTITY CASCADE;

-- 12. Categories
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;

-- 13. Suppliers
TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE;

-- 14. Unauthorized Spares
TRUNCATE TABLE unauthorizedspares RESTART IDENTITY CASCADE;

-- ===============================================
-- USER CLEANUP
-- ===============================================

-- 15. Delete ALL Staff Users (Keep admins only)
DELETE FROM users WHERE role != 'admin';

-- 16. Reset Admin Profile (Optional - make admin look fresh too)
--     Keeps credentials (email, id, name) but clears profile photo, address, etc.
UPDATE users 
SET photo_url = NULL, 
    address = NULL, 
    emergency_contact = NULL, 
    phone = NULL,
    status = 'active'
WHERE role = 'admin';

COMMIT;

-- ===============================================
-- SUCCESS! Database is now clean and ready for production.
-- ===============================================
