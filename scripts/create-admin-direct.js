// Direct script to create admin user - NO SERVICE ROLE KEY NEEDED
// This uses the Supabase Management API to create the user
// Run: node scripts/create-admin-direct.js

const SUPABASE_URL = 'https://jfrydmnmbelwxbdsuepo.supabase.co';
const ADMIN_EMAIL = 'admin@luhega.com';
const ADMIN_PASSWORD = 'Admin123!';

// Create admin user via Supabase Admin API endpoint
// Note: This requires either service role key OR we need to create it via Dashboard
// Since we can't use service role from client, let's create a helper script

async function createAdminUser() {
  console.log('🔧 Creating admin user...\n');
  console.log('⚠️  This script requires SUPABASE_SERVICE_ROLE_KEY');
  console.log('Get it from: Supabase Dashboard > Settings > API > service_role key\n');
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('📝 MANUAL SETUP REQUIRED:\n');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to: Authentication > Users');
    console.log('4. Click: "+ Add user"');
    console.log('5. Email: admin@luhega.com');
    console.log('6. Password: Admin123!');
    console.log('7. ✅ Check "Auto Confirm User"');
    console.log('8. Click "Create user"\n');
    console.log('Then login with username: admin, password: Admin123!\n');
    process.exit(1);
  }

  const { createClient } = require('@supabase/supabase-js');
  const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Admin User' },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ User already exists!');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Admin user created successfully!');
    }

    // Ensure profile exists
    await supabaseAdmin.from('users').upsert({
      email: ADMIN_EMAIL,
      name: 'Admin User',
      username: 'admin',
      role: 'admin',
      status: 'active',
    }, { onConflict: 'email' });

    console.log('✅ Setup complete! Login with:');
    console.log('   Username: admin');
    console.log('   Password: Admin123!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();

