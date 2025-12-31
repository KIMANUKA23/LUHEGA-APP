// Edit Customer Screen - match existing style
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
import * as customerService from "../../../src/services/customerService";

export default function EditCustomerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const customer = await customerService.getCustomer(id);
      if (customer) {
        setName(customer.name);
        setPhone(customer.phone || "");
        setEmail(customer.email || "");
        setAddress(""); // Address is not stored in aggregated customer data
      } else {
        Alert.alert("Error", "Customer not found");
        router.back();
      }
    } catch (error) {
      console.log("Error loading customer:", error);
      Alert.alert("Error", "Failed to load customer");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Note: Customers are aggregated from sales, so updating requires updating all sales records
    // For now, we'll show a message that customer info is managed through sales
    Alert.alert(
      "Info",
      "Customer information is automatically managed through sales records. To update customer details, create a new sale with the updated information.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Info",
      "Customers are aggregated from sales records. To remove a customer, you would need to delete or modify their sales records. This action is not recommended as it affects sales history.",
      [{ text: "OK" }]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" }}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>Loading customer...</Text>
      </View>
    );
  }

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
          <MaterialIcons name="close" size={24} color="#1C1B1F" />
        </TouchableOpacity>

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "700",
            color: "#1C1B1F",
            fontFamily: "Poppins_700Bold",
          }}
        >
          Edit Customer
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9999,
            backgroundColor: "#007BFF",
          }}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Customer Info Card */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E0E2E6",
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Customer Information
          </Text>

          {/* Name */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Full Name *
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons
                name="person"
                size={20}
                color="#9CA3AF"
                style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }}
              />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: "#1C1B1F",
                }}
                placeholder="Enter customer name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Phone Number *
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons
                name="phone"
                size={20}
                color="#9CA3AF"
                style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }}
              />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: "#1C1B1F",
                }}
                placeholder="+255 7XX XXX XXX"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Email Address
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons
                name="email"
                size={20}
                color="#9CA3AF"
                style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }}
              />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: "#1C1B1F",
                }}
                placeholder="customer@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Address */}
          <View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              Address
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons
                name="location-on"
                size={20}
                color="#9CA3AF"
                style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }}
              />
              <TextInput
                style={{
                  height: 80,
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingLeft: 44,
                  paddingRight: 16,
                  paddingTop: 16,
                  fontSize: 15,
                  color: "#1C1B1F",
                  textAlignVertical: "top",
                }}
                placeholder="Enter address"
                placeholderTextColor="#9CA3AF"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            padding: 12,
            backgroundColor: "rgba(0, 123, 255, 0.08)",
            borderRadius: 12,
            gap: 12,
          }}
        >
          <MaterialIcons name="info" size={20} color="#007BFF" />
          <Text style={{ flex: 1, fontSize: 13, color: "#1E40AF", lineHeight: 18 }}>
            Customer information is automatically aggregated from sales records. To update customer details, create a new sale with the updated information.
          </Text>
        </View>

        {/* Danger Zone */}
        <View
          style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.3)",
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#DC2626",
              marginBottom: 8,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Danger Zone
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#991B1B",
              marginBottom: 16,
              lineHeight: 18,
            }}
          >
            Deleting this customer will remove all their data including purchase history
            and debt records. This action cannot be undone.
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: "#DC2626",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="delete" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              Delete Customer
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: "#007BFF",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#007BFF",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#FFFFFF",
            }}
          >
            Save Changes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


