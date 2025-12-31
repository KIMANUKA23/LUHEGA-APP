// Record Customer Payment Screen - Staff
import React, { useState, useEffect, useMemo } from "react";
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
import { formatTZS } from "../../../src/utils/currency";
import { useApp } from "../../../src/context/AppContext";
import * as customerService from "../../../src/services/customerService";
import { useTheme } from "../../../src/context/ThemeContext";

const paymentMethods = [
  { id: "cash", label: "Cash", icon: "payments" },
  { id: "m-pesa", label: "M-Pesa", icon: "phone-android" },
  { id: "tigo-pesa", label: "Tigo Pesa", icon: "phone-android" },
  { id: "airtel-money", label: "Airtel Money", icon: "phone-android" },
  { id: "bank", label: "Bank Transfer", icon: "account-balance" },
  { id: "card", label: "Card", icon: "credit-card" },
];

export default function RecordCustomerPaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { updateDebtPayment, getAllDebts, refreshDebts } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);

  // Load customer and debts
  useEffect(() => {
    const loadData = async () => {
      if (id) {
        try {
          const data = await customerService.getCustomer(id);
          setCustomer(data);
        } catch (error) {
          console.log("Error loading customer:", error);
          Alert.alert("Error", "Failed to load customer details");
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [id]);

  // Filter debts for this customer
  const customerDebts = useMemo(() => {
    if (!customer) return [];

    const allDebts = getAllDebts();
    return allDebts.filter(d => {
      // Create normalized versions for comparison
      const debtPhone = d.customerPhone?.replace(/\s+/g, '') || '';
      const custPhone = customer.phone?.replace(/\s+/g, '') || '';
      const debtName = d.customerName?.toLowerCase().trim();
      const custName = customer.name?.toLowerCase().trim();

      return (custPhone && debtPhone.includes(custPhone)) ||
        (custPhone && debtPhone && custPhone.includes(debtPhone)) ||
        (debtName === custName);
    }).filter(d => d.balanceRemaining > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Oldest first
  }, [customer, getAllDebts]);

  const outstandingDebt = useMemo(() => {
    return customerDebts.reduce((sum, d) => sum + d.balanceRemaining, 0);
  }, [customerDebts]);

  const paymentAmount = amount ? parseFloat(amount) : 0;
  const remainingBalance = Math.max(0, outstandingDebt - paymentAmount);

  const handleSubmit = async () => {
    if (processing) return;

    if (!amount || paymentAmount <= 0) {
      Alert.alert("Error", "Please enter a valid payment amount");
      return;
    }
    if (paymentAmount > outstandingDebt) {
      Alert.alert("Error", "Payment amount cannot exceed total outstanding debt");
      return;
    }

    setProcessing(true);
    try {
      // Distribute payment across debts, starting with oldest
      let remainingPayment = paymentAmount;

      for (const debt of customerDebts) {
        if (remainingPayment <= 0) break;

        const amountToPay = Math.min(remainingPayment, debt.balanceRemaining);

        // This should be atomic ideally, but for now we iterate
        await updateDebtPayment(debt.id, amountToPay);

        remainingPayment -= amountToPay;
      }

      await refreshDebts(); // Sync updated state

      Alert.alert("Success", "Payment recorded successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.log("Error recording payment:", error);
      Alert.alert("Error", "Failed to record payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading customer info...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <MaterialIcons name="error-outline" size={48} color={colors.error} />
        <Text style={{ marginTop: 16, color: colors.text }}>Customer not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, padding: 10 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.05,
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
          Record Payment
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Customer Info Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 9999,
                backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="person" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {customer.name}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                {customer.phone}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={{ color: colors.textSecondary }}>Unpaid Debts:</Text>
            <Text style={{ fontWeight: '700', color: colors.text }}>{customerDebts.length}</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.5)",
            padding: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 9999,
              backgroundColor: "rgba(217, 119, 6, 0.2)",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: isDark ? "#F59E0B" : "#92400E", fontWeight: "600" }}>
              PAYING DEBT / CREDIT
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: isDark ? "#F59E0B" : "#92400E", fontWeight: "500" }}>
            Total Outstanding Balance
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: isDark ? "#FBBF24" : "#D97706",
              fontFamily: "Poppins_700Bold",
              marginTop: 4,
            }}
          >
            {formatTZS(outstandingDebt)}
          </Text>
          {paymentAmount > 0 && (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: isDark ? "#F59E0B" : "#92400E" }}>Remaining after payment</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: remainingBalance > 0 ? (isDark ? "#FBBF24" : "#D97706") : (isDark ? "#34D399" : "#16A34A"),
                  marginTop: 4,
                }}
              >
                {formatTZS(remainingBalance)}
              </Text>
            </View>
          )}
        </View>

        {/* Amount Input */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 8,
            elevation: 2,
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
            Payment Amount *
          </Text>
          <TextInput
            style={{
              height: 64,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: paymentAmount > outstandingDebt ? colors.error : colors.border,
              paddingHorizontal: 16,
              fontSize: 24,
              fontWeight: "700",
              color: colors.text,
              textAlign: "center",
            }}
            placeholder="0"
            placeholderTextColor={colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
          />
          {paymentAmount > outstandingDebt && (
            <Text style={{ fontSize: 12, color: colors.error, marginTop: 8, textAlign: "center" }}>
              Amount exceeds outstanding balance
            </Text>
          )}

          {/* Quick Amount Buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {[
              outstandingDebt * 0.25,
              outstandingDebt * 0.5,
              outstandingDebt * 0.75,
            ]
              .map((amt) => Math.round(amt))
              .filter((amt) => amt > 0)
              .map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => setAmount(amt.toString())}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor:
                      amount === amt.toString() ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)") : colors.surface,
                    borderWidth: 1,
                    borderColor: amount === amt.toString() ? colors.primary : "transparent",
                    alignItems: "center",
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: amount === amt.toString() ? colors.primary : colors.textSecondary,
                    }}
                  >
                    {formatTZS(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          <TouchableOpacity
            onPress={() => setAmount(outstandingDebt.toString())}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.success }}>
              Pay Full Balance ({formatTZS(outstandingDebt)})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 8,
            elevation: 2,
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
          <View style={{ gap: 8 }}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor:
                    selectedMethod === method.id ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)") : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedMethod === method.id ? colors.primary : colors.border,
                  gap: 12,
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={method.icon as any}
                  size={24}
                  color={selectedMethod === method.id ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: selectedMethod === method.id ? "600" : "500",
                    color: selectedMethod === method.id ? colors.primary : colors.text,
                  }}
                >
                  {method.label}
                </Text>
                {selectedMethod === method.id && (
                  <MaterialIcons name="check-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reference (for mobile money/bank/card) */}
        {(selectedMethod !== "cash") && (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.2 : 0.04,
              shadowRadius: 8,
              elevation: 2,
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
              Transaction Reference *
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
              placeholder="Enter reference number"
              placeholderTextColor={colors.textSecondary}
              value={reference}
              onChangeText={setReference}
            />
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
              Enter the transaction ID or reference number from your payment
            </Text>
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
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!amount || paymentAmount <= 0 || paymentAmount > outstandingDebt || processing}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor:
              !amount || paymentAmount <= 0 || paymentAmount > outstandingDebt || processing
                ? colors.border
                : colors.success,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: colors.success,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={22} color="#FFFFFF" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                Record Payment
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

