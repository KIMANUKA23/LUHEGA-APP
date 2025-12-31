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
import { formatTZS } from "../../src/utils/currency";
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/(auth)/login-choice");
    }
  }, [isAuthenticated, authLoading, router]);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'admin') {
      router.replace("/admin/dashboard");
    }
  }, [user?.role, isAuthenticated, authLoading, router]);

  // Handle scanned barcode from scanner when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (params.scannedBarcode) {
        console.log('Staff dashboard detected barcode:', params.scannedBarcode);
        handleBarcodeScan(params.scannedBarcode);

        // Clear params to prevent re-triggering alert
        router.setParams({ scannedBarcode: undefined, _t: undefined });
      }
    }, [params.scannedBarcode])
  );

  const handleBarcodeScan = async (barcode: string) => {
    console.log('handleBarcodeScan (local) called with barcode:', barcode);
    setCheckingBarcode(true);

    // Check in local products array for instant response
    const product = allProducts.find(p => p.sku === barcode);
    console.log('Local product match:', product ? product.name : 'Not found');

    if (product) {
      // Product found - show success message
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
      // Product not found locally
      Alert.alert(
        "Product Not Found",
        `No product found with barcode: ${barcode}`,
        [{ text: "OK", style: "default" }]
      );
    }

    setCheckingBarcode(false);
  };

  // Refresh data when screen is focused (optimized) - MUST be before early returns
  useFocusEffect(
    React.useCallback(() => {
      // Don't load data if not authenticated
      if (!isAuthenticated || authLoading) return;

      let isMounted = true;

      const loadData = async () => {
        if (!isMounted) return;
        setLoading(true);
        try {
          // Refresh data to ensure accuracy
          console.log('🔄 [Dashboard] Refreshing Returns...');
          await refreshReturns();
          console.log('✅ [Dashboard] Returns refreshed.');
          console.log('🔄 [Dashboard] Refreshing Sales...');
          await refreshSales();
          console.log('✅ [Dashboard] Sales refreshed.');
          console.log('🔄 [Dashboard] Refreshing Products...');
          await refreshProducts();
          console.log('✅ [Dashboard] Products refreshed.');
          console.log('✅ [Dashboard] All data refreshed');

          if (!isMounted) return;

          // Get pending returns count after refresh
          console.log('🔄 [Dashboard] Calculating pending returns...');
          const allReturns = getAllReturns();
          console.log(`🔄 [Dashboard] Found ${allReturns.length} total returns`);
          const pending = allReturns.filter(r => r.status === 'pending').length;
          setPendingReturnsCount(pending);
          console.log(`✅ [Dashboard] Pending returns: ${pending}`);

          // Get unread notifications count
          console.log('🔄 [Dashboard] Fetching unread notifications count...');
          const count = await notificationService.getUnreadCount(user?.id || null, false);
          if (isMounted) setUnreadNotificationsCount(count);
          console.log(`✅ [Dashboard] Unread notifications: ${count}`);
        } catch (error) {
          console.log('Error loading dashboard data:', error);
        } finally {
          const online = await isOnline();
          console.log(`📊 [Dashboard] State: ${online ? 'ONLINE' : 'OFFLINE'}`);
          console.log(`📊 [Dashboard] Data: ${allSales.length} sales, ${allProducts.length} products`);

          if (isMounted) {
            setIsOffline(!online);
            setLoading(false);
          }
        }
      };

      loadData();

      return () => {
        isMounted = false;
      };
    }, [isAuthenticated, authLoading, refreshReturns, refreshSales, refreshProducts, user?.id])
  );

  // Calculate today's stats - MUST be before early returns
  const todayStats = useMemo(() => {
    if (!isAuthenticated) return { todaySales: 0, allSales: 0, todayCustomers: 0, lowStockCount: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    // Filter by current user if staff
    const userSales = user?.id
      ? allSales.filter(sale => sale.staffId === user.id)
      : allSales;

    // Get today's sales
    const todaySales = userSales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === todayTimestamp;
    });

    const todayTotal = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const allTotal = userSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Count unique customers: Use phone, name, or sale ID for guests
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

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Redirecting...</Text>
      </View>
    );
  }

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

  // Generate recent activities from real data
  const recentActivities = useMemo(() => {
    const activities: Array<{ icon: any; title: string; time: string; route: string }> = [];

    // Get recent sales (last 5, filtered by user if staff)
    const userSales = user?.id
      ? allSales.filter((sale) => sale.staffId === user.id)
      : allSales;

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

    // Sort all activities by time (most recent first) and take most recent 4
    return activities.slice(0, 4);
  }, [allSales, getAllReturns, user?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.card} />

      {/* Offline Indicator */}
      {isOffline && (
        <View style={{
          backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEF2F2",
          paddingVertical: 6,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FEE2E2",
          marginTop: Math.max(insets.top, StatusBar.currentHeight || 0),
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons name="cloud-off" size={14} color={colors.error} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.error }}>
              Offline Mode - Changes will sync later
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingTop: !isOffline ? Math.max(insets.top, StatusBar.currentHeight || 0) + 16 : 16,
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
          paddingBottom: 100 + insets.bottom, // Account for tab bar + safe area
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
                {formatTZS(todayStats.todaySales)}
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
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  pendingReturnsCount
                )}
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
