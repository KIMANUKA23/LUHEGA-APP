// Add New Staff Screen
import React, { useState } from "react";
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
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import * as userService from "@/services/userService";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useAuth } from "@/context/AuthContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useTheme } from "@/context/ThemeContext";

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

export default function AddStaffScreen() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    emergencyContact: "",
    role: "",
    password: "",
    permissions: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-set permissions based on role
      if (field === 'role') {
        if (value === 'admin') {
          // Admin gets all permissions
          updated.permissions = permissionOptions.map(p => p.id);
        } else {
          // Staff gets limited permissions
          updated.permissions = ['sales', 'inventory_view', 'returns'];
        }
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.role) newErrors.role = "Please select a role";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill in all required fields correctly.");
      return;
    }

    Alert.alert(
      "Add Staff",
      `Are you sure you want to add ${formData.name} as a ${formData.role.replace("_", " ")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Staff",
          onPress: async () => {
            setLoading(true);
            try {
              // Determine role: 'admin' if admin selected, otherwise 'staff'
              const userRole = formData.role === 'admin' ? 'admin' : 'staff';

              // Create staff user with email/password
              // autoSignIn: false keeps admin logged in as admin (doesn't switch to staff)
              await signUp(
                formData.email.trim(),
                formData.password.trim(),
                formData.name.trim(),
                userRole, // Use selected role
                false, // Don't sign in as the new staff - keep admin logged in
                formData.phone.trim() || undefined, // Pass phone number
                formData.address.trim() || undefined, // Pass address
                formData.emergencyContact.trim() || undefined // Pass emergency contact
              );

              // Force refresh staff list cache to show new staff immediately
              await userService.getUsers();

              // Better UX for Web: Navigate immediately without blocking Alert
              if (Platform.OS === 'web') {
                router.replace("/admin/staff");
                return;
              }

              Alert.alert("Success", "Staff member added successfully!", [
                { text: "OK", onPress: () => router.replace("/admin/staff") },
              ]);
            } catch (error: any) {
              console.log('Error creating staff:', error);

              // Check if it's an RLS policy error
              if (error.message?.includes('row-level security policy') || error.code === '42501') {
                Alert.alert(
                  "Database Permission Error",
                  "❌ Cannot create staff due to database security policy.\n\n" +
                  "🔧 FIX THIS NOW:\n\n" +
                  "1. Open: scripts/fix-users-rls-policies.sql\n" +
                  "2. Copy ALL the SQL code\n" +
                  "3. Go to: supabase.com/dashboard\n" +
                  "4. Select your project\n" +
                  "5. Click: SQL Editor\n" +
                  "6. Paste and click RUN\n" +
                  "7. Try adding staff again\n\n" +
                  "This will allow authenticated users to create staff profiles."
                );
              } else {
                Alert.alert(
                  "Error",
                  error.message || "Failed to create staff member. Please try again."
                );
              }
            } finally {
              setLoading(false);
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
          Add New Staff
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

            {/* Password */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Password <Text style={{ color: colors.error }}>*</Text>
              </Text>
              <TextInput
                value={formData.password}
                onChangeText={(text) => updateField("password", text)}
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: errors.password ? colors.error : colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: colors.text,
                }}
              />
              {errors.password && (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{errors.password}</Text>
              )}
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
                      backgroundColor: isSelected ? (isDark ? "rgba(0, 123, 255, 0.2)" : "rgba(0, 123, 255, 0.05)") : "transparent",
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
          disabled={loading}
          style={{
            backgroundColor: loading ? colors.border : colors.primary,
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
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#FFFFFF" }}>
              Add Staff Member
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

