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
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import * as poService from "../../src/services/poService";
import * as supplierService from "../../src/services/supplierService";
import { useTheme } from "../../src/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

type POStatus = "pending" | "approved" | "delivered" | "rejected";

type PurchaseOrder = {
  id: string;
  supplier: string;
  date: string;
  total: number;
  status: POStatus;
};

const filters = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "delivered", label: "Complete" },
  { id: "rejected", label: "Cancelled" },
];

export default function PurchaseOrdersListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const statusStyles: Record<POStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)", text: isDark ? "#FBBF24" : "#B45309", label: "Pending" },
    approved: { bg: isDark ? "rgba(0, 123, 255, 0.2)" : "rgba(0, 123, 255, 0.15)", text: isDark ? "#60A5FA" : "#007BFF", label: "Approved" },
    delivered: { bg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)", text: isDark ? "#34D399" : "#047857", label: "Complete" },
    rejected: { bg: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)", text: isDark ? "#F87171" : "#B91C1C", label: "Cancelled" },
  };
  const [activeFilter, setActiveFilter] = useState("all");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const pos = await poService.getAllPurchaseOrders();
      const suppliers = await supplierService.getSuppliers();
      const supplierMap = new Map(suppliers.map(s => [s.supplier_id, s.name]));

      const mappedPOs: PurchaseOrder[] = pos.map((po) => {
        const supplierName = po.supplier_id ? supplierMap.get(po.supplier_id) || "Unknown Supplier" : "No Supplier";
        const date = new Date(po.date_created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Map status: 'pending' | 'approved' | 'delivered' | 'cancelled'
        let status: POStatus = "pending";
        if (po.status === "delivered") status = "delivered";
        else if (po.status === "approved") status = "approved";
        else if (po.status === "cancelled") status = "rejected";

        return {
          id: po.po_id,
          supplier: supplierName,
          date,
          total: po.total_cost,
          status,
        };
      });
      setPurchaseOrders(mappedPOs);
    } catch (error) {
      console.log("Error loading purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadPurchaseOrders();
    }, [])
  );

  const filteredOrders = useMemo(() => {
    if (activeFilter === "all") return purchaseOrders;
    return purchaseOrders.filter((po) => po.status === activeFilter);
  }, [activeFilter, purchaseOrders]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading purchase orders...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 12,
          backgroundColor: colors.card,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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
          Purchase Orders
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
          <MaterialIcons name="filter-list" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            alignItems: 'center',
            gap: 8,
            height: '100%'
          }}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={{
                  height: 38,
                  paddingHorizontal: 20,
                  borderRadius: 9999,
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  justifyContent: 'center',
                  alignItems: "center",
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? "700" : "600",
                    color: isActive ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.map((order) => {
          const status = statusStyles[order.status];
          return (
            <TouchableOpacity
              key={order.id}
              onPress={() => router.push(`/purchase-orders/${order.id}`)}
              style={{
                backgroundColor: colors.card,
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isDark ? 0.4 : 0.04,
                shadowRadius: 15,
                elevation: 3,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 16,
              }}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                      fontFamily: "Poppins_700Bold",
                      marginBottom: 4,
                    }}
                  >
                    #{order.id}
                  </Text>
                  <Text style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: 6 }}>
                    {order.supplier}
                  </Text>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 9999,
                      backgroundColor: status.bg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: status.text,
                      }}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
                    {formatTZS(order.total)}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{order.date}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Floating action button */}
      <TouchableOpacity
        onPress={() => router.push("/purchase-orders/new")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 100,
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.5 : 0.3,
          shadowRadius: 15,
          elevation: 6,
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}


