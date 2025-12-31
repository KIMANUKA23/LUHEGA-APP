// Utility to ensure Supabase client has authenticated session before operations
import { supabase } from '../lib/supabase';

/**
 * Verifies that the Supabase client has an authenticated session
 * Throws an error if not authenticated
 * This is the main function used throughout the app
 */
export async function verifyAuthenticated() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.log('❌ Authentication check error:', error);
    throw new Error(`Authentication error: ${error.message}`);
  }
  if (!session) {
    console.log('❌ No active session - user is not authenticated');
    throw new Error('User is not authenticated. Please log in.');
  }
  
  // Verify session is valid and not expired
  if (session.expires_at && session.expires_at * 1000 < Date.now()) {
    console.log('❌ Session expired');
    throw new Error('Session expired. Please log in again.');
  }
  
  console.log('✅ Authentication verified:', {
    userId: session.user.id,
    email: session.user.email,
  });
  
  return session;
}

/**
 * Alias for verifyAuthenticated (for backward compatibility)
 */
export async function ensureAuthenticated(): Promise<void> {
  await verifyAuthenticated();
}

/**
 * Gets the current authenticated user's email
 * Used for linking auth.users to public.users
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email || null;
}

