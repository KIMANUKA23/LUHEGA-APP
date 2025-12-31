import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import * as debtService from "../../src/services/debtService";
import { useAuth } from "../../src/context/AuthContext";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";

type DebtStatus = "overdue" | "active" | "cleared";

type Debt = {
  id: string;
  customer: string;
  dueDate: string;
  original: number;
  paid: number;
  balance: number;
  status: DebtStatus;
};

const filters = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
];

export default function DebtsListScreen() {
  const router = useRouter();
  const { getAllDebts, refreshDebts } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const loadDebts = async () => {
    setLoading(true);
    await refreshDebts();
    setLoading(false);
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const mappedDebts = useMemo(() => {
    const contextDebts = getAllDebts();
    return contextDebts.map((d: any) => {
      const dueDate = new Date(d.createdAt);
      dueDate.setDate(dueDate.getDate() + 30); // Assume 30 days due date
      const isOverdue = dueDate < new Date() && d.balanceRemaining > 0;

      return {
        id: d.id,
        customer: d.customerName,
        dueDate: dueDate.toISOString().split("T")[0],
        original: d.totalAmount,
        paid: d.amountPaid,
        balance: d.balanceRemaining,
        status: d.status === "paid" ? "cleared" : isOverdue ? "overdue" : "active",
      } as Debt;
    });
  }, [getAllDebts]);

  const filteredDebts = useMemo(() => {
    if (activeFilter === "all") return mappedDebts;
    return mappedDebts.filter((d) => d.status === "overdue");
  }, [activeFilter, mappedDebts]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading debts...</Text>
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
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Debts
        </Text>

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
          <MaterialIcons name="tune" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 6,
                borderRadius: 10,
                backgroundColor: isActive ? `${colors.primary}20` : colors.surface,
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: isActive ? colors.primary : colors.textSecondary,
                }}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredDebts.map((debt) => {
          const isOverdue = debt.status === "overdue";
          const isCleared = debt.status === "cleared";
          const borderColor = isOverdue
            ? "rgba(245, 158, 11, 0.7)"
            : "rgba(209, 213, 219, 1)";
          const balanceColor = isOverdue
            ? "#D97706"
            : isCleared
              ? "#16A34A"
              : "#007BFF";

          return (
            <TouchableOpacity
              key={debt.id}
              onPress={() => router.push(`/debts/${debt.id}`)}
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isOverdue ? colors.warning : colors.border,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 10,
                elevation: 3,
                gap: 12,
              }}
              activeOpacity={0.85}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {debt.customer}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: isOverdue ? colors.warning : colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Due: {debt.dueDate}
                    {isOverdue ? " (Overdue)" : ""}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  rowGap: 8,
                }}
              >
                <View style={{ width: "50%", marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Original</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {formatTZS(debt.original)}
                  </Text>
                </View>
                <View style={{ width: "50%", marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Paid</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {formatTZS(debt.paid)}
                  </Text>
                </View>
                <View style={{ width: "100%", marginTop: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Balance</Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: balanceColor,
                    }}
                  >
                    {formatTZS(debt.balance)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity
        onPress={() => router.push("/debts/new")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 90,
          width: 64,
          height: 64,
          borderRadius: 18,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 6,
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}


