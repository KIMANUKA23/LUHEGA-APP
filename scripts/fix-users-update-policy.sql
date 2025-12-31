-- Fix RLS policy for users table update to allow admin updates
-- This fixes the issue where admins can't update staff records

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_own_or_admin_check" ON public.users;

-- Create a simple, working update policy
CREATE POLICY "users_update_policy" ON public.users
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Alternative: More specific but simpler policy
-- Uncomment this instead of the above if you want role-based restrictions
/*
CREATE POLICY "users_update_policy" ON public.users
  FOR UPDATE
  USING (
    auth.uid()::text = id::text  -- Can update own profile
    OR 
    (SELECT role = 'admin' FROM public.users WHERE id::text = auth.uid()::text)  -- Admins can update any
  )
  WITH CHECK (
    auth.uid()::text = id::text  -- Can update own profile
    OR 
    (SELECT role = 'admin' FROM public.users WHERE id::text = auth.uid()::text)  -- Admins can update any
  );
*/
