// Debt Detail Screen - match existing style
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as salesService from "../../src/services/salesService";
import * as inventoryService from "../../src/services/inventoryService";
import { useState, useEffect } from "react";
import { ActivityIndicator } from "react-native";

// Remove hardcoded debtData

export default function DebtDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getDebt, getSale } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [debt, setDebt] = useState<any>(null);
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const debtData = getDebt(id);
        if (debtData) {
          setDebt(debtData);
          if (debtData.saleId) {
            const saleData = getSale(debtData.saleId);
            if (saleData) {
              // Fetch full sale with items if needed
              const fullSale = await salesService.getSale(debtData.saleId);
              setSale(fullSale);
            }
          }
        }
      } catch (error) {
        console.log("Error loading debt detail:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary }}>Debt record not found</Text>
      </View>
    );
  }

  const isCleared = debt.status === "paid";
  const isOverdue = !isCleared && new Date() > new Date(debt.updatedAt); // Placeholder logic for overdue

  const handleRecordPayment = () => {
    router.push(`/debts/pay?id=${debt.id}`);
  };

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
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Debt Details
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              #{debt.id.substring(0, 8)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => { }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Summary Card */}
        <View
          style={{
            backgroundColor: isOverdue ? "#FFFBEB" : isCleared ? "#F0FDF4" : "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isOverdue
              ? "rgba(245, 158, 11, 0.5)"
              : isCleared
                ? "rgba(16, 185, 129, 0.5)"
                : "#E0E2E6",
            padding: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>
            Outstanding Balance
          </Text>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: isOverdue ? colors.warning : isCleared ? colors.success : colors.primary,
              fontFamily: "Poppins_700Bold",
            }}
          >
            {formatTZS(debt.balanceRemaining)}
          </Text>
          {isOverdue && (
            <View
              style={{
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: "rgba(220, 38, 38, 0.1)",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#DC2626" }}>
                ⚠️ Overdue
              </Text>
            </View>
          )}
          {isCleared && (
            <View
              style={{
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: "rgba(16, 185, 129, 0.1)",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#16A34A" }}>
                ✓ Fully Paid
              </Text>
            </View>
          )}
        </View>

        {/* Progress */}
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Original Amount</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
                {formatTZS(debt.totalAmount)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Amount Paid</Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: colors.success }}>
                {formatTZS(debt.amountPaid)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.surface,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${(debt.amountPaid / debt.totalAmount) * 100}%`,
                height: "100%",
                backgroundColor: colors.success,
                borderRadius: 4,
              }}
            />
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8, textAlign: "center" }}>
            {Math.round((debt.amountPaid / debt.totalAmount) * 100)}% paid
          </Text>
        </View>

        {/* Customer Info */}
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
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Customer Information
          </Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="person" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Customer Name</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {debt.customerName}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="phone" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Phone</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {debt.customerPhone}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="receipt" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Sale Reference</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
                  {debt.saleId?.substring(0, 8) || "N/A"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 24 }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <MaterialIcons name="event" size={20} color={colors.textSecondary} />
                <View>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Sale Date</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                    {new Date(debt.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Payment History */}
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
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Payment History
          </Text>
          {debt.payments.length === 0 ? (
            <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", paddingVertical: 16 }}>
              No payments recorded yet
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {(debt.payments || []).map((payment: any) => (
                <View
                  key={payment.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9999,
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name="payment" size={18} color="#16A34A" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                        {payment.method}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>{payment.date}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#16A34A" }}>
                    +{formatTZS(payment.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Items */}
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
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Items Purchased
          </Text>
          <View style={{ gap: 12 }}>
            {!sale?.items || sale.items.length === 0 ? (
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingVertical: 16 }}>
                No items found for this sale
              </Text>
            ) : (
              sale.items.map((item: any, index: number) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                    borderBottomWidth: index < sale.items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>
                      {item.productName || "Product"}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      {item.quantity} × {formatTZS(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                    {formatTZS(item.subtotal)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      {!isCleared && (
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
            onPress={handleRecordPayment}
            style={{
              height: 56,
              borderRadius: 12,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="payment" size={22} color="#FFFFFF" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Record Payment
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


