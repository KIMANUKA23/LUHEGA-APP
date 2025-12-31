// Pending Debit Sales List - Admin Approval Screen
import React, { useState, useMemo, useEffect } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useRoleGuard } from "../../src/hooks/useRoleGuard";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as userService from "../../src/services/userService";

type DebitSaleStatus = "pending" | "approved" | "rejected";

type PendingDebitSale = {
  id: string;
  customerName: string;
  customerPhone: string;
  staffName: string;
  date: string;
  totalAmount: number;
  balanceRemaining: number;
  status: DebitSaleStatus;
  itemCount: number;
};

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}



export default function PendingDebitSalesScreen() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const router = useRouter();
  const { getAllSales, getAllDebts, refreshSales, refreshDebts } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [searchQuery, setSearchQuery] = useState("");

  const [staffNames, setStaffNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const loadStaffNames = async () => {
      try {
        const allStaff = await userService.getUsers('staff');
        const nameMap = new Map(allStaff.map(s => [s.id, s.name]));
        setStaffNames(nameMap);
      } catch (error) {
        console.log("Error loading staff names:", error);
      }
    };
    loadStaffNames();
  }, []);

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      refreshSales().catch((e) => console.log('Error refreshing sales:', e));
      refreshDebts().catch((e) => console.log('Error refreshing debts:', e));
    }, [refreshSales, refreshDebts])
  );

  useEffect(() => {
    // Ensure debts are loaded so we can filter out already approved debit sales
    if (getAllDebts().length === 0) {
      refreshDebts().catch((e) => console.log('Error refreshing debts:', e));
    }
  }, [getAllDebts, refreshDebts]);

  const getStatusStyle = (status: DebitSaleStatus) => {
    switch (status) {
      case "pending":
        return {
          backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(251, 191, 36, 0.18)",
          textColor: isDark ? colors.warning : "#92400E",
          label: "Pending",
        };
      case "approved":
        return {
          backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.18)",
          textColor: isDark ? colors.success : "#166534",
          label: "Approved",
        };
      case "rejected":
        return {
          backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(248, 113, 113, 0.2)",
          textColor: isDark ? colors.error : "#991B1B",
          label: "Rejected",
        };
    }
  };

  // Get pending debit sales from real data
  const pendingDebitSalesData: PendingDebitSale[] = useMemo(() => {
    const allSales = getAllSales();
    const allDebts = getAllDebts();
    const debtSaleIds = new Set(allDebts.map(d => d.saleId).filter(Boolean));

    // TEMPORARY FIX: Show ALL debit sales (including pending_debit)
    const filteredSales = (allSales || []).filter((sale: any) => {
      const type = sale.saleType?.toLowerCase();
      const isDebit = type === 'debit' || type === 'pending_debit';
      const hasBalance = Number(sale.amountRemaining || 0) > 0 || Number(sale.amountPaid || 0) < Number(sale.totalAmount || 0);

      return isDebit && hasBalance;
    });

    return filteredSales.map(sale => ({
      id: sale.id,
      customerName: sale.customerName || "Walk-in Customer",
      customerPhone: sale.customerPhone || "",
      staffName: sale.staffId && staffNames.has(sale.staffId)
        ? staffNames.get(sale.staffId)!
        : sale.staffId || "Unknown Staff",
      date: formatTimeAgo(sale.saleDate),
      totalAmount: sale.totalAmount,
      balanceRemaining: sale.amountRemaining,
      // If debt exists, it's strictly "approved", otherwise "pending"
      status: debtSaleIds.has(sale.id) ? "approved" : "pending",
      itemCount: sale.items?.length || 0,
    }));
  }, [getAllSales, getAllDebts, staffNames]);

  const filteredSales = pendingDebitSalesData.filter(
    (sale) =>
      sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerPhone.includes(searchQuery)
  );

  const allSales = getAllSales(); // Re-fetch for debug info
  const allDebts = getAllDebts(); // Re-fetch for debug info
  const debtSaleIds = useMemo(() => new Set(allDebts.map(d => d.saleId).filter(Boolean)), [allDebts]);


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
          Pending Debit Sales
        </Text>

        <View style={{ width: 40, height: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              position: "relative",
              height: 56,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                position: "absolute",
                left: 18,
                zIndex: 1,
              }}
            >
              <MaterialIcons name="search" size={20} color={colors.textSecondary} />
            </View>
            <TextInput
              style={{
                flex: 1,
                height: 56,
                borderRadius: 9999,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingLeft: 48,
                paddingRight: 16,
                fontSize: 16,
                color: colors.text,
              }}
              placeholder="Search by ID, Customer, Phone..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Summary card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>Pending Approvals</Text>
              <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>
                {filteredSales.length}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>Total Amount</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary }}>
                {formatTZS(filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0))}
              </Text>
            </View>
          </View>
        </View>

        {/* List */}
        {filteredSales.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <MaterialIcons
                name="assignment-turned-in"
                size={40}
                color={colors.textSecondary}
              />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
                marginBottom: 8,
              }}
            >
              All Approved!
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Great job! You have no pending debit sales requiring approval.
            </Text>

          </View>
        ) : (
          filteredSales.map((sale) => {
            const status = getStatusStyle(sale.status);
            return (
              <TouchableOpacity
                key={sale.id}
                onPress={() => router.push(`/admin/debit-sales/${sale.id}`)}

                style={{
                  backgroundColor: colors.card,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 12,
                  elevation: 3,
                }}
                activeOpacity={0.85}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "700",
                        color: colors.text,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      #{sale.id}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 4 }}>
                      {sale.customerName}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                      {sale.customerPhone}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 9999,
                      backgroundColor: status.backgroundColor,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: status.textColor,
                      }}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingTop: 12,
                    marginTop: 8,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Total Amount</Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                      {formatTZS(sale.totalAmount)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Balance Remaining</Text>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.error }}>
                      {formatTZS(sale.balanceRemaining)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Items</Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                      {sale.itemCount} items
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Staff: {sale.staffName}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{sale.date}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

