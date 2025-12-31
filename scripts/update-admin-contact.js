// Script to update admin user's email and phone number
// Run: node scripts/update-admin-contact.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jfrydmnmbelwxbdsuepo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// New admin contact details
const NEW_EMAIL = 'luhegacp1983@gmail.com';
const NEW_PHONE = '+255767788630';
const OLD_EMAIL = 'admin@luhega.com';

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
    console.log('\nTo get your Service Role Key:');
    console.log('1. Go to: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to: Settings > API');
    console.log('4. Copy the "service_role" key (NOT the anon key!)');
    console.log('\nThen run:');
    console.log('  export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.log('  node scripts/update-admin-contact.js\n');
    process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function updateAdminContact() {
    console.log('🔧 Updating admin contact details...\n');

    try {
        // Step 1: Find the admin user in Auth by old email
        console.log('1. Finding admin user in Supabase Auth...');
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) {
            throw listError;
        }

        const adminUser = users?.users?.find(u => u.email === OLD_EMAIL || u.user_metadata?.role === 'admin');

        if (!adminUser) {
            console.log('⚠️  Admin user not found in Auth. Checking users table...');
        } else {
            console.log('✅ Found admin user in Auth');
            console.log('   Current Email:', adminUser.email);
            console.log('   User ID:', adminUser.id);

            // Step 2: Update email in Supabase Auth
            console.log('\n2. Updating email in Supabase Auth...');
            const { data: updatedAuth, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
                adminUser.id,
                {
                    email: NEW_EMAIL,
                    email_confirm: true // Auto-confirm the new email
                }
            );

            if (updateAuthError) {
                console.error('⚠️  Error updating Auth email:', updateAuthError.message);
                console.log('   Continuing with users table update...');
            } else {
                console.log('✅ Email updated in Supabase Auth!');
                console.log('   New Email:', updatedAuth.user.email);
            }
        }

        // Step 3: Update users table
        console.log('\n3. Updating users table...');

        // First, try to find by old email
        let { data: userProfile, error: findError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', OLD_EMAIL)
            .single();

        // If not found by old email, try to find by role
        if (findError || !userProfile) {
            console.log('   Admin not found by old email, searching by role...');
            const { data: adminByRole, error: roleError } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('role', 'admin')
                .limit(1)
                .single();

            if (!roleError && adminByRole) {
                userProfile = adminByRole;
            }
        }

        if (!userProfile) {
            console.log('⚠️  Admin user not found in users table. Creating new profile...');

            // Create new admin profile
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('users')
                .insert({
                    email: NEW_EMAIL,
                    phone: NEW_PHONE,
                    name: 'Admin User',
                    username: 'admin',
                    role: 'admin',
                    status: 'active',
                })
                .select()
                .single();

            if (createError) {
                throw createError;
            }

            console.log('✅ New admin profile created!');
            console.log('   Email:', newProfile.email);
            console.log('   Phone:', newProfile.phone);
        } else {
            console.log('   Found admin user in users table');
            console.log('   Current Email:', userProfile.email);
            console.log('   Current Phone:', userProfile.phone || 'Not set');

            // Update the profile
            const { data: updatedProfile, error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    email: NEW_EMAIL,
                    phone: NEW_PHONE,
                })
                .eq('id', userProfile.id)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            console.log('✅ Users table updated!');
            console.log('   New Email:', updatedProfile.email);
            console.log('   New Phone:', updatedProfile.phone);
        }

        console.log('\n🎉 Admin contact details updated successfully!');
        console.log('\n📧 New Email: ' + NEW_EMAIL);
        console.log('📱 New Phone: ' + NEW_PHONE);
        console.log('\n⚠️  IMPORTANT: You can now login with:');
        console.log('   Email: ' + NEW_EMAIL);
        console.log('   Username: admin (still works)');
        console.log('   Password: (unchanged - Admin123! if you haven\'t changed it)\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

updateAdminContact();
