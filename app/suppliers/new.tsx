// Create New Supplier Screen - match existing style
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
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";
import * as supplierService from "@/services/supplierService";

export default function CreateSupplierScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Company name is required.");
      return;
    }

    setLoading(true);
    try {
      await supplierService.createSupplier({
        name: name.trim(),
        contact_name: contact.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        payment_terms: paymentTerms.trim() || null,
      });

      Alert.alert("Success", "Supplier created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log('Error creating supplier:', error);
      Alert.alert(
        "Error",
        error.message || "Failed to create supplier. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          New Supplier
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9999,
            backgroundColor: loading ? colors.border : colors.primary,
          }}
          activeOpacity={0.85}
        >
          {loading ? (
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
          disabled={loading}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: loading ? colors.border : colors.primary,
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
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Create Supplier
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


