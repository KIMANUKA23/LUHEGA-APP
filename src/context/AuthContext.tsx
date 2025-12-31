// Authentication Context using Supabase Auth
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { initOfflineDB } from "../lib/database";
import { syncAll } from "../services/syncService";
import { clearLocalNotifications } from "../services/notificationService";

export type UserRole = "admin" | "staff";

export type User = {
  id: string;
  name: string;
  email: string;
  username?: string;
  role: UserRole;
  status?: string;
  phone?: string;
  photo_url?: string;
  address?: string;
  emergency_contact?: string;
  created_at?: string;
  updated_at?: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
  signInWithPassword: (username: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string, name?: string, role?: UserRole, autoSignIn?: boolean, phone?: string, address?: string, emergencyContact?: string) => Promise<void>;
  signInWithOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  confirmStaffEmail: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateUserState: (user: User) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from users table
  const fetchUserProfile = async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', supabaseUser.email)
        .single();

      if (error || !userData) {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
            username: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
            role: 'staff',
            status: 'active',
            address: null,
            emergency_contact: null,
          })
          .select()
          .single();

        if (createError || !newUser) {
          console.log('Error creating user profile:', createError);
          return null;
        }

        return {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          username: newUser.username || newUser.name || undefined,
          role: newUser.role as UserRole,
          phone: newUser.phone || undefined,
          photo_url: newUser.photo_url || undefined,
          address: newUser.address || undefined,
          emergency_contact: newUser.emergency_contact || undefined,
        };
      }

      return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        username: userData.username || userData.name || undefined,
        role: userData.role as UserRole,
        phone: userData.phone || undefined,
        photo_url: userData.photo_url || undefined,
        address: userData.address || undefined,
        emergency_contact: userData.emergency_contact || undefined,
      };
    } catch (error) {
      console.log('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    initOfflineDB().catch(err => {
      console.log("Failed to initialize offline DB:", err);
    });

    supabase.auth.getSession()
      .then((result) => {
        if (!mounted) return;
        const { data: { session }, error } = result;

        if (error) {
          console.log("Error getting session:", error);
          if (mounted) setLoading(false);
          return;
        }

        setSession(session);
        if (session?.user) {
          fetchUserProfile(session.user)
            .then(profile => {
              if (mounted) {
                setUser(profile);
                setLoading(false);
              }
            })
            .catch(err => {
              console.log("Error fetching user profile:", err);
              if (mounted) {
                setUser(null);
                setLoading(false);
              }
            });
        } else {
          if (mounted) setLoading(false);
        }
      })
      .catch((error) => {
        console.log("Session check failed:", error);
        if (mounted) {
          setLoading(false);
          setSession(null);
          setUser(null);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setSession(session);

      if (session?.user) {
        try {
          const userProfile = await fetchUserProfile(session.user);
          if (mounted) setUser(userProfile);

          if (_event === 'SIGNED_IN') {
            syncAll().catch(err => {
              console.log("Sync error (non-blocking):", err);
            });
          }
        } catch (error) {
          console.log("Error in auth state change:", error);
          if (mounted) setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (username: string, password: string) => {
    let userEmail: string | null = null;

    if (username.includes('@')) {
      userEmail = username;
      // Check status for email login
      const { data: emailStatus } = await supabase
        .from('users')
        .select('status')
        .eq('email', userEmail)
        .maybeSingle();

      if (emailStatus && emailStatus.status !== 'active') {
        throw new Error('Your account is deactivated. Please contact admin at +255 767 788 630 for assistance.');
      }
    } else {
      const { data: userData, error: lookupError } = await supabase
        .from('users')
        .select('email, status')
        .ilike('username', username)
        .maybeSingle();

      if (lookupError) {
        if (lookupError.code === 'PGRST116' || lookupError.message?.includes('0 rows')) {
          throw new Error('Username not found. Please check your username or contact admin.');
        }
        throw new Error('Invalid username or password. Please check your credentials.');
      }

      if (!userData) {
        throw new Error('Username not found. Please check your username or contact admin.');
      }

      if (userData.status !== 'active') {
        throw new Error('Your account is deactivated. Please contact admin at +255 767 788 630 for assistance.');
      }

      userEmail = userData.email;
    }

    if (!userEmail) {
      throw new Error('User not found. Please check your username.');
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        if (userEmail === 'admin@luhega.com') {
          throw new Error('❌ Admin user not found!\n\nFIX THIS NOW:\n1. Open: Supabase Dashboard\n2. Authentication → Users → "+ Add User"\n3. Email: admin@luhega.com\n4. ✅ CHECK "Auto Confirm User"\n\nOnce done, you can login! ✅');
        } else {
          throw new Error('Invalid username or password. Please try again.');
        }
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error(`VERIFY_EMAIL_REQUIRED:${userEmail} `);
      }
      throw new Error('Login failed: ' + (error.message || 'Unknown error.'));
    }

    if (signInData.user) {
      const profile = await fetchUserProfile(signInData.user);
      // We also manually update state here to ensure immediate responsiveness
      // The onAuthStateChange listener will eventually fire, but this is faster for the UI return
      setUser(profile);
      return profile;
    }

    return null;
  };

  const signInWithOTP = async (email: string) => {
    // Check if user is active before sending OTP
    const { data: userData } = await supabase
      .from('users')
      .select('status')
      .eq('email', email)
      .maybeSingle();

    if (userData && userData.status !== 'active') {
      throw new Error('Your account is deactivated. Please contact admin at +255 767 788 630 for assistance.');
    }

    const { sendOTPCode } = await import('../services/otpService');
    await sendOTPCode(email);
  };

  const verifyOTP = async (email: string, token: string) => {
    setLoading(true);
    try {
      const { verifyOTP: verifyOTPCode } = await import('../services/otpService');
      const isValid = verifyOTPCode(email, token);

      if (!isValid) {
        throw new Error('Invalid or expired verification code');
      }

      // Fetch user data first to check status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('User not found with this email');
      }

      if (userData.status !== 'active') {
        throw new Error('Your account is deactivated. Please contact admin at +255 767 788 630 for assistance.');
      }

      // Permanently verify the email in Supabase Auth so they can use password next time
      try {
        await confirmStaffEmail(email);
      } catch (confirmError) {
        console.log('Non-critical: Failed to confirm email in Auth during OTP flow:', confirmError);
        // We continue because they have a valid OTP, but they might need OTP again next time
      }

      // Create a proper Supabase session using our admin function
      try {
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke('admin-auth-utils', {
          body: { email, action: 'create_session' },
        });

        if (sessionError) throw sessionError;

        if (sessionData?.success && sessionData.access_token && sessionData.refresh_token) {
          // Set the session using the tokens we received
          const { data: { session }, error: setSessionError } = await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
          });

          if (setSessionError) {
            console.log('Failed to set session:', setSessionError);
            throw setSessionError;
          }

          console.log('✅ OTP verified and Supabase session created successfully');

          // Manually update user state immediately for consistent redirect behavior
          if (session?.user) {
            const profile = await fetchUserProfile(session.user);
            setUser(profile);
          }
        } else {
          throw new Error('Failed to create session: Invalid response from server');
        }
      } catch (sessionError: any) {
        console.log('Error creating session:', sessionError);
        // Fallback to manual user setting (old behavior - won't have full session)
        console.warn('⚠️ Falling back to manual user setting without session');
        setUser({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role as UserRole,
          status: userData.status,
          phone: userData.phone,
          address: userData.address,
          emergency_contact: userData.emergency_contact,
          created_at: userData.created_at,
          updated_at: userData.updated_at,
        });
      }

    } catch (error: any) {
      console.log('OTP verification error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmStaffEmail = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-auth-utils', {
        body: { email, action: 'confirm_email' },
      });

      if (error) throw new Error(error.message || 'Failed to confirm email');

      if (data?.success) {
        return true;
      } else {
        throw new Error(data?.error || 'Unknown error confirming email');
      }
    } catch (err: any) {
      console.log('Error in confirmStaffEmail:', err);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, name?: string, role: UserRole = 'staff', autoSignIn: boolean = true, phone?: string, address?: string, emergencyContact?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || email.split('@')[0],
        },
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      if (autoSignIn && (error.message.includes('already registered'))) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (signInData.user) {
          const userProfile = await fetchUserProfile(signInData.user);
          setUser(userProfile);
          syncAll().catch(console.log);
          return;
        }
      }
      throw error;
    }

    if (data.user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email,
          name: name || email.split('@')[0],
          username: name || email.split('@')[0],
          phone: phone || null,
          address: address || null,
          emergency_contact: emergencyContact || null,
          role: role,
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') {
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

          if (existingUser) {
            await supabase.from('users').update({ role }).eq('email', email);
            if (autoSignIn) {
              const profile = await fetchUserProfile(data.user);
              setUser(profile);
              syncAll().catch(console.log);
            }
            return;
          }
        }
        throw createError;
      }

      if (newUser) {
        try {
          await confirmStaffEmail(email);
        } catch (e) {
          console.log("Auto-verify failed:", e);
        }

        if (autoSignIn) {
          const profile: User = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            username: newUser.username || undefined,
            role: newUser.role as UserRole,
            phone: newUser.phone || undefined,
            address: newUser.address || undefined,
            emergency_contact: newUser.emergency_contact || undefined,
          };
          setUser(profile);
          syncAll().catch(console.log);
        }
      }
    }
  };

  const signOut = async () => {
    try {
      await clearLocalNotifications();
    } catch (e) {
      console.log("Error clearing local notifications during logout:", e);
    }
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    if (error) throw error;
  };

  const logout = signOut;

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    if (data.session?.user) {
      setSession(data.session);
      const profile = await fetchUserProfile(data.session.user);
      setUser(profile);
    }
  };

  const updateUserState = (newUser: User) => {
    setUser(newUser);
  };

  const value = useMemo(() => ({
    user,
    session,
    isAuthenticated: !!session && !!user,
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "staff",
    loading,
    signInWithPassword,
    signUp,
    signInWithOTP,
    verifyOTP,
    confirmStaffEmail,
    signOut,
    refreshSession,
    updateUserState,
    logout,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
