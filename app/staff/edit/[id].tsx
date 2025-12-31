// Edit Staff Screen
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { useAuth } from "../../../src/context/AuthContext";
import { useTheme } from "../../../src/context/ThemeContext";

import * as userService from "../../../src/services/userService";

const roles = [
  { id: "cashier", label: "Cashier", icon: "point-of-sale" },
  { id: "sales_manager", label: "Sales Manager", icon: "person" },
  { id: "inventory_manager", label: "Inventory Manager", icon: "inventory" },
  { id: "warehouse_staff", label: "Warehouse Staff", icon: "warehouse" },
  { id: "admin", label: "Admin", icon: "admin-panel-settings" },
];

const permissionOptions = [
  { id: "sales", label: "Process Sales", icon: "shopping-cart" },
  { id: "inventory_view", label: "View Inventory", icon: "visibility" },
  { id: "inventory_full", label: "Full Inventory Access", icon: "inventory-2" },
  { id: "reports", label: "View Reports", icon: "bar-chart" },
  { id: "discounts", label: "Apply Discounts", icon: "local-offer" },
  { id: "returns", label: "Process Returns", icon: "assignment-return" },
  { id: "suppliers", label: "Manage Suppliers", icon: "local-shipping" },
  { id: "purchase_orders", label: "Purchase Orders", icon: "receipt-long" },
];

export default function EditStaffScreen() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    emergencyContact: "",
    role: "",
    permissions: [] as string[],
  });
  const [staffNotFound, setStaffNotFound] = useState(false);

  useEffect(() => {
    loadStaffData();
  }, [id]);

  const loadStaffData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const userData = await userService.getUser(id);
      if (userData) {
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          address: userData.address || "",
          emergencyContact: userData.emergency_contact || "",
          role: userData.role || "",
          permissions: userData.role === "admin"
            ? ["sales", "inventory_view", "inventory_full", "reports", "discounts", "returns", "suppliers", "purchase_orders"]
            : ["sales", "inventory_view", "returns"],
        });
        setStaffNotFound(false);
      } else {
        setStaffNotFound(true);
      }
    } catch (error) {
      console.log("Error loading staff:", error);
      setStaffNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p: string) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.role) newErrors.role = "Please select a role";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill in all required fields correctly.");
      return;
    }

    Alert.alert(
      "Update Staff",
      `Are you sure you want to update ${formData.name}'s information?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            setLoading(true);
            try {
              // Update staff in database
              await userService.updateUser(id, {
                name: formData.name.trim(),
                phone: formData.phone.trim() || null,
                address: formData.address.trim() || null,
                emergency_contact: formData.emergencyContact.trim() || null,
                role: formData.role as any,
              });

              // Force refresh staff list cache to show updates immediately
              await userService.getUsers();

              Alert.alert("Success", "Staff information updated successfully!", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error: any) {
              console.log("Error updating staff:", error);
              Alert.alert("Error", error.message || "Failed to update staff. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 16 }}>Loading staff data...</Text>
      </View>
    );
  }

  if (staffNotFound) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name="error" size={64} color={colors.error} />
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginTop: 16 }}>
          Staff not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 12,
            backgroundColor: colors.primary,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}>Go Back</Text>
        </TouchableOpacity>
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
          <MaterialIcons name="close" size={24} color={colors.text} />
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
          Edit Staff
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Information */}
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
              Personal Information
            </Text>

            {/* Full Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Full Name <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => updateField("name", text)}
                placeholder="Enter full name"
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: errors.name ? colors.error : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: colors.text,
                }}
              />
              {errors.name && (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{errors.name}</Text>
              )}
            </View>

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Email Address <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                value={formData.email}
                onChangeText={(text) => updateField("email", text)}
                placeholder="Enter email address"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: errors.email ? colors.error : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: colors.text,
                }}
              />
              {errors.email && (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{errors.email}</Text>
              )}
            </View>

            {/* Phone */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Phone Number <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                value={formData.phone}
                onChangeText={(text) => updateField("phone", text)}
                placeholder="+255 7XX XXX XXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: errors.phone ? colors.error : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: colors.text,
                }}
              />
              {errors.phone && (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{errors.phone}</Text>
              )}
            </View>

            {/* Address */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Address
              </Text>
              <TextInput
                value={formData.address}
                onChangeText={(text) => updateField("address", text)}
                placeholder="Enter address"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: colors.text,
                  textAlignVertical: "top",
                  minHeight: 80,
                }}
              />
            </View>

            {/* Emergency Contact */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Emergency Contact
              </Text>
              <TextInput
                value={formData.emergencyContact}
                onChangeText={(text) => updateField("emergencyContact", text)}
                placeholder="+255 7XX XXX XXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: colors.text,
                }}
              />
            </View>
          </View>

          {/* Role Selection */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: errors.role ? colors.error : colors.border,
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
              Select Role <Text style={{ color: colors.error }}>*</Text>
            </Text>

            <View style={{ gap: 10 }}>
              {roles.map((role) => {
                const isSelected = formData.role === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    onPress={() => updateField("role", role.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? (isDark ? "rgba(0, 123, 255, 0.2)" : "rgba(0, 123, 255, 0.05)") : colors.surface,
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: isSelected ? (isDark ? "rgba(0, 123, 255, 0.3)" : "rgba(0, 123, 255, 0.1)") : colors.surface,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <MaterialIcons
                        name={role.icon as any}
                        size={22}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: "600",
                        color: isSelected ? colors.primary : colors.text,
                      }}
                    >
                      {role.label}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {errors.role && (
              <Text style={{ fontSize: 12, color: colors.error, marginTop: 8 }}>{errors.role}</Text>
            )}
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

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {permissionOptions.map((permission) => {
                const isSelected = formData.permissions.includes(permission.id);
                return (
                  <TouchableOpacity
                    key={permission.id}
                    onPress={() => togglePermission(permission.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.success : colors.border,
                      backgroundColor: isSelected ? (isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(16, 185, 129, 0.1)") : "transparent",
                      gap: 6,
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={isSelected ? "check-box" : "check-box-outline-blank"}
                      size={18}
                      color={isSelected ? colors.success : colors.textSecondary}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "500",
                        color: isSelected ? colors.success : colors.textSecondary,
                      }}
                    >
                      {permission.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>
            Update Staff
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
