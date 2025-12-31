const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jfrydmnmbelwxbdsuepo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnlkbW5tYmVsd3hiZHN1ZXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDg5MiwiZXhwIjoyMDc5MDMwODkyfQ.DukG_V_T_78o7GBTKavgb1tXPqJw0hD9vIW7YCDX9tY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyAccess() {
    console.log('Verifying Supabase Admin access...');
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error.message);
        process.exit(1);
    }

    console.log(`Successfully listed ${data.users.length} users.`);
    data.users.forEach(u => {
        console.log(`- ${u.email} (Verified: ${!!u.email_confirmed_at})`);
    });
}

verifyAccess();
