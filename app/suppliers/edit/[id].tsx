// Edit Supplier Screen - match existing style
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
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../../src/context/ThemeContext";
import * as supplierService from "../../../src/services/supplierService";

export default function EditSupplierScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSupplier();
  }, [id]);

  const loadSupplier = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supplier = await supplierService.getSupplier(id);
      if (supplier) {
        setName(supplier.name);
        setContact(supplier.contact_name || "");
        setPhone(supplier.phone || "");
        setEmail(supplier.email || "");
        setAddress(supplier.address || "");
        setPaymentTerms(supplier.payment_terms || "");
      } else {
        Alert.alert("Error", "Supplier not found");
        router.back();
      }
    } catch (error) {
      console.log("Error loading supplier:", error);
      Alert.alert("Error", "Failed to load supplier");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !name.trim()) {
      Alert.alert("Validation Error", "Supplier name is required.");
      return;
    }

    setSaving(true);
    try {
      await supplierService.updateSupplier(id, {
        name: name.trim(),
        contact_name: contact.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        payment_terms: paymentTerms.trim() || null,
      });
      Alert.alert("Success", "Supplier updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log('Error updating supplier:', error);
      Alert.alert(
        "Error",
        error.message || "Failed to update supplier. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Supplier",
      "Are you sure you want to delete this supplier? All associated purchase order history will be removed. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            try {
              await supplierService.deleteSupplier(id);
              Alert.alert("Success", "Supplier deleted successfully!", [
                { text: "OK", onPress: () => router.push("/suppliers") },
              ]);
            } catch (error: any) {
              console.log('Error deleting supplier:', error);
              Alert.alert(
                "Error",
                error.message || "Failed to delete supplier. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading supplier...</Text>
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
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Edit Supplier
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9999,
            backgroundColor: saving ? colors.border : colors.primary,
          }}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Supplier Info Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Supplier Information
          </Text>

          {/* Company Name */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Company Name *
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="business" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="Enter company name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Contact Person */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Contact Person *
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="person" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="Enter contact person name"
                placeholderTextColor={colors.textSecondary}
                value={contact}
                onChangeText={setContact}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Phone Number *
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="phone" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="+255 7XX XXX XXX"
                placeholderTextColor={colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Email Address
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="email" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="supplier@company.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Address */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Address
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="location-on" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  paddingTop: 16,
                  fontSize: 15,
                  color: colors.text,
                  textAlignVertical: "top",
                }}
                placeholder="Enter address"
                placeholderTextColor={colors.textSecondary}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Payment Terms */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Payment Terms
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="payment" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="e.g., Net 30 days"
                placeholderTextColor={colors.textSecondary}
                value={paymentTerms}
                onChangeText={setPaymentTerms}
              />
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.3)",
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: colors.error,
              marginBottom: 8,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Danger Zone
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: isDark ? "#F87171" : "#991B1B",
              marginBottom: 16,
              lineHeight: 18,
            }}
          >
            Deleting this supplier will remove all associated purchase order history. This action cannot be undone.
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.error,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="delete" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              Delete Supplier
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          padding: 16,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: saving ? colors.border : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


