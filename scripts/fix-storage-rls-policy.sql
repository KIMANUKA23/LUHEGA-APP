-- Fix RLS policy for profiles storage bucket
-- Run this in Supabase Dashboard → SQL Editor

-- First, ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on the profiles bucket (optional)
DROP POLICY IF EXISTS "Allow authenticated users to upload to profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read from profiles" ON storage.objects;

-- Create policy for authenticated users to upload their own profile images
CREATE POLICY "Allow authenticated uploads to profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for authenticated users to update their own profile images
CREATE POLICY "Allow authenticated updates to profiles"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profiles' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for authenticated users to read their own profile images
CREATE POLICY "Allow authenticated reads from profiles"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'profiles' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for public access to profile images (for viewing)
CREATE POLICY "Allow public reads from profiles"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profiles');

-- Grant necessary permissions
GRANT ALL ON SCHEMA storage TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated, anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA storage TO authenticated, anon;
