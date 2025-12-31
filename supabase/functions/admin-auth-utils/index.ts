// @ts-nocheck
// Supabase Edge Function to confirm user emails
// Deploy: supabase functions deploy admin-auth-utils

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
    try {
        console.log('Admin Auth Utils invoked');
        const url = Deno.env.get('SUPABASE_URL') || '';
        const key = Deno.env.get('ADMIN_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        if (!url || !key) {
            console.error('Missing configuration: URL or Key is empty');
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const supabaseAdmin = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })

        const body = await req.json();
        console.log('Request body:', body);
        const { email, action } = body;

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'confirm_email') {
            // Find user by email
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            if (listError) throw listError

            const user = users.find(u => u.email === email)
            if (!user) {
                return new Response(
                    JSON.stringify({ error: 'User not found' }),
                    { status: 404, headers: { 'Content-Type': 'application/json' } }
                )
            }

            // Confirm user email
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                user.id,
                { email_confirm: true }
            )

            if (updateError) throw updateError

            return new Response(
                JSON.stringify({ success: true, message: `Email ${email} confirmed successfully` }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'create_session') {
            // Find user by email
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
            if (listError) throw listError

            const user = users.find(u => u.email === email)
            if (!user) {
                return new Response(
                    JSON.stringify({ error: 'User not found in auth' }),
                    { status: 404, headers: { 'Content-Type': 'application/json' } }
                )
            }

            // Generate session for this user
            const { data, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: email,
            })

            if (sessionError) throw sessionError

            // Extract the access and refresh tokens from the magic link
            // The link contains the tokens we need
            const url = new URL(data.properties.action_link)
            const accessToken = url.searchParams.get('access_token')
            const refreshToken = url.searchParams.get('refresh_token')

            if (!accessToken || !refreshToken) {
                throw new Error('Failed to generate session tokens')
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    user: {
                        id: user.id,
                        email: user.email,
                    }
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
