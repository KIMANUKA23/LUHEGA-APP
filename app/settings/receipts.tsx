// Receipt Settings Screen - Customize receipt settings
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import * as settingsService from "../../src/services/settingsService";

export default function ReceiptSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAdmin } = useAuth();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  // Loading state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Receipt settings state
  const [showStoreInfo, setShowStoreInfo] = useState(true);
  const [showTaxInfo, setShowTaxInfo] = useState(true);
  const [showPaymentDetails, setShowPaymentDetails] = useState(true);
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);
  const [printAutomatically, setPrintAutomatically] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [storeName, setStoreName] = useState("LUHEGA Auto Parts");
  const [storeAddress, setStoreAddress] = useState("Dar es Salaam, Tanzania");
  const [storePhone, setStorePhone] = useState("+255 700 000 000");
  const [footerMessage, setFooterMessage] = useState("Thank you for your business!");

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await settingsService.getReceiptSettings();
        setShowStoreInfo(settings.showStoreInfo);
        setShowTaxInfo(settings.showTaxInfo);
        setShowPaymentDetails(settings.showPaymentDetails);
        setShowCustomerInfo(settings.showCustomerInfo);
        setPrintAutomatically(settings.printAutomatically);
        setEmailReceipt(settings.emailReceipt);
        setStoreName(settings.storeName);
        setStoreAddress(settings.storeAddress);
        setStorePhone(settings.storePhone);
        setFooterMessage(settings.footerMessage);
      } catch (error) {
        console.log("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (!isAdmin) return;

    setSaving(true);
    try {
      const success = await settingsService.updateReceiptSettings({
        showStoreInfo,
        showTaxInfo,
        showPaymentDetails,
        showCustomerInfo,
        printAutomatically,
        emailReceipt,
        storeName,
        storeAddress,
        storePhone,
        footerMessage,
      });

      if (success) {
        Alert.alert("Success", "Receipt settings saved successfully!");
        router.back();
      } else {
        Alert.alert("Error", "Failed to save settings. Please try again.");
      }
    } catch (error) {
      console.log("Error saving settings:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
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
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Receipt Settings
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {!isAdmin && (
          <View style={{
            backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.05)",
            margin: 16,
            padding: 12,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: "rgba(245, 158, 11, 0.2)"
          }}>
            <MaterialIcons name="info" size={20} color="#D97706" />
            <Text style={{ fontSize: 13, color: isDark ? "#FBBF24" : "#B45309", flex: 1 }}>
              Only Administrators can modify receipt settings.
            </Text>
          </View>
        )}

        {/* Store Information Section */}
        <View style={{ paddingHorizontal: 16, paddingTop: isAdmin ? 24 : 8, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Store Information
          </Text>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            {/* Store Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Store Name
              </Text>
              <TextInput
                value={storeName}
                onChangeText={setStoreName}
                editable={isAdmin}
                placeholder="Enter store name"
                placeholderTextColor={colors.textSecondary}
                style={{
                  height: 48,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  fontSize: 15,
                  color: isAdmin ? colors.text : colors.textSecondary,
                  backgroundColor: colors.surface,
                }}
              />
            </View>

            {/* Store Address */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Store Address
              </Text>
              <TextInput
                value={storeAddress}
                onChangeText={setStoreAddress}
                editable={isAdmin}
                placeholder="Enter store address"
                placeholderTextColor={colors.textSecondary}
                style={{
                  height: 48,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  fontSize: 15,
                  color: isAdmin ? colors.text : colors.textSecondary,
                  backgroundColor: colors.surface,
                }}
              />
            </View>

            {/* Store Phone */}
            <View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                Store Phone
              </Text>
              <TextInput
                value={storePhone}
                onChangeText={setStorePhone}
                editable={isAdmin}
                placeholder="Enter store phone"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={{
                  height: 48,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  fontSize: 15,
                  color: isAdmin ? colors.text : colors.textSecondary,
                  backgroundColor: colors.surface,
                }}
              />
            </View>
          </View>
        </View>

        {/* Receipt Content Section */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Receipt Content
          </Text>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
              overflow: "hidden",
            }}
          >
            {/* Show Store Info */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Show Store Information
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  Display store name, address, and phone on receipt
                </Text>
              </View>
              <Switch
                value={showStoreInfo}
                onValueChange={setShowStoreInfo}
                disabled={!isAdmin}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Show Tax Info */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Show Tax Information
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  Display tax breakdown on receipt
                </Text>
              </View>
              <Switch
                value={showTaxInfo}
                onValueChange={setShowTaxInfo}
                disabled={!isAdmin}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Show Payment Details */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Show Payment Details
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  Display payment method and change on receipt
                </Text>
              </View>
              <Switch
                value={showPaymentDetails}
                onValueChange={setShowPaymentDetails}
                disabled={!isAdmin}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Show Customer Info */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Show Customer Information
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  Display customer name and phone on receipt
                </Text>
              </View>
              <Switch
                value={showCustomerInfo}
                onValueChange={setShowCustomerInfo}
                disabled={!isAdmin}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Footer Message Section */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Footer Message
          </Text>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <TextInput
              value={footerMessage}
              onChangeText={setFooterMessage}
              editable={isAdmin}
              placeholder="Enter footer message"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              style={{
                minHeight: 80,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 15,
                color: isAdmin ? colors.text : colors.textSecondary,
                backgroundColor: colors.surface,
                textAlignVertical: "top",
              }}
            />
          </View>
        </View>

        {/* Receipt Actions Section */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Receipt Actions
          </Text>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
              overflow: "hidden",
            }}
          >
            {/* Print Automatically */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Print Automatically
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  Automatically print receipt after sale
                </Text>
              </View>
              <Switch
                value={printAutomatically}
                onValueChange={setPrintAutomatically}
                disabled={!isAdmin}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Email Receipt */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  Email Receipt
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                  Send receipt to customer email (if available)
                </Text>
              </View>
              <Switch
                value={emailReceipt}
                onValueChange={setEmailReceipt}
                disabled={!isAdmin}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        {isAdmin && (
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: colors.primary,
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
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#FFFFFF",
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Save Settings
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

