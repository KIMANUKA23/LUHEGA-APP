// Profile Screen - match existing style
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

type MenuItem = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle?: string;
  route?: string;
  color?: string;
  bgColor?: string;
  action?: () => void;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAdmin, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { colors, mode, isDark, setMode } = useTheme();
  const insets = useSafeAreaInsets();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/(auth)/login-choice");
    }
  }, [isAuthenticated, authLoading, router]);

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Logging out...</Text>
      </View>
    );
  }

  // Get display mode text
  const getModeText = () => {
    if (mode === "dark") return "Dark mode";
    if (mode === "light") return "Light mode";
    return "Auto (system)";
  };

  // Get user joined date (default to "Recently" if not available)
  const joinedDate = "Recently"; // User data doesn't include created_at yet

  // Build menu sections based on role
  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Account",
      items: [
        { icon: "person", label: "Edit Profile", subtitle: "Update your personal information", route: "/profile/edit" },
        { icon: "lock", label: "Change Password", subtitle: "Update your password", route: "/profile/password" },
        { icon: "notifications", label: "Notifications", subtitle: "View and manage notifications", route: "/notifications" },
      ] as MenuItem[],
    },
    {
      title: "App Settings",
      items: [
        { icon: "language", label: "Language", subtitle: "English", route: "/settings/language" },
        {
          icon: "dark-mode",
          label: "Appearance",
          subtitle: getModeText(),
          route: undefined, // Handle manually
          action: () => setMode(isDark ? 'light' : 'dark')
        },
        { icon: "receipt-long", label: "Receipt Settings", subtitle: "Customize receipts", route: "/settings/receipts" },
      ] as (MenuItem & { action?: () => void })[],
    },
    ...(isAdmin
      ? [
        {
          title: "Admin Tools",
          items: [
            { icon: "warning", label: "Unauthorized Spares", subtitle: "View and manage incidents", route: "/unauthorized" },
          ] as MenuItem[],
        },
      ]
      : []),
    {
      title: "Support",
      items: [
        { icon: "help", label: "Help Center", subtitle: "FAQs and guides", route: "/support/help" },
        { icon: "feedback", label: "Send Feedback", subtitle: "Report issues or suggestions", route: "/support/feedback" },
        { icon: "info", label: "About", subtitle: "Version 1.0.0", route: "/support/about" },
      ] as MenuItem[],
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      // Wait a bit to ensure router is ready
      setTimeout(() => {
        try {
          router.replace("/(auth)/login-choice");
        } catch (navError) {
          console.log("Navigation error after logout:", navError);
          // Fallback: just reload the app
        }
      }, 100);
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: Math.max(insets.top, StatusBar.currentHeight || 0) + 32,
            paddingBottom: 24,
            backgroundColor: colors.card, // Standardized to card background
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Profile
          </Text>
        </View>

        {/* Profile Card */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24, marginTop: 16 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 10,
              elevation: 3,
              alignItems: "center",
            }}
          >
            {/* Avatar */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 9999,
                backgroundColor: isDark ? "#374151" : "#E9D5C3",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              {user?.photo_url ? (
                <Image
                  source={{ uri: user.photo_url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons name="person" size={40} color={isDark ? "#9CA3AF" : "#8B6F47"} />
              )}
            </View>

            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
              }}
            >
              {user?.name || "User"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
              {user?.email || "No email"}
            </Text>

            {/* Role Badge */}
            <View
              style={{
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(0, 123, 255, 0.1)",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                {user?.role === "admin" ? "Admin" : "Staff"}
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 12 }}>
              Member since {joinedDate}
            </Text>

            {/* Edit Profile Button */}
            <TouchableOpacity
              onPress={() => router.push("/profile/edit")}
              style={{
                marginTop: 16,
                paddingHorizontal: 24,
                paddingVertical: 10,
                borderRadius: 9999,
                backgroundColor: colors.primary,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={section.title} style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.textSecondary,
                paddingHorizontal: 16,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {section.title}
            </Text>

            <View
              style={{
                marginHorizontal: 16,
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 10,
                elevation: 3,
                overflow: "hidden",
              }}
            >
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => item.action ? item.action() : (item.route && router.push(item.route))}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderBottomWidth: itemIndex < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: item.bgColor || (isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(0, 123, 255, 0.1)"),
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={item.color || colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: colors.text,
                      }}
                    >
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              height: 56,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEF2F2",
              borderWidth: 1,
              borderColor: isDark ? "rgba(239, 68, 68, 0.5)" : "rgba(239, 68, 68, 0.3)",
              gap: 8,
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="logout" size={22} color={colors.error} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.error }}>
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
