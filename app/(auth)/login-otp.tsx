// Login OTP Screen - EXACT match to Stitch design
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Platform, StatusBar, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useApp } from "../../src/context/AppContext";

export default function LoginOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || "");
  const { signInWithOTP } = useAuth();
  const { colors, isDark, setMode } = useTheme();
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    console.log("🟢 LoginOTPScreen mounted");
  }, []);
  const [error, setError] = useState<string | null>(null);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setSending(true);
    setError(null);

    try {
      await signInWithOTP(email.trim());
      // Navigate to OTP verification screen
      router.push({
        pathname: "/(auth)/otp-verification",
        params: { email: email.trim() },
      });
    } catch (error: any) {
      setError(error.message || "Failed to send OTP");
      console.log("OTP send error:", error.message || error);
    } finally {
      setSending(false);
    }
  };

  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} />

      {/* Back Button */}
      <View style={{
        position: 'absolute',
        top: statusBarHeight + 12,
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

      {/* Theme Toggle Button */}


      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: "100%", maxWidth: 400, alignSelf: 'center' }}>
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
                alignSelf: 'center',
              }}
            >
              <MaterialIcons name="mail-outline" size={32} color={colors.primary} />
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: colors.text,
                lineHeight: 40,
                textAlign: "center",
                marginBottom: 12,
                fontFamily: "Poppins_700Bold",
                alignSelf: 'center',
              }}
            >
              Verify your Identity
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
                alignSelf: 'center',
              }}
            >
              Please enter your email address to receive a verification code.
            </Text>

            {/* Email Input Field */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.text,
                  marginLeft: 4,
                }}
              >
                Email Address
              </Text>
              <View style={{ width: "100%", height: 56, justifyContent: 'center' }}>
                <MaterialIcons
                  name="alternate-email"
                  size={20}
                  color={colors.textSecondary}
                  style={{
                    position: "absolute",
                    left: 16,
                    zIndex: 1,
                  }}
                />
                <TextInput
                  placeholder="name@company.com"
                  placeholderTextColor={colors.textSecondary + '80'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  style={{
                    width: "100%",
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    height: 56,
                    paddingLeft: 48,
                    paddingRight: 16,
                    fontSize: 16,
                    color: colors.text,
                    fontFamily: "Inter_400Regular",
                  }}
                />
              </View>
            </View>

            {error && (
              <Text style={{ color: colors.error, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
                {error}
              </Text>
            )}

            {/* Send OTP Button */}
            <View style={{ marginTop: 40 }}>
              <TouchableOpacity
                onPress={handleSendOTP}
                activeOpacity={0.8}
                disabled={sending}
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
              >
                {sending ? (
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
                    Send OTP
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

