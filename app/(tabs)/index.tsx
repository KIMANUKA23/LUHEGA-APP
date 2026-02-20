// Staff Dashboard Screen - EXACT match to HTML design
import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatTZS, formatTZSShort } from "../../src/utils/currency";
import { useApp, Sale, ReturnRequest } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as returnsService from "../../src/services/returnsService";
import * as notificationService from "../../src/services/notificationService";
import { getProductBySku } from "../../src/services/inventoryService";
import { Alert } from "react-native";
import { isOnline } from "../../src/services/syncService";

export default function StaffDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scannedBarcode?: string }>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    products: allProducts,
    sales: allSales,
    refreshSales,
    refreshProducts,
    getAllReturns,
    refreshReturns
  } = useApp();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;
  const [pendingReturnsCount, setPendingReturnsCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [checkingBarcode, setCheckingBarcode] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(false);

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string): string => {
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
  };

  // 1. All hooks must be at the top level
  const todayStats = useMemo(() => {
    // Return default stats if not authenticated or user is missing
    if (!isAuthenticated || !user?.id) {
      return { todaySales: 0, allSales: 0, todayCustomers: 0, lowStockCount: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // Filter by current user
    const userSales = allSales.filter(sale => sale.staffId === user.id);

    // Get today's sales
    const todaySales = userSales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === todayTimestamp;
    });

    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const allTotal = userSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Count unique customers
    const uniqueCustomers = new Set(
      todaySales.map(s => s.customerPhone || s.customerName || `guest_${s.id}`)
    ).size;

    const lowStockItems = allProducts.filter(p => p.quantityInStock <= p.reorderLevel).length;

    return {
      todaySales: todayTotal,
      allSales: allTotal,
      todayCustomers: uniqueCustomers,
      lowStockCount: lowStockItems,
    };
  }, [isAuthenticated, allSales, allProducts, user?.id]);

  const recentActivities = useMemo(() => {
    // Return empty array if not authenticated or user is missing
    if (!isAuthenticated || !user?.id) return [];

    const activities: Array<{ icon: any; title: string; time: string; route: string }> = [];

    // Filter by user
    const userSales = allSales.filter((sale) => sale.staffId === user.id);

    const recentSales = [...userSales]
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .slice(0, 3)
      .map((sale) => ({
        icon: "receipt-long" as const,
        title: `Sale ${sale.id.slice(0, 8)} completed`,
        time: formatTimeAgo(sale.saleDate),
        route: "/sales/history",
      }));

    activities.push(...recentSales);

    // Get recent returns (last 2)
    const allReturnsData = getAllReturns();
    const recentReturns = [...allReturnsData]
      .sort((a, b) => new Date(b.dateReturned).getTime() - new Date(a.dateReturned).getTime())
      .slice(0, 2)
      .map((ret) => ({
        icon: "undo" as const,
        title: `Return processed for ${ret.productName}`,
        time: formatTimeAgo(ret.dateReturned),
        route: "/returns/list",
      }));

    activities.push(...recentReturns);

    return activities.sort((a, b) => 0).slice(0, 4);
  }, [isAuthenticated, allSales, getAllReturns, user?.id]);

  // 2. Navigation redirects in Effects
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'admin') {
      // Redirect immediately for admins to avoid flashing staff dashboard
      router.replace("/admin/dashboard");
      return;
    }
  }, [user?.role, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading && isAuthenticated === false) {
      router.replace("/(auth)/login-choice");
    }
  }, [isAuthenticated, authLoading]);

  // 3. Barcode scan handler
  useFocusEffect(
    React.useCallback(() => {
      if (params.scannedBarcode) {
        handleBarcodeScan(params.scannedBarcode);
        router.setParams({ scannedBarcode: undefined, _t: undefined });
      }
    }, [params.scannedBarcode])
  );

  const handleBarcodeScan = async (barcode: string) => {
    setCheckingBarcode(true);
    const product = allProducts.find(p => p.sku === barcode);
    if (product) {
      Alert.alert(
        "Product Found",
        `${product.name}\nBarcode: ${barcode}\nStock: ${product.quantityInStock}\nPrice: ${formatTZS(product.sellingPrice)}\n\nGo to sales to add this product to cart.`,
        [
          { text: "OK", style: "default" },
          {
            text: "Go to Sales",
            onPress: () => router.push({
              pathname: "/sales/new",
              params: { scannedBarcode: barcode }
            })
          }
        ]
      );
    } else {
      Alert.alert("Product Not Found", `No product found with barcode: ${barcode}`);
    }
    setCheckingBarcode(false);
  };

  // 4. Data loading
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated || authLoading) return;
      let isMounted = true;
      const loadData = async () => {
        setLoading(true);
        try {
          await Promise.all([refreshReturns(), refreshSales(), refreshProducts()]);
          if (!isMounted) return;
          const allReturns = getAllReturns();
          setPendingReturnsCount(allReturns.filter(r => r.status === 'pending').length);
          const count = await notificationService.getUnreadCount(user?.id || null, false);
          if (isMounted) setUnreadNotificationsCount(count);
          const online = await isOnline();
          if (isMounted) setIsOffline(!online);
        } catch (error) {
          console.log('Error loading dashboard data:', error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      loadData();
      return () => { isMounted = false; };
    }, [isAuthenticated, authLoading, refreshReturns, refreshSales, refreshProducts, user?.id])
  );

  // Early returns AFTER all hooks - this is critical for React rendering stability
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || user?.role === 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>
          {user?.role === 'admin' ? "Loading Admin Dashboard..." : "Redirecting..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.card} />

      {/* Offline Indicator Removed */}

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingTop: insets.top + 24,
          paddingBottom: 20,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* User Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/profile/edit")}
              activeOpacity={0.8}
            >
              {user?.photo_url ? (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 9999,
                    backgroundColor: isDark ? colors.surface : colors.border,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: user.photo_url }}
                    style={{ width: '100%', height: '100%' }}
                  />
                </View>
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 9999,
                    backgroundColor: isDark ? colors.surface : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="person" size={24} color={colors.textSecondary} />
                </View>
              )}
            </TouchableOpacity>
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "400",
                  color: colors.textSecondary,
                  lineHeight: 20,
                }}
              >
                Welcome back,
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  lineHeight: 28,
                  letterSpacing: -0.015,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {user?.name || "Staff Member"}
              </Text>
            </View>
          </View>
          {/* Notifications Icon */}
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <View>
              <MaterialIcons name="notifications" size={28} color={colors.text} />
              {unreadNotificationsCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    right: -2,
                    top: -2,
                    backgroundColor: colors.error,
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: colors.card,
                    paddingHorizontal: 2,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 140 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content */}
        <View style={{ padding: 16, gap: 24 }}>
          {/* Summary Cards - 2 columns */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 0,
            }}
          >
            {/* Today's Sales */}
            <TouchableOpacity
              onPress={() => router.push("/sales/history")}
              style={{
                width: (screenWidth - 48) / 2,
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 16,
                elevation: 4,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: "rgba(0, 123, 255, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12
              }}>
                <MaterialIcons name="payments" size={18} color={colors.primary} />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                Today's Sales
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.primary,
                  letterSpacing: -0.5,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {formatTZSShort(todayStats.todaySales)}
              </Text>
            </TouchableOpacity>

            {/* Customers Today */}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/customers")}
              style={{
                width: (screenWidth - 48) / 2,
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 16,
                elevation: 4,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12
              }}>
                <MaterialIcons name="group" size={18} color="#8B5CF6" />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                Customers
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.text,
                  letterSpacing: -0.5,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {todayStats.todayCustomers}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Low Stock Items Card */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/inventory")}
              style={{
                width: (screenWidth - 48) / 2,
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 16,
                elevation: 4,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: todayStats.lowStockCount > 0 ? "rgba(220, 38, 38, 0.1)" : "rgba(22, 163, 74, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12
              }}>
                <MaterialIcons
                  name="inventory-2"
                  size={18}
                  color={todayStats.lowStockCount > 0 ? colors.error : colors.success}
                />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                Low Stock
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: todayStats.lowStockCount > 0 ? colors.error : colors.text,
                  letterSpacing: -0.5,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {todayStats.lowStockCount}
              </Text>
            </TouchableOpacity>

            {/* Pending Returns Card */}
            <TouchableOpacity
              onPress={() => router.push("/returns/list")}
              style={{
                width: (screenWidth - 48) / 2,
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: isDark ? 0.4 : 0.08,
                shadowRadius: 16,
                elevation: 4,
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12
              }}>
                <MaterialIcons name="assignment-return" size={18} color="#F59E0B" />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                Returns
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.text,
                  letterSpacing: -0.5,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {pendingReturnsCount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(0, 123, 255, 0.15)",
              padding: 20,
              shadowColor: "#007BFF",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.15 : 0.08,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
                marginBottom: 16,
              }}
            >
              Quick Actions
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-around",
              }}
            >
              {[
                { label: "New Sale", icon: "add-shopping-cart", route: "/sales/new", color: colors.primary, bgColor: "rgba(0, 123, 255, 0.12)" },
                { label: "Expenses", icon: "payments", route: "/expenses/new", color: colors.error, bgColor: "rgba(220, 38, 38, 0.12)" },
                { label: "Inventory", icon: "inventory", route: "/(tabs)/inventory", color: "#16A34A", bgColor: "rgba(22, 163, 74, 0.12)" },
                { label: "Customers", icon: "group", route: "/(tabs)/customers", color: "#8B5CF6", bgColor: "rgba(139, 92, 246, 0.12)" },
                { label: "Returns", icon: "assignment-return", route: "/returns/list", color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.12)" },
              ].map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => router.push(action.route as any)}
                  style={{ alignItems: "center", gap: 8 }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : action.bgColor,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isDark ? 1 : 0,
                      borderColor: isDark ? "rgba(255,255,255,0.08)" : "transparent",
                    }}
                  >
                    <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: colors.textSecondary,
                    }}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                Recent Activity
              </Text>
              <TouchableOpacity onPress={() => router.push("/sales/history")}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>History</Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 24,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {recentActivities.map((activity, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => router.push(activity.route as any)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderBottomWidth: index < recentActivities.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: isDark ? "#1E293B" : "rgba(0, 123, 255, 0.08)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons
                      name={activity.icon as any}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: colors.text,
                        lineHeight: 20,
                      }}
                    >
                      {activity.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        lineHeight: 16,
                      }}
                    >
                      {activity.time}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB Button */}
      <TouchableOpacity
        onPress={() => router.push({
          pathname: "/inventory/scan",
          params: { returnTo: "/(tabs)" }
        })}
        style={{
          position: "absolute",
          bottom: 80 + insets.bottom, // Tab bar height + safe area bottom
          right: 16,
          width: 64,
          height: 64,
          borderRadius: 9999,
          backgroundColor: "#007BFF",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 20,
        }}
        activeOpacity={0.8}
      >
        <MaterialIcons name="qr-code-scanner" size={36} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
