// Sales History Screen - list past sales
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useAuth } from "../../src/context/AuthContext";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";

type SaleRecord = {
  id: string;
  customer: string;
  time: string;
  total: number;
  status: "Completed" | "Pending" | "Refunded";
  paymentMode: "Cash" | "Debit";
};

export default function SalesHistoryScreen() {
  const router = useRouter();
  const { user, isStaff } = useAuth();
  const { getAllSales } = useApp();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Filter sales: Staff sees only their own, Admin sees all
  const allSales = getAllSales();
  const filteredSales = isStaff && user?.id
    ? allSales.filter(sale => sale.staffId === user.id)
    : allSales;

  // Convert context sales to display format
  const displaySales: SaleRecord[] = filteredSales.map(sale => {
    const saleDate = new Date(sale.saleDate);
    const now = new Date();
    const diffMs = now.getTime() - saleDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    let timeDisplay = "";
    if (diffMins < 60) {
      timeDisplay = `${diffMins} min ago`;
    } else if (diffHours < 24) {
      timeDisplay = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffHours / 24);
      timeDisplay = days === 1 ? "Yesterday" : `${days} days ago`;
    }

    return {
      id: sale.id,
      customer: sale.customerName || "Walk-in Customer",
      time: timeDisplay,
      total: sale.totalAmount,
      status: (sale.saleType === "debit" && sale.amountRemaining > 0 ? "Pending" : "Completed") as SaleRecord["status"],
      paymentMode: sale.paymentMode === "Debit" ? "Debit" : "Cash",
    };
  });

  const getStatusColor = (status: SaleRecord["status"]) => {
    switch (status) {
      case "Completed":
        return "#10B981";
      case "Pending":
        return "#F59E0B";
      case "Refunded":
        return "#EF4444";
      default:
        return "#6B7280";
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
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
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
          Sales History
        </Text>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="tune" size={24} color="#007BFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 8,
            textTransform: "uppercase",
          }}
        >
          Today
        </Text>

        {displaySales.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="receipt-long" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No sales found
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
              Start making sales to see them here
            </Text>
          </View>
        ) : (
          displaySales.map((sale) => (
            <TouchableOpacity
              key={sale.id}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.06,
                shadowRadius: 10,
                elevation: 3,
              }}
              activeOpacity={0.8}
              onPress={() => router.push({
                pathname: "/sales/receipt",
                params: { saleId: sale.id },
              })}
            >
              {/* Top Row: ID and Amount */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    #{sale.id.slice(0, 8)}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                    {sale.customer}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {formatTZS(sale.total)}
                </Text>
              </View>

              {/* Bottom Row: Time/Payment and Status */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons
                    name={sale.paymentMode === "Cash" ? "payments" : "credit-card"}
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {sale.time} • {sale.paymentMode}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: `${getStatusColor(sale.status)}15`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: getStatusColor(sale.status),
                    }}
                  >
                    {sale.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}


