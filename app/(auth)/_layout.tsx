// Auth Layout - Stack navigator for auth screens
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login-choice" />
      <Stack.Screen name="login-password" />
      <Stack.Screen name="login-otp" />
      <Stack.Screen name="otp-verification" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}

