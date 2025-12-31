-- Add RLS Policies for feedback table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select feedback
DROP POLICY IF EXISTS "feedback_select_all" ON public.feedback;
CREATE POLICY "feedback_select_all" ON public.feedback
FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to insert feedback
DROP POLICY IF EXISTS "feedback_insert_all" ON public.feedback;
CREATE POLICY "feedback_insert_all" ON public.feedback
FOR INSERT TO authenticated
WITH CHECK (true);

-- Done!
SELECT 'Feedback RLS Policies added successfully!' as result;
