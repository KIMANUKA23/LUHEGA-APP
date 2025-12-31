// Script to create admin Auth user using Admin API
// This requires SERVICE_ROLE_KEY (server-side only)
// Run: node scripts/create-auth-user-admin.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jfrydmnmbelwxbdsuepo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('\nTo get your Service Role Key:');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to: Settings > API');
  console.log('4. Copy the "service_role" key (NOT the anon key!)');
  console.log('\nThen run:');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('  node scripts/create-auth-user-admin.js\n');
  process.exit(1);
}

// Create admin client with service role key (has admin privileges)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminAuthUser() {
  const adminEmail = 'admin@luhega.com';
  const adminPassword = 'Admin123!';
  const adminName = 'Admin User';

  console.log('🔧 Creating admin Auth user...\n');

  try {
    // Check if user already exists in Auth
    console.log('1. Checking if user exists...');
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.warn('⚠️  Could not list users (this is okay):', listError.message);
    } else {
      const existingUser = existingUsers?.users?.find(u => u.email === adminEmail);
      if (existingUser) {
        console.log('✅ User already exists in Auth!');
        console.log('   User ID:', existingUser.id);
        console.log('   Email:', existingUser.email);
        console.log('   Confirmed:', existingUser.email_confirmed_at ? 'Yes' : 'No');
        console.log('\n✅ Setup complete! You can now login with:');
        console.log('   Username: admin');
        console.log('   Password: Admin123!\n');
        return;
      }
    }

    // Create user in Supabase Auth
    console.log('2. Creating user in Supabase Auth...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: adminName,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('✅ User already exists in Auth (detected during creation)');
      } else {
        throw authError;
      }
    } else {
      console.log('✅ User created in Supabase Auth!');
      console.log('   User ID:', authUser.user?.id);
      console.log('   Email:', authUser.user?.email);
    }

    // Verify user profile exists in users table
    console.log('\n3. Verifying user profile in users table...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', adminEmail)
      .single();

    if (profileError || !profile) {
      console.warn('⚠️  Profile not found in users table. Creating...');
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('users')
        .upsert({
          email: adminEmail,
          name: adminName,
          username: 'admin',
          role: 'admin',
          status: 'active',
        }, {
          onConflict: 'email',
        })
        .select()
        .single();

      if (createProfileError) {
        console.error('❌ Error creating profile:', createProfileError);
      } else {
        console.log('✅ Profile created/updated in users table!');
      }
    } else {
      console.log('✅ Profile exists in users table!');
      console.log('   Username:', profile.username);
      console.log('   Role:', profile.role);
    }

    console.log('\n🎉 Setup complete! You can now login with:');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

createAdminAuthUser();

