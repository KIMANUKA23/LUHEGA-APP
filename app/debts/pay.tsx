// Record Debt Payment Screen - match existing style
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";

const paymentMethods = [
  { id: "cash", label: "Cash", icon: "payments" },
  { id: "mobile", label: "Mobile Money", icon: "phone-android" },
  { id: "bank", label: "Bank Transfer", icon: "account-balance" },
];

export default function RecordDebtPaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getDebt, updateDebtPayment } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<string>("cash");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [debt, setDebt] = useState<{ customer: string; balance: number } | null>(null);

  useEffect(() => {
    if (id) {
      const debtData = getDebt(id);
      if (debtData) {
        setDebt({
          customer: debtData.customerName,
          balance: debtData.balanceRemaining,
        });
      }
    }
  }, [id, getDebt]);

  const handleSubmit = async () => {
    if (!id || !debt || !amount) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (paymentAmount > debt.balance) {
      alert("Payment amount cannot exceed balance");
      return;
    }

    setLoading(true);
    try {
      await updateDebtPayment(id, paymentAmount);
      router.replace("/debts");
    } catch (error) {
      console.log("Error recording payment:", error);
      alert("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!debt) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading debt information...</Text>
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
        {/* Balance Card */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.5)",
            padding: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, color: isDark ? colors.warning : "#92400E" }}>Outstanding Balance</Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.warning,
              fontFamily: "Poppins_700Bold",
              marginTop: 4,
            }}
          >
            {formatTZS(debt.balance)}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
            Customer: {debt.customer}
          </Text>
        </View>

        {/* Amount */}
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
            Payment Amount *
          </Text>
          <TextInput
            style={{
              height: 64,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
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

          {/* Quick Amount Buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {[100000, 150000, 300000].map((amt) => (
              <TouchableOpacity
                key={amt}
                onPress={() => setAmount(amt.toString())}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: amount === amt.toString() ? `${colors.primary}20` : colors.surface,
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
            onPress={() => setAmount(debt.balance.toString())}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.1)",
              alignItems: "center",
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.success }}>
              Pay Full Balance ({formatTZS(debt.balance)})
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
                  backgroundColor: selectedMethod === method.id ? `${colors.primary}20` : colors.surface,
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
                    color: selectedMethod === method.id ? colors.primary : colors.textSecondary,
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

        {/* Reference (for mobile/bank) */}
        {(selectedMethod === "mobile" || selectedMethod === "bank") && (
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
                color: "#111827",
                marginBottom: 12,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Transaction Reference
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
          onPress={handleSubmit}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: colors.success,
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
          <MaterialIcons name="check" size={22} color="#FFFFFF" />
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
            Record Payment
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


