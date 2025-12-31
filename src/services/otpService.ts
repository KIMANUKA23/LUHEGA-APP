// OTP Service - Generate and send verification codes via email
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

export interface OTPData {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

// Store OTP codes in memory (in production, use Redis or database)
const otpStore = new Map<string, OTPData>();

// Generate 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP code via email (using Supabase Edge Function for SMTP)
export async function sendOTPCode(email: string): Promise<void> {
  // Clean up expired codes first
  cleanupExpiredCodes();
  
  // Generate new OTP
  const code = generateOTPCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
  
  // Store OTP
  const otpData: OTPData = {
    email,
    code,
    expiresAt,
    attempts: 0
  };
  
  otpStore.set(email, otpData);
  
  console.log(`Generated OTP for ${email}: ${code} (expires in 10 minutes)`);
  
  try {
    // Call Supabase Edge Function to send email via SMTP
    const { data, error } = await supabase.functions.invoke('send-otp-email', {
      body: {
        email,
        code,
        subject: 'Your Login Verification Code',
        message: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
      }
    });
    
    if (error) {
      console.log('Error sending OTP email:', error);
      throw new Error('Failed to send verification code. Please try again.');
    }
    
    console.log('OTP email sent successfully to:', email);
  } catch (error) {
    console.log('OTP send error:', error);
    // Remove OTP from store if email failed
    otpStore.delete(email);
    throw error;
  }
}

// Verify OTP code
export function verifyOTP(email: string, code: string): boolean {
  const otpData = otpStore.get(email);
  
  if (!otpData) {
    console.log('No OTP found for email:', email);
    return false;
  }
  
  // Check if expired
  if (Date.now() > otpData.expiresAt) {
    console.log('OTP expired for email:', email);
    otpStore.delete(email);
    return false;
  }
  
  // Check attempts (max 3 attempts)
  if (otpData.attempts >= 3) {
    console.log('Too many OTP attempts for email:', email);
    otpStore.delete(email);
    return false;
  }
  
  // Increment attempts
  otpData.attempts++;
  
  // Verify code
  if (otpData.code === code) {
    console.log('OTP verified successfully for email:', email);
    otpStore.delete(email);
    return true;
  } else {
    console.log('Invalid OTP for email:', email, `attempt ${otpData.attempts}/3`);
    return false;
  }
}

// Clean up expired codes
function cleanupExpiredCodes(): void {
  const now = Date.now();
  for (const [email, otpData] of otpStore.entries()) {
    if (now > otpData.expiresAt) {
      otpStore.delete(email);
    }
  }
}

// Get remaining attempts for an email
export function getRemainingAttempts(email: string): number {
  const otpData = otpStore.get(email);
  if (!otpData) return 3;
  return Math.max(0, 3 - otpData.attempts);
}

// Check if OTP exists and is valid
export function isOTPValid(email: string): boolean {
  const otpData = otpStore.get(email);
  if (!otpData) return false;
  return Date.now() <= otpData.expiresAt && otpData.attempts < 3;
}
