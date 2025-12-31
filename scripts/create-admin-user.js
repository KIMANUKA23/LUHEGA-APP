// Script to create initial admin user in Supabase
// Run this once to set up the admin account
// Usage: node scripts/create-admin-user.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jfrydmnmbelwxbdsuepo.supabase.co';
// You'll need to set the SERVICE_ROLE_KEY as an environment variable
// Get it from: Supabase Dashboard > Settings > API > service_role key
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  const adminEmail = 'admin@luhega.com';
  const adminPassword = 'Admin123!@#'; // Change this to a secure password
  const adminName = 'Admin User';

  try {
    console.log('Creating admin user...');

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: adminName,
        role: 'admin',
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('Admin user already exists in Auth.');
      } else {
        throw authError;
      }
    } else {
      console.log('✓ Admin user created in Auth:', authUser.user?.email);
    }

    // Create profile in users table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        email: adminEmail,
        name: adminName,
        role: 'admin',
        status: 'active',
      }, {
        onConflict: 'email',
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError);
    } else {
      console.log('✓ Admin profile created in users table:', profile.email);
    }

    console.log('\n✓ Admin user setup complete!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();

