-- Add RLS Policies for notifications table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

-- Allow authenticated users to insert notifications
DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
CREATE POLICY "notifications_insert_all" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users to update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() 
  OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

-- Done!
SELECT 'Notifications RLS Policies added successfully!' as result;
