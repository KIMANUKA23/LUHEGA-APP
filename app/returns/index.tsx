// Start Return screen - find sale
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

type SaleSummary = {
  id: string;
  customer: string;
  time: string;
  total: number;
  returnStatus: 'none' | 'partial' | 'full';
};

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function StartReturnScreen() {
  const router = useRouter();
  const { getAllSales, refreshSales, returns } = useApp();
  const { user, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load sales when screen is focused
  useFocusEffect(
    useCallback(() => {
      const loadSales = async () => {
        setLoading(true);
        try {
          console.log('Refreshing sales data...');
          // Force a fresh refresh by clearing any potential cache
          await refreshSales();
          // Add delay and refresh again to ensure fresh data
          await new Promise(resolve => setTimeout(resolve, 1500));
          await refreshSales();
          console.log('Sales data refreshed twice');

          // Force re-render by updating refresh key
          setRefreshKey(prev => prev + 1);
        } catch (error) {
          console.log('Error loading sales:', error);
        } finally {
          setLoading(false);
        }
      };
      loadSales();
    }, [refreshSales])
  );

  // Get recent sales from context
  const allSales = getAllSales();

  // Show all sales (staff can process returns for any sale)
  const userSales = allSales;

  // Convert to SaleSummary format and sort by date (most recent first)
  const recentSales: SaleSummary[] = useMemo(() => {
    return userSales
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .slice(0, 20) // Show last 20 sales
      .map(sale => {
        // Try different ways to access items
        const items = sale.items || (sale as any).saleItems || [];
        const hasItems = items.length > 0;

        // Computed check: See if items are in the 'returns' state
        // This is more reliable than the DB flag
        const itemsWithReturns = items.map((item: any) => {
          const itemReturn = returns.find(r =>
            (r.saleItemId === item.id || r.saleItemId === item.sale_item_id) &&
            r.status !== 'rejected'
          );
          return {
            ...item,
            isReturned: !!itemReturn,
            returnQty: itemReturn ? itemReturn.quantity : 0
          };
        });

        const allReturned = hasItems && itemsWithReturns.every(i => i.isReturned);
        const someReturned = !allReturned && itemsWithReturns.some(i => i.isReturned);

        return {
          id: sale.id,
          customer: sale.customerName || "Walk-in Customer",
          time: formatTimeAgo(sale.saleDate),
          total: sale.totalAmount,
          returnStatus: allReturned ? 'full' : (someReturned ? 'partial' : 'none'),
        };
      });
  }, [userSales, returns, refreshKey]); // Add returns and refreshKey to force recalculation

  const filteredSales = recentSales.filter(
    (sale) =>
      sale.id.toLowerCase().includes(query.toLowerCase()) ||
      sale.customer.toLowerCase().includes(query.toLowerCase())
  );

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
          Start Return
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/returns/list")}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="history" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.04,
            shadowRadius: 8,
            elevation: 2,
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
              <MaterialIcons name="search" size={20} color="#6B7280" />
            </View>
            <TextInput
              style={{
                flex: 1,
                height: 56,
                borderRadius: 9999,
                backgroundColor: isDark ? colors.background : "#F5F5F5",
                borderWidth: 1,
                borderColor: colors.border,
                paddingLeft: 48,
                paddingRight: 16,
                fontSize: 16,
                color: colors.text,
              }}
              placeholder="Search Sale ID or Customer..."
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
            />
          </View>
        </View>

        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 12,
          }}
        >
          Recent Sales
        </Text>

        {/* Loading State */}
        {loading && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={{ marginTop: 12, color: "#6B7280" }}>Loading sales...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredSales.length === 0 && recentSales.length === 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="receipt-long" size={64} color="#D1D5DB" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280", marginTop: 16 }}>
              No sales found
            </Text>
            <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
              Create a sale first to process returns
            </Text>
          </View>
        )}

        {/* No Search Results */}
        {!loading && filteredSales.length === 0 && recentSales.length > 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="search-off" size={64} color="#D1D5DB" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280", marginTop: 16 }}>
              No sales match your search
            </Text>
          </View>
        )}

        {/* Sales List */}
        {!loading && filteredSales.map((sale) => (
          <View
            key={sale.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 10,
              elevation: 3,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {sale.id}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{sale.customer}</Text>
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {formatTZS(sale.total)}
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: colors.textSecondary }}>{sale.time}</Text>

            <TouchableOpacity
              onPress={() => {
                if (sale.returnStatus !== 'full') {
                  router.push(`/returns/new?saleId=${sale.id}`);
                }
              }}
              style={{
                height: 44,
                borderRadius: 9999,
                backgroundColor: sale.returnStatus === 'full'
                  ? (isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6')
                  : colors.primary,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 2,
                borderWidth: sale.returnStatus === 'full' ? 1 : 0,
                borderColor: sale.returnStatus === 'full' ? colors.border : 'transparent',
              }}
              disabled={sale.returnStatus === 'full'}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: sale.returnStatus === 'full' ? colors.textSecondary : "#FFFFFF",
                }}
              >
                {sale.returnStatus === 'full'
                  ? "Fully Returned"
                  : (sale.returnStatus === 'partial' ? "Return More" : "Start Return")}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
