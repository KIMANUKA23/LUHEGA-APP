const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jfrydmnmbelwxbdsuepo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnlkbW5tYmVsd3hiZHN1ZXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1NDg5MiwiZXhwIjoyMDc5MDMwODkyfQ.DukG_V_T_78o7GBTKavgb1tXPqJw0hD9vIW7YCDX9tY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyAllUsers() {
    console.log('Fetching all users...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError.message);
        return;
    }

    console.log(`Processing ${users.length} users...`);

    for (const user of users) {
        if (!user.email_confirmed_at) {
            console.log(`Verifying email for: ${user.email}...`);
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                user.id,
                { email_confirm: true }
            );

            if (updateError) {
                console.error(`Failed to verify ${user.email}:`, updateError.message);
            } else {
                console.log(`✅ ${user.email} is now verified!`);
            }
        } else {
            console.log(`- ${user.email} is already verified.`);
        }
    }

    console.log('\nAll users processed! Staff can now login with their passwords. 🚀');
}

verifyAllUsers();
