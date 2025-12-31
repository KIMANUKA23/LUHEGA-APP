// Staff Detail Screen - View and manage individual staff member
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";

import * as userService from "../../src/services/userService";

const permissionLabels: Record<string, string> = {
  sales: "Process Sales",
  inventory_view: "View Inventory",
  inventory_full: "Full Inventory Access",
  reports: "View Reports",
  discounts: "Apply Discounts",
  returns: "Process Returns",
  suppliers: "Manage Suppliers",
  purchase_orders: "Purchase Orders",
};

// Helper for dynamic role colors
const getRoleStyle = (role: string, isDark: boolean) => {
  const roleKey = (role || "").toLowerCase();

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

export default function StaffDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const { getAllSales } = useApp();
  const { confirmStaffEmail, isAdmin: currentIsAdmin } = useAuth();

  useEffect(() => {
    loadStaffData();
  }, [id]);

  const loadStaffData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const userData = await userService.getUser(id);
      if (userData) {
        // Calculate sales stats
        const allSales = getAllSales();
        const staffSales = allSales.filter(sale => sale.staffId === id);
        const salesCount = staffSales.length;
        const totalRevenue = staffSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

        setStaff({
          ...userData,
          salesCount,
          totalRevenue,
          joinDate: userData.created_at ? new Date(userData.created_at).toISOString().split('T')[0] : "N/A",
          address: userData.address || "Not provided",
          emergencyContact: userData.emergency_contact || userData.phone || "Not provided",
          permissions: userData.role === "admin"
            ? ["sales", "inventory_view", "inventory_full", "reports", "discounts", "returns", "suppliers", "purchase_orders"]
            : ["sales", "inventory_view", "returns"],
        });
      }
    } catch (error) {
      console.log("Error loading staff:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading staff details...</Text>
      </View>
    );
  }

  if (!staff) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 8 }}>Staff member not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const roleStyle = getRoleStyle(staff.role, isDark);

  const handleToggleStatus = () => {
    Alert.alert(
      staff.status === "active" ? "Deactivate Staff" : "Activate Staff",
      `Are you sure you want to ${staff.status === "active" ? "deactivate" : "activate"} ${staff.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: staff.status === "active" ? "Deactivate" : "Activate",
          style: staff.status === "active" ? "destructive" : "default",
          onPress: async () => {
            try {
              const newStatus = staff.status === "active" ? "inactive" : "active";

              // Update staff status in database
              await userService.updateUser(id, { status: newStatus });

              // Force refresh staff list cache to show status changes immediately
              await userService.getUsers();

              // Update local state
              setStaff({ ...staff, status: newStatus });

              Alert.alert(
                "Success",
                `${staff.name} has been ${newStatus === "active" ? "activated" : "deactivated"} successfully`
              );
            } catch (error: any) {
              console.log("Error updating staff status:", error);
              Alert.alert("Error", error.message || "Failed to update staff status. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleVerifyEmail = async () => {
    if (!staff?.email) return;

    setVerifying(true);
    try {
      await confirmStaffEmail(staff.email);
      Alert.alert(
        "Success",
        `Staff member ${staff.name}'s email has been confirmed. They can now log in with their password. ✅`
      );
    } catch (error: any) {
      console.log("Error verifying email:", error);
      Alert.alert(
        "Verification Failed",
        "Could not verify email. Make sure you have deployed the 'admin-auth-utils' Edge Function.\n\nCommand: supabase functions deploy admin-auth-utils"
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Staff",
      `Are you sure you want to permanently delete ${staff.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete staff from database
              await userService.deleteUser(id);

              // Force refresh staff list cache to remove deleted staff immediately
              await userService.getUsers();

              Alert.alert(
                "Success",
                `${staff.name} has been deleted successfully`,
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (error: any) {
              console.log("Error deleting staff:", error);
              Alert.alert("Error", error.message || "Failed to delete staff. Please try again.");
            }
          },
        },
      ]
    );
  };

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
          Staff Details
        </Text>

        <TouchableOpacity
          onPress={() => router.push(`/staff/edit/${id}`)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 24,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 28,
              backgroundColor: roleStyle.bg,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 36,
                fontWeight: "700",
                color: roleStyle.text,
              }}
            >
              {staff.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </Text>
          </View>

          {/* Name & Role */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
              textAlign: "center",
            }}
          >
            {staff.name}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: roleStyle.bg,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: roleStyle.text }}>
                {staff.role}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: staff.status === "active"
                  ? (isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(16, 185, 129, 0.1)")
                  : (isDark ? "rgba(156, 163, 175, 0.2)" : "rgba(156, 163, 175, 0.1)"),
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: staff.status === "active" ? colors.success : colors.textSecondary,
                }}
              >
                {staff.status === "active" ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 24,
              paddingTop: 24,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              width: "100%",
            }}
          >
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "700", color: colors.primary }}>
                {staff.salesCount}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Total Sales</Text>
            </View>
            <View
              style={{
                width: 1,
                backgroundColor: colors.border,
                marginHorizontal: 16,
              }}
            />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.success }}>
                {formatTZS(staff.totalRevenue)}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Revenue Generated</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.03,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Contact Information
          </Text>

          {[
            {
              icon: "email",
              label: "Email",
              value: staff.email,
              action: currentIsAdmin ? (
                <TouchableOpacity
                  onPress={handleVerifyEmail}
                  disabled={verifying}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginLeft: 8
                  }}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ color: "#FFF", fontSize: 10, fontWeight: "600" }}>Verify</Text>
                  )}
                </TouchableOpacity>
              ) : null
            },
            { icon: "phone", label: "Phone", value: staff.phone },
            { icon: "location-on", label: "Address", value: staff.address },
            { icon: "contact-phone", label: "Emergency Contact", value: staff.emergencyContact },
            { icon: "event", label: "Join Date", value: new Date(staff.joinDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
          ].map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: index < 4 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: isDark ? "rgba(0, 123, 255, 0.2)" : "rgba(0, 123, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <MaterialIcons name={item.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.label}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text, marginTop: 2 }}>
                      {item.value}
                    </Text>
                  </View>
                  {"action" in item && item.action}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Permissions */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.03,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Permissions
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {staff.permissions.map((permission: string, index: number) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(16, 185, 129, 0.1)",
                  gap: 6,
                }}
              >
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Text style={{ fontSize: 13, fontWeight: "500", color: colors.success }}>
                  {permissionLabels[permission] || permission}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleToggleStatus}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: staff.status === "active"
                ? (isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7")
                : (isDark ? "rgba(16, 185, 129, 0.2)" : "#D1FAE5"),
              borderRadius: 12,
              paddingVertical: 16,
              gap: 8,
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={staff.status === "active" ? "block" : "check-circle"}
              size={22}
              color={staff.status === "active"
                ? (isDark ? "#FBBF24" : "#D97706")
                : (isDark ? "#4ADE80" : "#16A34A")}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: staff.status === "active"
                  ? (isDark ? "#FBBF24" : "#D97706")
                  : (isDark ? "#4ADE80" : "#16A34A"),
              }}
            >
              {staff.status === "active" ? "Deactivate Account" : "Activate Account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(220, 38, 38, 0.1)",
              borderRadius: 12,
              paddingVertical: 16,
              gap: 8,
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete" size={22} color={colors.error} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.error }}>
              Delete Staff
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

