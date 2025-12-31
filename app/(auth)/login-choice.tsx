// Login Choice Screen - EXACT match to Stitch design
import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Platform, StatusBar, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useAuth } from "../../src/context/AuthContext";

export default function LoginChoiceScreen() {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();

  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log("🔄 Already authenticated, redirecting...", { role: user.role });
      if (user.role === 'admin') {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, user, loading, router]);

  // Show loading indicator while auth is initializing
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" }}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={{ marginTop: 16, color: "#6B7280", fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <ExpoStatusBar style="dark" />
      <View className="flex-1 w-full items-center justify-center p-4" style={{ paddingTop: statusBarHeight }}>
        <View className="flex h-full w-full max-w-md items-center justify-center">
          {/* Logo Icon - 4 squares grid */}
          <View className="mb-8 items-center justify-center">
            <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#007BFF" strokeWidth={1.5}>
              <Path
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          {/* Welcome Heading */}
          <Text className="font-heading text-[#0c141d] dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight px-4 text-center pb-2">
            Welcome to LUHEGA
          </Text>

          {/* Subtitle */}
          <Text className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal pb-8 px-4 text-center">
            Your Partner in Spare Parts Management
          </Text>

          {/* Buttons Container */}
          <View className="w-full max-w-sm px-4">
            <View className="flex w-full flex-col items-stretch gap-4">
              {/* OTP Button */}
              <TouchableOpacity
                onPress={() => {
                  console.log("🔵 OTP button pressed - navigating to /login-otp");
                  try {
                    router.push("/login-otp");
                    console.log("✅ Navigation to /login-otp initiated");
                  } catch (error) {
                    console.log("❌ Navigation error:", error);
                  }
                }}
                style={{
                  backgroundColor: "rgba(0, 123, 255, 0.1)",
                  minWidth: 84,
                  width: "100%",
                  height: 48,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 20,
                  marginBottom: 12,
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#007BFF",
                    letterSpacing: 0.015,
                  }}
                >
                  OTP
                </Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                onPress={() => {
                  console.log("🔵 Login button pressed - navigating to /login-password");
                  try {
                    router.push("/login-password");
                    console.log("✅ Navigation to /login-password initiated");
                  } catch (error) {
                    console.log("❌ Navigation error:", error);
                  }
                }}
                style={{
                  backgroundColor: "#007BFF",
                  minWidth: 84,
                  width: "100%",
                  height: 48,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 20,
                }}
                activeOpacity={0.9}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#F8FAFC",
                    letterSpacing: 0.015,
                  }}
                >
                  Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

