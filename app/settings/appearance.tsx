// Appearance Settings Screen
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";

export default function AppearanceScreen() {
  const router = useRouter();
  const { colors, mode, isDark, setMode } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const modes: { value: "light" | "dark" | "auto"; label: string; description: string }[] = [
    {
      value: "light",
      label: "Light Mode",
      description: "Always use light theme",
    },
    {
      value: "dark",
      label: "Dark Mode",
      description: "Always use dark theme",
    },
    {
      value: "auto",
      label: "Auto",
      description: "Follow system settings",
    },
  ];

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
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
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
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Appearance
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Selection */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {modes.map((modeOption, index) => {
            const isSelected = mode === modeOption.value;
            return (
              <TouchableOpacity
                key={modeOption.value}
                onPress={() => setMode(modeOption.value)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  borderBottomWidth: index < modes.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  backgroundColor: isSelected ? (isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(0, 123, 255, 0.1)") : "transparent",
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                      marginBottom: 4,
                    }}
                  >
                    {modeOption.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {modeOption.description}
                  </Text>
                </View>
                {isSelected && (
                  <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preview Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
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
            Preview
          </Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 }}>
              Sample Card
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              This is how the app will look with {mode === "auto" ? "system" : mode} theme.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

