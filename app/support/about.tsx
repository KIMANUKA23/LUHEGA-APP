// About Screen
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";

export default function AboutScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 12,
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          About
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, alignItems: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo/Icon */}
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 32,
            marginBottom: 24,
          }}
        >
          <MaterialIcons name="inventory-2" size={64} color="#FFFFFF" />
        </View>

        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 8,
            fontFamily: "Poppins_700Bold",
          }}
        >
          LUHEGA
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            marginBottom: 32,
          }}
        >
          Spare Parts Management System
        </Text>

        {/* Version Info */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 20,
            width: "100%",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Version</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>1.0.0</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Build</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>2024.01</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Platform</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>React Native</Text>
          </View>
        </View>

        {/* Description */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 20,
            width: "100%",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            About LUHEGA
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              lineHeight: 22,
            }}
          >
            LUHEGA is a comprehensive spare parts management system designed to help businesses
            efficiently manage inventory, sales, purchases, and customer relationships. The app
            provides real-time tracking, offline capabilities, and seamless synchronization with
            cloud databases.
          </Text>
        </View>

        {/* Features */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 20,
            width: "100%",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            Key Features
          </Text>
          {[
            "Inventory Management",
            "Sales & POS System",
            "Purchase Orders",
            "Debt Tracking",
            "Returns Management",
            "Offline Support",
            "Real-time Sync",
            "Reports & Analytics",
          ].map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.text,
                  marginLeft: 12,
                }}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {/* Copyright */}
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          © 2024 LUHEGA. All rights reserved.
        </Text>
      </ScrollView>
    </View>
  );
}

