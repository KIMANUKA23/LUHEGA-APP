// Sales Payment Screen - match existing style
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as customerService from "../../src/services/customerService";
import { useApp } from "../../src/context/AppContext";

const paymentMethods = [
  { id: "cash", label: "Cash", icon: "payments", color: "#16A34A" },
  { id: "mobile", label: "Mobile Money", icon: "phone-android", color: "#007BFF" },
  { id: "card", label: "Card", icon: "credit-card", color: "#8B5CF6" },
  { id: "debit", label: "Credit (Debt)", icon: "account-balance-wallet", color: "#D97706" },
];

export default function SalesPaymentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createSale } = useApp();
  const { colors, isDark } = useTheme();
  const { total, items } = useLocalSearchParams<{ total?: string; items?: string }>();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [selectedMethod, setSelectedMethod] = useState<string | null>("cash");
  const [amountReceived, setAmountReceived] = useState(total || "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Get sale total from route params or default to 0
  const saleTotal = total ? parseFloat(total) : 0;
  const saleItems = items ? JSON.parse(items) : [];
  const change = amountReceived ? Math.max(0, parseFloat(amountReceived || "0") - saleTotal) : 0;

  const [processing, setProcessing] = useState(false);

  const handleComplete = async () => {
    if (processing) return;

    if (selectedMethod === "debit") {
      // Validate required fields for debit sale
      if (!customerName.trim() || !customerPhone.trim()) {
        // TODO: Show error toast - customer name and phone required
        alert("Please enter customer name and phone for debit sales");
        return;
      }

      setProcessing(true);
      try {
        // Create customer first if doesn't exist
        await customerService.createCustomer({
          name: customerName.trim(),
          phone: customerPhone.trim(),
        });

        // Create pending debit sale (will be approved by admin)
        const newSale = await createSale({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          saleType: "pending_debit",
          totalAmount: saleTotal,
          amountPaid: 0,
          amountRemaining: saleTotal,
          paymentMode: "Debit",
          saleDate: new Date().toISOString(),
          items: saleItems.map((item: any) => ({
            productId: item.part_id,
            productName: "", // Will be filled by service
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.unit_price * item.quantity,
            returnStatus: "none" as const,
          })),
          staffId: user?.id,
        });
        // Navigate to pending approval message
        router.push("/admin/pending-debit-sales");
      } catch (error) {
        console.log("Error creating debit sale:", error);
        alert("Failed to create sale. Please try again.");
      } finally {
        setProcessing(false);
      }
    } else {
      setProcessing(true);
      try {
        // Create customer for all payment types (if customer info provided)
        if (customerName.trim()) {
          try {
            await customerService.createCustomer({
              name: customerName.trim(),
              phone: customerPhone.trim() || undefined,
            });
          } catch (e) {
            // Customer may already exist - continue with sale
          }
        }

        // Process payment immediately (cash, mobile, card)
        const newSale = await createSale({
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          saleType: "cash",
          totalAmount: saleTotal,
          amountPaid: parseFloat(amountReceived || "0"),
          amountRemaining: 0,
          paymentMode: selectedMethod || "Cash",
          saleDate: new Date().toISOString(),
          items: saleItems.map((item: any) => ({
            productId: item.part_id,
            productName: "", // Will be filled by service
            quantity: item.quantity,
            unitPrice: item.unit_price,
            subtotal: item.unit_price * item.quantity,
            returnStatus: "none" as const,
          })),
          staffId: user?.id,
        });
        // Pass sale ID to receipt screen
        router.push({
          pathname: "/sales/receipt",
          params: { saleId: newSale.id },
        });
      } catch (error) {
        console.log("Error creating sale:", error);
        alert("Failed to create sale. Please try again.");
      } finally {
        setProcessing(false);
      }
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
          Payment
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Amount Card */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            padding: 24,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Total Amount</Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: "700",
              color: "#FFFFFF",
              fontFamily: "Poppins_700Bold",
              marginTop: 4,
            }}
          >
            {formatTZS(saleTotal)}
          </Text>
        </View>

        {/* Payment Method Selection */}
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
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Payment Method
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                style={{
                  width: "47%",
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: selectedMethod === method.id ? `${method.color}15` : colors.surface,
                  borderWidth: 2,
                  borderColor: selectedMethod === method.id ? method.color : colors.border,
                  alignItems: "center",
                }}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: selectedMethod === method.id ? `${method.color}20` : (isDark ? colors.background : "#E5E7EB"),
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <MaterialIcons
                    name={method.icon as any}
                    size={24}
                    color={selectedMethod === method.id ? method.color : (isDark ? colors.textSecondary : "#6B7280")}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: selectedMethod === method.id ? method.color : colors.textSecondary,
                  }}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Customer Details - Visible for ALL methods */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: selectedMethod === "debit"
              ? (!customerName.trim() || !customerPhone.trim() ? colors.warning : colors.border)
              : colors.border,
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
              marginBottom: 4,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Customer Information
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            {selectedMethod === "debit"
              ? "Required for debit tracking"
              : "Optional - Assign sale to a customer"}
          </Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Customer Name {selectedMethod === "debit" && "*"}
            </Text>
            <TextInput
              style={{
                height: 54,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                fontSize: 15,
                color: colors.text,
              }}
              placeholder="Enter customer name"
              placeholderTextColor={colors.textSecondary}
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Phone Number {selectedMethod === "debit" && "*"}
            </Text>
            <TextInput
              style={{
                height: 54,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                fontSize: 15,
                color: colors.text,
              }}
              placeholder="+255 7XX XXX XXX"
              placeholderTextColor={colors.textSecondary}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Cash Payment Details */}
        {selectedMethod === "cash" && (
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
                marginBottom: 12,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Cash Payment
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
                Amount Received
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.text,
                }}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={amountReceived}
                onChangeText={setAmountReceived}
                keyboardType="number-pad"
              />
            </View>

            {/* Quick Amount Buttons */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[450000, 500000, 1000000].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  onPress={() => setAmountReceived(amount.toString())}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#F3F4F6",
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary }}>
                    {formatTZS(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Change */}
            <View
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: change > 0 ? "rgba(16, 185, 129, 0.1)" : colors.surface,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textSecondary }}>Change</Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: change > 0 ? colors.success : colors.textSecondary,
                }}
              >
                {formatTZS(change)}
              </Text>
            </View>
          </View>
        )}

        {/* Credit (Debt) Details - Warning Only */}
        {selectedMethod === "debit" && (
          <View
            style={{
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(245, 158, 11, 0.5)",
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <MaterialIcons name="info" size={24} color={colors.warning} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: colors.warning }}>
                This will create a debit sale that requires admin approval
              </Text>
            </View>

            <View
              style={{
                padding: 12,
                backgroundColor: "rgba(217, 119, 6, 0.1)",
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.warning, lineHeight: 18 }}>
                ⚠️ The debit sale will be pending until admin approves it. Customer information (above) is required to track this debt.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
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
          onPress={handleComplete}
          disabled={selectedMethod === "debit" && (!customerName.trim() || !customerPhone.trim())}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor:
              selectedMethod === "debit" && (!customerName.trim() || !customerPhone.trim())
                ? colors.border
                : selectedMethod === "debit"
                  ? colors.warning
                  : colors.success,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: selectedMethod === "debit" ? colors.warning : colors.success,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="check-circle" size={22} color="#FFFFFF" />
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
            {selectedMethod === "debit" ? "Create Debit Sale" : "Complete Sale"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


