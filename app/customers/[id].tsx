// Customer Detail Screen - match existing style
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useTheme } from "../../src/context/ThemeContext";
import * as customerService from "../../src/services/customerService";

function formatLastVisit(dateString: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalPurchases: number;
  totalOrders: number;
  outstandingDebt: number;
  joinedDate: string;
  recentTransactions: {
    id: string;
    type: "sale" | "payment";
    amount: number;
    date: string;
    status: string;
  }[];
};

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomer = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const customerData = await customerService.getCustomer(id);

        if (!customerData) {
          setCustomer(null);
          setLoading(false);
          return;
        }

        // Fetch sales and debts for this customer
        const { getSales } = await import("../../src/services/salesService");
        const { getAllDebts } = await import("../../src/services/debtService");

        const sales = await getSales(null, true); // Admin view to get all sales
        const debts = await getAllDebts(null, true);

        const customerPhone = customerData.phone;
        const customerName = customerData.name;

        const customerSales = sales.filter(s =>
          (customerPhone && s.customer_phone === customerPhone) ||
          (s.customer_name === customerName && !s.customer_phone)
        );
        const customerDebts = debts.filter(d =>
          (customerPhone && d.customer_phone === customerPhone) ||
          (d.customer_name === customerName && !d.customer_phone)
        );

        const totalPurchases = customerSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const totalOrders = customerSales.length;
        const outstandingDebt = customerDebts.reduce((sum, d) => sum + Number(d.balance_remaining || 0), 0);

        // Get recent transactions (sales and debt payments)
        const recentTransactions = [
          ...customerSales.slice(0, 10).map(s => ({
            id: s.sale_id,
            type: "sale" as const,
            amount: Number(s.total_amount),
            date: new Date(s.sale_date).toLocaleDateString(),
            status: "Completed",
          })),
          ...customerDebts.filter(d => d.amount_paid > 0).slice(0, 5).map(d => ({
            id: d.debt_id,
            type: "payment" as const,
            amount: Number(d.amount_paid),
            date: new Date(d.updated_at).toLocaleDateString(),
            status: "Completed",
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        setCustomer({
          id: customerData.id,
          name: customerData.name,
          phone: customerData.phone || "",
          email: customerData.email || "",
          address: "", // Not stored in database
          totalPurchases,
          totalOrders,
          outstandingDebt,
          joinedDate: formatLastVisit(customerData.lastVisit),
          recentTransactions,
        });
      } catch (error) {
        console.log("Error loading customer:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading customer...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <MaterialIcons name="person-off" size={64} color={colors.border} />
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
          Customer not found
        </Text>
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
              Customer Details
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {customer.name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => { }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.08)",
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="call" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/customers/edit/${customer.id}`)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.08)",
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Profile Card */}
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
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 9999,
              backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: colors.primary,
              }}
            >
              {customer.name.split(" ").map((n) => n[0]).join("")}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
            }}
          >
            {customer.name}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
            Customer since {customer.joinedDate}
          </Text>

          {/* Contact Info */}
          <View style={{ width: "100%", marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="phone" size={20} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: colors.text }}>{customer.phone}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="email" size={20} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: colors.text }}>{customer.email || "No email"}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
                {customer.address || "No address"}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Total Purchases</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.primary,
                marginTop: 4,
              }}
            >
              {formatTZS(customer.totalPurchases)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Total Orders</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                marginTop: 4,
              }}
            >
              {customer.totalOrders}
            </Text>
          </View>
        </View>

        {/* Outstanding Debt Card */}
        {customer.outstandingDebt > 0 && (
          <TouchableOpacity
            onPress={() => router.push(`/debts/${customer.id}`)}
            style={{
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "#FFFBEB",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(245, 158, 11, 0.5)",
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 9999,
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="account-balance-wallet" size={24} color={colors.warning} />
              </View>
              <View>
                <Text style={{ fontSize: 13, color: colors.warning }}>Outstanding Debt</Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.warning,
                    marginTop: 2,
                  }}
                >
                  {formatTZS(customer.outstandingDebt)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/customers/${customer.id}/payment`)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: colors.warning,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>
                Record Payment
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
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
            Quick Actions
          </Text>
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push("/sales/new")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                gap: 12,
              }}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="point-of-sale" size={22} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                New Sale
              </Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/customers/${customer.id}/sales`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                gap: 12,
              }}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="receipt-long" size={22} color={colors.success} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                Sales History
              </Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/customers/${customer.id}/payments`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                gap: 12,
              }}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="payments" size={22} color="#8B5CF6" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                Payment History
              </Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
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
            Recent Transactions
          </Text>
          <View style={{ gap: 12 }}>
            {customer.recentTransactions.map((txn) => (
              <View
                key={txn.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 8,
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
                      backgroundColor: txn.type === "sale"
                        ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)")
                        : "rgba(16, 185, 129, 0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons
                      name={txn.type === "sale" ? "shopping-cart" : "payment"}
                      size={18}
                      color={txn.type === "sale" ? colors.primary : colors.success}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                      {txn.type === "sale" ? "Purchase" : "Payment"}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{txn.date}</Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: txn.type === "sale" ? colors.text : colors.success,
                  }}
                >
                  {txn.type === "sale" ? "-" : "+"}{formatTZS(txn.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
