// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Supabase configuration from environment variables or fallback to hardcoded values
// For Expo, use EXPO_PUBLIC_ prefix for environment variables
const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  'https://jfrydmnmbelwxbdsuepo.supabase.co';

const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnlkbW5tYmVsd3hiZHN1ZXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTQ4OTIsImV4cCI6MjA3OTAzMDg5Mn0.2WMQX3dXZveRj2rEvHFpw0QlHq0O1GveWiUWD5Iiy9k';

// Create Supabase client with AsyncStorage for session persistence
// Important: Ensure session is sent with all requests
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Ensure global headers include auth token
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
    },
  },
});

// Debug helper: Check if session is active
export async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.log('Session check error:', error);
    return null;
  }
  if (session) {
    console.log('✅ Active session found:', {
      userId: session.user.id,
      email: session.user.email,
      expiresAt: new Date(session.expires_at! * 1000).toISOString(),
    });
  } else {
    console.warn('⚠️ No active session - user is not authenticated');
  }
  return session;
}

// Database types (will be generated from Supabase later)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_id: string | null;
          name: string;
          username: string | null;
          email: string;
          phone: string | null;
          role: 'admin' | 'staff';
          status: 'active' | 'inactive';
          created_at: string;
        };
      };
      spareparts: {
        Row: {
          part_id: string;
          sku: string;
          name: string;
          category_id: string | null;
          supplier_id: string | null;
          description: string | null;
          cost_price: number;
          selling_price: number;
          quantity_in_stock: number;
          reorder_level: number;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      sales: {
        Row: {
          sale_id: string;
          user_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          sale_type: 'cash' | 'debit';
          total_amount: number;
          amount_paid: number;
          amount_remaining: number;
          payment_mode: string | null;
          sale_date: string;
          notes: string | null;
          synced: boolean;
          created_at: string;
        };
      };
      // Add more types as needed
    };
  };
};

