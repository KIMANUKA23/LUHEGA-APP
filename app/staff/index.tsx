// Staff Management Screen - List all staff members
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as userService from "../../src/services/userService";
import { useRoleGuard } from "../../src/hooks/useRoleGuard";
import { useTheme } from "../../src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

type StaffData = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive";
  avatar: null;
  salesCount: number;
  joinDate: string;
};

// Functions to get dynamic role colors
const getRoleStyle = (role: string, isDark: boolean) => {
  const roleKey = role.toLowerCase();

  if (roleKey.includes("admin")) {
    return {
      bg: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(220, 38, 38, 0.1)",
      text: isDark ? "#F87171" : "#DC2626"
    };
  }
  if (roleKey.includes("cashier") || roleKey.includes("staff")) {
    return {
      bg: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(16, 185, 129, 0.1)",
      text: isDark ? "#4ADE80" : "#16A34A"
    };
  }
  if (roleKey.includes("inventory")) {
    return {
      bg: isDark ? "rgba(167, 139, 250, 0.2)" : "rgba(139, 92, 246, 0.1)",
      text: isDark ? "#A78BFA" : "#8B5CF6"
    };
  }
  if (roleKey.includes("warehouse")) {
    return {
      bg: isDark ? "rgba(251, 191, 36, 0.2)" : "rgba(245, 158, 11, 0.1)",
      text: isDark ? "#FBBF24" : "#D97706"
    };
  }
  if (roleKey.includes("sales")) {
    return {
      bg: isDark ? "rgba(96, 165, 250, 0.2)" : "rgba(0, 123, 255, 0.1)",
      text: isDark ? "#60A5FA" : "#007BFF"
    };
  }

  return {
    bg: isDark ? "rgba(156, 163, 175, 0.2)" : "#E5E7EB",
    text: isDark ? "#9CA3AF" : "#374151"
  };
};

export default function StaffListScreen() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [staffData, setStaffData] = useState<StaffData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStaff = async () => {
    try {
      setLoading(true);
      // Get all users (both staff and admin) to show complete staff list
      const users = await userService.getUsers();
      const staffList: StaffData[] = users.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role === "admin" ? "Admin" : "Staff",
        email: user.email,
        phone: user.phone,
        status: user.status,
        avatar: null,
        salesCount: 0,
        joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString() : "Recently",
      }));
      setStaffData(staffList);
    } catch (error) {
      console.log("Error loading staff:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadStaff();
    }, [])
  );

  const filteredStaff = staffData.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || staff.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const activeCount = staffData.filter((s) => s.status === "active").length;
  const roles = [...new Set(staffData.map((s) => s.role))];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading staff...</Text>
      </View>
    );
  }

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
          Staff Management
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Stats Cards */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 16,
          gap: 12,
        }}
      >
        <TouchableOpacity
          style={{ flex: 1, borderRadius: 16, overflow: "hidden", elevation: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isDark ? ["#1E40AF", "#1E3A8A"] : ["#3B82F6", "#1D4ED8"]}
            style={{ padding: 16, height: 90, justifyContent: "center" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="people" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>Total Staff</Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF", fontFamily: "Poppins_700Bold" }}>
                  {staffData.length}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, borderRadius: 16, overflow: "hidden", elevation: 4, shadowColor: colors.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isDark ? ["#065F46", "#044E39"] : ["#10B981", "#059669"]}
            style={{ padding: 16, height: 90, justifyContent: "center" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="verified-user" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>Active</Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF", fontFamily: "Poppins_700Bold" }}>
                  {activeCount}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            height: 48,
          }}
        >
          <MaterialIcons name="search" size={22} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search staff by name, email, or role..."
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 15,
              color: colors.text,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Filter */}
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            alignItems: 'center',
            gap: 8,
            height: '100%'
          }}
        >
          <TouchableOpacity
            onPress={() => setFilterRole(null)}
            style={{
              height: 38,
              paddingHorizontal: 18,
              borderRadius: 9999,
              backgroundColor: !filterRole ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: !filterRole ? colors.primary : colors.border,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: !filterRole ? "700" : "600",
                color: !filterRole ? "#FFFFFF" : colors.textSecondary,
              }}
            >
              All Roles
            </Text>
          </TouchableOpacity>
          {roles.map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => setFilterRole(role === filterRole ? null : role)}
              style={{
                height: 38,
                paddingHorizontal: 18,
                borderRadius: 9999,
                backgroundColor: filterRole === role ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: filterRole === role ? colors.primary : colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: filterRole === role ? "700" : "600",
                  color: filterRole === role ? "#FFFFFF" : colors.textSecondary,
                }}
              >
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Staff List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredStaff.map((staff) => {
          const roleStyle = getRoleStyle(staff.role, isDark);
          return (
            <TouchableOpacity
              key={staff.id}
              onPress={() => router.push(`/staff/${staff.id}`)}
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Avatar */}
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: roleStyle.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: roleStyle.text,
                    }}
                  >
                    {staff.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.text,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      {staff.name}
                    </Text>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: staff.status === "active" ? colors.success : colors.textSecondary,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: roleStyle.bg,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: roleStyle.text,
                      }}
                    >
                      {staff.role}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                    {staff.email}
                  </Text>
                </View>

                {/* Actions */}
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {staff.salesCount} sales
                  </Text>
                  <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredStaff.length === 0 && (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
            }}
          >
            <MaterialIcons name="search-off" size={64} color={colors.border} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textSecondary,
                marginTop: 16,
              }}
            >
              No staff found
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
              Try adjusting your search or filter
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB - Add Staff */}
      <TouchableOpacity
        onPress={() => router.push("/staff/new")}
        style={{
          position: "absolute",
          bottom: 80,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        activeOpacity={0.8}
      >
        <MaterialIcons name="person-add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
