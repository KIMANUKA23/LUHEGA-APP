// Sales Tab - show New Sale (POS) screen
import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import NewSaleScreen from "../sales/new";

export default function SalesScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/(auth)/login-choice");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <NewSaleScreen />;
}

