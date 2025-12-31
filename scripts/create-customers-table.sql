-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  total_purchases INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  outstanding_debt INTEGER DEFAULT 0,
  last_visit TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read customers
CREATE POLICY "customers_select_authenticated" ON public.customers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for authenticated users to insert customers
CREATE POLICY "customers_insert_authenticated" ON public.customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for authenticated users to update customers
CREATE POLICY "customers_update_authenticated" ON public.customers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for authenticated users to delete customers
CREATE POLICY "customers_delete_authenticated" ON public.customers
  FOR DELETE USING (auth.role() = 'authenticated');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- Grant permissions
GRANT ALL ON public.customers TO authenticated;
GRANT SELECT ON public.customers TO anon;
