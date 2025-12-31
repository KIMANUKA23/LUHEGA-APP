// Settings Screen - match existing style
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
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";

export default function SettingsScreen() {
  const router = useRouter();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [lowStockAlerts, setLowStockAlerts] = React.useState(true);
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ExpoStatusBar style="dark" backgroundColor="#F8F9FA" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 12,
          backgroundColor: "rgba(248, 249, 250, 0.9)",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(226, 232, 240, 0.8)",
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
          <MaterialIcons name="arrow-back" size={24} color="#1C1B1F" />
        </TouchableOpacity>

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "700",
            color: "#1C1B1F",
            fontFamily: "Poppins_700Bold",
          }}
        >
          Settings
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications Section */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6B7280",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Notifications
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E0E2E6",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(0, 123, 255, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="notifications" size={22} color="#007BFF" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    Push Notifications
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Receive notifications
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#E5E7EB", true: "rgba(0, 123, 255, 0.5)" }}
                thumbColor={notificationsEnabled ? "#007BFF" : "#9CA3AF"}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="inventory" size={22} color="#D97706" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    Low Stock Alerts
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Alert when stock is low
                  </Text>
                </View>
              </View>
              <Switch
                value={lowStockAlerts}
                onValueChange={setLowStockAlerts}
                trackColor={{ false: "#E5E7EB", true: "rgba(0, 123, 255, 0.5)" }}
                thumbColor={lowStockAlerts ? "#007BFF" : "#9CA3AF"}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(139, 92, 246, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="volume-up" size={22} color="#8B5CF6" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    Sound
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Play sound for notifications
                  </Text>
                </View>
              </View>
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: "#E5E7EB", true: "rgba(0, 123, 255, 0.5)" }}
                thumbColor={soundEnabled ? "#007BFF" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6B7280",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Appearance
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E0E2E6",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(17, 24, 39, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="dark-mode" size={22} color="#111827" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    Dark Mode
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Use dark theme
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: "#E5E7EB", true: "rgba(0, 123, 255, 0.5)" }}
                thumbColor={darkMode ? "#007BFF" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6B7280",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Data
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E0E2E6",
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="backup" size={22} color="#10B981" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    Backup Data
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Last backup: 2 hours ago
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="delete-sweep" size={22} color="#DC2626" />
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#DC2626" }}>
                    Clear Cache
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    Free up storage space
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#6B7280",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            About
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E0E2E6",
              padding: 16,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
                LUHEGA App
              </Text>
              <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                Version 1.0.0
              </Text>
              <Text style={{ fontSize: 13, color: "#9CA3AF", marginTop: 8, textAlign: "center" }}>
                Spare Parts Inventory Management System
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}


