import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jfrydmnmbelwxbdsuepo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnlkbW5tYmVsd3hiZHN1ZXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDg5MiwiZXhwIjoyMDc5MDMwODkyfQ.DukG_V_T_78o7GBTKavgb1tXPqJw0hD9vIW7YCDX9tY';

// This client has full administrative access and bypasses RLS policies.
// Use with extreme caution.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
