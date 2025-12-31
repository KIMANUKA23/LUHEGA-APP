import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

export default function LoginPasswordScreen() {
  const router = useRouter();
  const { signInWithPassword, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors, isDark, setMode } = useTheme();

  React.useEffect(() => {
    console.log("🟢 LoginPasswordScreen mounted");
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoginLoading(true);
    setError(null);

    try {
      // signInWithPassword returns the user profile
      const loggedInUser = await signInWithPassword(username.trim(), password);

      // Route based on the returned user's role
      if (loggedInUser) {
        console.log('Login successful, routing user:', {
          email: loggedInUser.email,
          role: loggedInUser.role
        });

        if (loggedInUser.role === 'admin') {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/(tabs)");
        }
      } else {
        // Fallback: wait and check context
        await new Promise(resolve => setTimeout(resolve, 300));
        if (user?.role === 'admin') {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/(tabs)");
        }
      }
    } catch (error: any) {
      // Show clear error messages
      const errorMsg = error.message || "Login failed. Please try again.";

      // If error message contains instructions (has newlines), show full message
      if (errorMsg.includes('\n') || errorMsg.includes('Dashboard') || errorMsg.includes('create the user')) {
        // This is a detailed instruction message, show it fully
        setError(errorMsg);
      } else if (errorMsg.includes('Username not found')) {
        setError(errorMsg);
      } else if (errorMsg.includes('Invalid username or password') || errorMsg.includes('Invalid')) {
        setError(errorMsg);
      } else if (errorMsg.includes('VERIFY_EMAIL_REQUIRED')) {
        const userEmail = errorMsg.split(':')[1];
        Alert.alert(
          "First Time Login",
          "Your account is created but your email is not yet verified. Please log in via OTP (Email) for your first login to verify your account.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Login via OTP",
              onPress: () => router.push({
                pathname: "/login-otp",
                params: { email: userEmail }
              })
            }
          ]
        );
      } else if (errorMsg.includes('Email not confirmed') || errorMsg.includes('not verified')) {
        setError(errorMsg);
      } else if (errorMsg.includes('Password should be at least')) {
        setError("Password must be at least 6 characters long.");
      } else if (errorMsg.includes('inactive')) {
        setError(errorMsg);
      } else {
        setError(errorMsg);
      }
      console.log("Login error:", error.message || error);
    } finally {
      setLoginLoading(false);
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
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>



      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 24,
            paddingTop: statusBarHeight + 80,
            flexGrow: 1,
            justifyContent: "center" // Center content when keyboard is dismissed
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: 32, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 8,
                fontFamily: "Poppins_700Bold",
                textAlign: "center",
              }}
            >
              Welcome Back
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                lineHeight: 24,
                textAlign: "center",
              }}
            >
              Sign in to manage inventory and view reports.
            </Text>
          </View>

          <View style={{ gap: 20 }}>
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Username
              </Text>
              <View
                style={{
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                }}
              >
                <MaterialIcons
                  name="person-outline"
                  size={24}
                  color={colors.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                }}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={24}
                  color={colors.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
                  borderRadius: 12,
                  gap: 8,
                }}
              >
                <MaterialIcons name="error-outline" size={20} color={colors.error} />
                <Text style={{ fontSize: 13, color: colors.error, flex: 1 }}>
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loginLoading}
              style={{
                height: 56,
                borderRadius: 16,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 8,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}
              activeOpacity={0.8}
            >
              {loginLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View >
  );
}
