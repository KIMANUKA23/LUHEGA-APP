-- Check current return_status values in saleitems
-- Run this in Supabase Dashboard → SQL Editor

SELECT 
  sale_id,
  sale_item_id,
  part_id,
  quantity,
  return_status,
  created_at
FROM saleitems 
ORDER BY created_at DESC 
LIMIT 10;
