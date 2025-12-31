-- Fix RLS policies for users table to allow staff creation
-- This fixes the error: "new row violates row-level security policy for table \"users\""

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_authenticated" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin_only" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to SELECT (read) user profiles
-- This is needed for staff lists, user lookups, etc.
CREATE POLICY "users_select_authenticated" ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users to INSERT new user profiles
-- This is needed when creating staff accounts or when a new user signs up
-- The app logic controls who can create what role (admin vs staff)
CREATE POLICY "users_insert_authenticated" ON public.users
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow users to UPDATE their own profile
-- Also allow admins to update any profile (for role changes, status updates)
CREATE POLICY "users_update_own_or_admin" ON public.users
  FOR UPDATE
  USING (
    auth.uid()::text = id::text 
    OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Policy 4: Only admins can DELETE users
CREATE POLICY "users_delete_admin_only" ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text 
      AND role = 'admin'
    )
  );

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT DELETE ON public.users TO authenticated;

-- Optional: Grant SELECT to anon for public user lookups (if needed)
-- GRANT SELECT ON public.users TO anon;
