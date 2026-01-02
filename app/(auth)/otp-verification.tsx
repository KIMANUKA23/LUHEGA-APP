// OTP Verification Screen - Enter Verification Code
import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, StatusBar, ActivityIndicator, KeyboardAvoidingView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useApp } from "../../src/context/AppContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OTPVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyOTP, user, isAuthenticated } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [email] = useState(params.email || "your_email@example.com");
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    console.log("🟢 OTPVerificationScreen mounted");
  }, []);

  // Auto-route when user is authenticated after OTP verification
  useEffect(() => {
    if (verified && isAuthenticated && user) {
      if (user.role === 'admin') {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [verified, isAuthenticated, user, router]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, "");
    if (digit.length > 1) {
      // If multiple digits pasted, distribute them
      const digits = digit.split("").slice(0, 6 - index);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);
      // Focus the last filled input or next empty
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length === 6) {
      setLoading(true);
      try {
        await verifyOTP(email, code);
        // Mark as verified - useEffect will handle routing when user state updates
        setVerified(true);
      } catch (error: any) {
        // TODO: Show error toast
        console.log("OTP verification error:", error.message || error);
        alert(error.message || "Verification failed");
        setLoading(false);
      }
    }
  };

  const handleResendOTP = () => {
    // TODO: Implement resend OTP logic
    console.log("Resending OTP");
  };



  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} />

      {/* Back Button */}
      <View style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 16,
        zIndex: 50
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 32 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Spacer to push content lower while remaining stable */}
          <View style={{ flex: 1.5 }} />
          <View style={{ width: "100%", maxWidth: 400, alignSelf: 'center', alignItems: 'center' }}>
            {/* Icon */}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.primary + '15',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 32,
              }}
            >
              <MaterialIcons name="lock-person" size={32} color={colors.primary} />
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: colors.text,
                lineHeight: 36,
                textAlign: "center",
                marginBottom: 12,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Enter Verification Code
            </Text>

            {/* Subtitle */}
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                lineHeight: 24,
                textAlign: "center",
                marginBottom: 40,
                fontFamily: "Inter_400Regular",
              }}
            >
              We have sent a 6-digit code to{"\n"}
              <Text style={{ color: colors.text, fontWeight: '600' }}>{email}</Text>
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                width: '100%',
                marginBottom: 32,
              }}
            >
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  style={{
                    width: 48,
                    height: 60,
                    borderWidth: 2,
                    borderColor: focusedIndex === index ? colors.primary : colors.border,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    textAlign: "center",
                    fontSize: 24,
                    fontWeight: "700",
                    color: colors.text,
                    fontFamily: "Poppins_700Bold",
                  }}
                />
              ))}
            </View>

            {/* Resend OTP Link */}
            <TouchableOpacity
              onPress={handleResendOTP}
              style={{
                alignItems: "center",
                marginBottom: 40,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "500",
                  color: colors.primary,
                  lineHeight: 20,
                  fontFamily: "Inter_500Medium",
                }}
              >
                Resend OTP
              </Text>
            </TouchableOpacity>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading}
              style={{
                width: "100%",
                height: 56,
                borderRadius: 14,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: "#FFFFFF",
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Verify
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
