// Admin Dashboard Screen - EXACT match to HTML design
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Line, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Text as SvgText } from "react-native-svg";
import { formatTZS, formatTZSShort } from "../../src/utils/currency";
import { LinearGradient } from "expo-linear-gradient";
import { useRoleGuard } from "../../src/hooks/useRoleGuard";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";
import { getSalesReport } from "../../src/services/reportService";
import * as inventoryService from "../../src/services/inventoryService";
import * as auditService from "../../src/services/auditService";
import * as notificationService from "../../src/services/notificationService";
import { useAuth } from "../../src/context/AuthContext";
import { isOnline } from "../../src/services/syncService";
import * as debtService from "../../src/services/debtService";

export default function AdminDashboard() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const router = useRouter();
  const {
    getAllSales,
    getLowStockProducts,
    getAllReturns,
    refreshReturns,
    refreshSales,
    refreshProducts,
    refreshDebts,
    getAllDebts
  } = useApp(); // START: Added refreshSales, refreshProducts
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get("window").width;
  const params = useLocalSearchParams<{ scannedBarcode?: string }>();

  // Barcode scanning state
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [checkingProduct, setCheckingProduct] = useState(false);

  // Handle scanned barcode from scanner
  useEffect(() => {
    if (params.scannedBarcode && !scannedBarcode) {
      handleBarcodeScan(params.scannedBarcode as string);
    }
  }, [params.scannedBarcode]);

  const handleBarcodeScan = async (barcode: string) => {
    setScannedBarcode(barcode);
    setCheckingProduct(true);

    try {
      // Check if product exists by SKU/barcode
      const existingProduct = await inventoryService.getProductBySku(barcode);

      if (existingProduct) {
        // Product exists - show options
        Alert.alert(
          "Product Found",
          `Product "${existingProduct.name}" found with SKU: ${barcode}\n\nStock: ${existingProduct.quantity_in_stock}\nPrice: ${formatTZS(existingProduct.selling_price)}`,
          [
            { text: "Close", style: "cancel" },
            {
              text: "View Product",
              onPress: () => router.push(`/inventory/${existingProduct.part_id}`)
            },
            {
              text: "Edit Product",
              onPress: () => router.push(`/inventory/edit/${existingProduct.part_id}`)
            }
          ]
        );
      } else {
        // Product not found - offer to create
        Alert.alert(
          "Product Not Found",
          `No product found with SKU/barcode: ${barcode}\n\nWould you like to create a new product?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Create Product",
              onPress: () => router.push({
                pathname: "/inventory/new",
                params: { scannedBarcode: barcode }
              })
            }
          ]
        );
      }
    } catch (error) {
      console.log('Error checking barcode:', error);
      Alert.alert(
        "Error",
        "Failed to check barcode. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setCheckingProduct(false);
      setScannedBarcode(null); // Reset for next scan
    }
  };

  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    newCustomers: 0,
    lowStockCount: 0,
    pendingReturns: 0,
    pendingDebitSales: 0,
  });
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const { user } = useAuth();

  // Refresh data when screen is focused (optimized) - START: Changed to useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      // Refresh all core data and capture the fresh results
      const [freshReturns, freshSales, _, freshDebts, unreadCount, audits] = await Promise.all([
        refreshReturns(),
        refreshSales(),
        refreshProducts(),
        refreshDebts(),
        notificationService.getUnreadCount(user?.id || null, true),
        auditService.getAllAudits(user?.id || null, true)
      ]);

      setUnreadNotificationsCount(unreadCount);
      setRecentAudits(Array.isArray(audits) ? audits.slice(0, 5) : []);

      const allSales = freshSales && freshSales.length > 0 ? freshSales : getAllSales();
      const allReturns = freshReturns && freshReturns.length > 0 ? freshReturns : getAllReturns();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      // Get sales report for last 30 days
      const salesReport = await getSalesReport('month', null, true);

      // Calculate unique customers (last 7 days)
      const customerService = require("@/services/customerService");
      const allCustomers = await customerService.getAllCustomers();
      const recentCustomers = allCustomers.filter((c: any) => {
        const visitDate = new Date(c.lastVisit);
        return visitDate >= last7Days;
      }).length;

      // Pending returns count
      const pendingReturns = allReturns.filter((r: any) => r.status === 'pending').length;
      console.log(`📊 [AdminDashboard] Fresh Returns: ${allReturns.length}, Pending: ${pendingReturns}`);

      // Low stock count
      const lowStockItems = getLowStockProducts();

      // Debt service for pending debit sales
      const debts = freshDebts && freshDebts.length > 0 ? freshDebts : getAllDebts();
      const debtSaleIds = new Set((debts || []).map((d: any) => d.saleId).filter(Boolean) as string[]);

      // Pending approvals = debit sales with remaining balance that do NOT yet have a debt record
      const debitSales = allSales.filter((sale: any) =>
        (sale.saleType?.toLowerCase() === 'debit' || sale.saleType === 'pending_debit') &&
        (Number(sale.amountRemaining || 0) > 0 || Number(sale.amountPaid || 0) < Number(sale.totalAmount || 0))
      );
      const pendingDebit = debitSales.filter((sale: any) => !debtSaleIds.has(sale.id)).length;

      console.log(`📊 [AdminDashboard] Fresh Sales: ${allSales.length}, Total Debit: ${debitSales.length}, Pending Approval: ${pendingDebit}`);

      setDashboardStats({
        totalRevenue: salesReport.totalSales,
        totalOrders: salesReport.transactionCount,
        newCustomers: recentCustomers,
        lowStockCount: lowStockItems.length,
        pendingReturns,
        pendingDebitSales: pendingDebit,
      });
    } catch (error) {
      console.log('Error loading dashboard data:', error);
    } finally {
      const online = await isOnline();
      setIsOffline(!online);
      setLoading(false);
    }
  };

  // Sales data for the chart - last 7 days
  const salesData = useMemo(() => {
    const allSales = getAllSales();
    const chartData: number[] = [];
    const today = new Date();

    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const daySales = allSales.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === date.getTime();
      });

      const dayTotal = daySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      chartData.push(dayTotal);
    }

    return chartData.length > 0 ? chartData : [0, 0, 0, 0, 0, 0, 0];
  }, [getAllSales]);

  const months = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const maxValue = Math.max(...salesData, 1000); // At least 1000 to avoid division by zero
  const chartWidth = screenWidth - 64;
  const chartHeight = 192;
  const padding = 20;
  const chartInnerWidth = chartWidth - padding * 2;
  const chartInnerHeight = chartHeight - padding * 2;

  // Calculate points for the line chart
  const points = salesData.map((value, index) => {
    const x = padding + (index / (salesData.length - 1 || 1)) * chartInnerWidth;
    const y = padding + chartInnerHeight - (value / maxValue) * chartInnerHeight;
    return { x, y, value };
  });

  // Create path for the line
  const pathData = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  // Create path for the area fill
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding + chartInnerHeight} L ${points[0].x} ${padding + chartInnerHeight} Z`;

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
          zIndex: 20,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialIcons name="cloud-off" size={14} color={colors.error} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.error }}>
              Offline Mode - Changes will sync later
            </Text>
          </View>
        </View>
      )}

      {/* Fixed Header */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingTop: !isOffline ? Math.max(insets.top, StatusBar.currentHeight || 0) + 32 : 32,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          zIndex: 10,
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
              onPress={() => router.push("/profile")}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isDark ? colors.surface : colors.border,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderWidth: 2,
                borderColor: colors.card,
              }}
            >
              {user?.photo_url ? (
                <Image
                  source={{ uri: user.photo_url }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <MaterialIcons name="person" size={24} color={colors.textSecondary} />
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
                Admin
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
          paddingBottom: 100 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* KPI Cards - 2x2 Grid */}
        <View
          style={{
            padding: 16,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          {/* Total Revenue */}
          <TouchableOpacity
            onPress={() => router.push("/reports")}
            style={{
              width: (screenWidth - 48) / 2,
              borderRadius: 16,
              overflow: "hidden",
              elevation: 4,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.4 : 0.2,
              shadowRadius: 12,
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ["#1E40AF", "#1E3A8A"] : ["#3B82F6", "#1D4ED8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16, height: 100, justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>Revenue</Text>
                <MaterialIcons name="payments" size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#FFFFFF", fontFamily: "Poppins_700Bold" }}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : formatTZSShort(dashboardStats.totalRevenue)}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Total Orders */}
          <TouchableOpacity
            onPress={() => router.push("/sales/history")}
            style={{
              width: (screenWidth - 48) / 2,
              borderRadius: 16,
              overflow: "hidden",
              elevation: 4,
              shadowColor: colors.success,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.4 : 0.2,
              shadowRadius: 12,
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ["#065F46", "#044E39"] : ["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16, height: 100, justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>Orders</Text>
                <MaterialIcons name="shopping-bag" size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF", fontFamily: "Poppins_700Bold" }}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : dashboardStats.totalOrders}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* New Customers */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/customers")}
            style={{
              width: (screenWidth - 48) / 2,
              borderRadius: 16,
              overflow: "hidden",
              elevation: 4,
              shadowColor: "#8B5CF6",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.4 : 0.2,
              shadowRadius: 12,
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ["#5B21B6", "#4C1D95"] : ["#8B5CF6", "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16, height: 100, justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>Customers</Text>
                <MaterialIcons name="people" size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF", fontFamily: "Poppins_700Bold" }}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : dashboardStats.newCustomers}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Low Stock Items */}
          <TouchableOpacity
            onPress={() => router.push("/reports/inventory")}
            style={{
              width: (screenWidth - 48) / 2,
              borderRadius: 16,
              overflow: "hidden",
              elevation: 4,
              shadowColor: colors.warning,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.4 : 0.2,
              shadowRadius: 12,
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ["#92400E", "#78350F"] : ["#F59E0B", "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16, height: 100, justifyContent: "space-between" }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.8)" }}>Low Stock</Text>
                <MaterialIcons name="warning" size={18} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#FFFFFF", fontFamily: "Poppins_700Bold" }}>
                {loading ? <ActivityIndicator size="small" color="#FFF" /> : dashboardStats.lowStockCount}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 20,
              elevation: 4,
              gap: 24,
            }}
          >
            {/* Row 1: Operations */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[
                { label: "New Order", icon: "add-shopping-cart", path: "/purchase-orders/new", color: "#3B82F6", bg: "rgba(59, 130, 246, 0.1)" },
                { label: "Add Product", icon: "add-box", path: "/inventory/new", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" },
                { label: "Bulk Update", icon: "inventory", path: "/inventory/bulk-update", color: "#EC4899", bg: "rgba(236, 72, 153, 0.1)" },
                { label: "Stock Audit", icon: "assignment", path: "/audits/new", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.1)" },
              ].map((action, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => router.push(action.path as any)}
                  style={{ width: (screenWidth - 48 - 48) / 4, alignItems: "center", gap: 10 }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: action.bg, alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: colors.text, textAlign: "center" }} numberOfLines={1}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 2: Management */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[
                { label: "Reports", icon: "bar-chart", path: "/reports", color: colors.success, bg: "rgba(22, 163, 74, 0.1)" },
                { label: "Staff", icon: "manage-accounts", path: "/staff", color: "#6366F1", bg: "rgba(99, 102, 241, 0.1)" },
                { label: "Customers", icon: "people", path: "/(tabs)/customers", color: "#10B981", bg: "rgba(16, 185, 129, 0.1)" },
                { label: "Suppliers", icon: "local-shipping", path: "/suppliers", color: "#F43F5E", bg: "rgba(244, 63, 94, 0.1)" },
              ].map((action, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => router.push(action.path as any)}
                  style={{ width: (screenWidth - 48 - 48) / 4, alignItems: "center", gap: 10 }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: action.bg, alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: colors.text, textAlign: "center" }} numberOfLines={1}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 3: Resources */}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[
                { label: "Categories", icon: "category", path: "/categories", color: "#F97316", bg: "rgba(249, 115, 22, 0.1)" },
                { label: "P. Orders", icon: "receipt-long", path: "/purchase-orders", color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.1)" },
                { label: "History", icon: "history", path: "/audits", color: "#64748b", bg: "rgba(100, 116, 139, 0.1)" },
                { label: "P&L", icon: "insights", path: "/reports/profit-loss", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
              ].map((action, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => router.push(action.path as any)}
                  style={{ width: (screenWidth - 48 - 48) / 4, alignItems: "center", gap: 10 }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: action.bg, alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: colors.text, textAlign: "center" }} numberOfLines={1}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Pending Approvals Alert Card */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.push("/admin/pending-debit-sales")}
            style={{
              backgroundColor: isDark ? "rgba(251, 146, 60, 0.15)" : "rgba(251, 146, 60, 0.08)",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.5,
              borderColor: isDark ? "rgba(251, 146, 60, 0.4)" : "rgba(251, 146, 60, 0.3)",
              shadowColor: "#FB923C",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 4,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(251, 146, 60, 0.25)" : "rgba(251, 146, 60, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="receipt-long" size={26} color="#FB923C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#FB923C",
                    marginBottom: 4,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Pending Approvals
                </Text>
                <Text style={{ fontSize: 14, color: isDark ? "rgba(251, 146, 60, 0.9)" : "#C2410C", fontWeight: "600" }}>
                  {dashboardStats.pendingDebitSales} debit sale{dashboardStats.pendingDebitSales !== 1 ? 's' : ''} waiting for approval
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={26} color="#FB923C" />
          </TouchableOpacity>
        </View>

        {/* Pending Returns Alert Card */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.push("/returns")}
            style={{
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.5,
              borderColor: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.3)",
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 4,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="assignment-return" size={26} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#3B82F6",
                    marginBottom: 4,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Pending Returns
                </Text>
                <Text style={{ fontSize: 14, color: isDark ? "rgba(59, 130, 246, 0.9)" : "#1E40AF", fontWeight: "600" }}>
                  {dashboardStats.pendingReturns} return request{dashboardStats.pendingReturns !== 1 ? 's' : ''} waiting for review
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={26} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Sales Trends Chart */}
        <View style={{ padding: 16 }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.text,
                    letterSpacing: -0.5,
                    fontFamily: "Poppins_700Bold",
                  }}
                >
                  Sales Trends
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Last 7 days performance</Text>
              </View>
              <MaterialIcons name="trending-up" size={24} color={colors.primary} />
            </View>
            <View style={{ width: "100%", height: 200, alignItems: "center", justifyContent: "center" }}>
              <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                <Defs>
                  <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={colors.primary} stopOpacity="0.2" />
                    <Stop offset="100%" stopColor={colors.primary} stopOpacity="0.02" />
                  </SvgLinearGradient>
                </Defs>

                {/* Grid lines */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = padding + (i / 4) * chartInnerHeight;
                  return (
                    <Line
                      key={i}
                      x1={padding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                  );
                })}

                {/* Area fill */}
                <Path
                  d={areaPath}
                  fill="url(#gradient)"
                />

                {/* Line */}
                <Path
                  d={pathData}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {points.map((point, index) => (
                  <React.Fragment key={`point-${index}`}>
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={6}
                      fill={colors.primary}
                      opacity={0.2}
                    />
                    <Circle
                      cx={point.x}
                      cy={point.y}
                      r={4}
                      fill={colors.card}
                      stroke={colors.primary}
                      strokeWidth={2.5}
                    />
                  </React.Fragment>
                ))}

                {/* Y-axis labels */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const value = (4 - i) * (maxValue / 4);
                  const y = padding + (i / 4) * chartInnerHeight;
                  return (
                    <SvgText
                      key={i}
                      x={2}
                      y={y + 4}
                      fontSize={11}
                      fill={colors.textSecondary}
                      textAnchor="start"
                      fontWeight="600"
                    >
                      {formatTZSShort(value)}
                    </SvgText>
                  );
                })}

                {/* X-axis labels */}
                {months.map((month, index) => {
                  const x = padding + (index / (months.length - 1)) * chartInnerWidth;
                  return (
                    <SvgText
                      key={index}
                      x={x}
                      y={chartHeight - 4}
                      fontSize={11}
                      fill={colors.textSecondary}
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {month}
                    </SvgText>
                  );
                })}
              </Svg>
            </View>
          </View>

          {/* Recent Audits Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text, fontFamily: "Poppins_700Bold", letterSpacing: -0.5 }}>
                Recent Audits
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/audits")}
                style={{ backgroundColor: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(0, 123, 255, 0.05)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 }}
              >
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "700" }}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentAudits.length > 0 ? (
              <View style={{ gap: 12 }}>
                {recentAudits.map((audit) => (
                  <TouchableOpacity
                    key={audit.audit_id}
                    onPress={() => router.push(`/audits`)}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 16,
                      padding: 16,
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.02,
                      shadowRadius: 8,
                      elevation: 1,
                    }}
                    activeOpacity={0.8}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: isDark ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <MaterialIcons name="inventory" size={24} color="#8B5CF6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 2 }}>
                        Stock Update
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        Product ID: {audit.part_id.slice(0, 8)}... | {new Date(audit.audit_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: audit.adjustment > 0 ? colors.success : colors.error }}>
                        {audit.adjustment > 0 ? "+" : ""}{audit.adjustment}
                      </Text>
                      <MaterialIcons name="chevron-right" size={18} color={colors.border} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 40, alignItems: "center", borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" }}>
                <MaterialIcons name="assignment" size={48} color={colors.border} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: "500" }}>No audit records found yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB Button */}
      <TouchableOpacity
        onPress={() => router.push({
          pathname: "/inventory/scan",
          params: { returnTo: "/admin/dashboard" }
        })}
        style={{
          position: "absolute",
          bottom: 100 + insets.bottom, // Higher position - more distance from bottom navigation
          right: 16,
          width: 64,
          height: 64,
          borderRadius: 9999,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
          zIndex: 25,
        }}
        activeOpacity={0.8}
      >
        <MaterialIcons name="qr-code-scanner" size={36} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Barcode Checking Overlay */}
      {checkingProduct && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 24,
              alignItems: "center",
              margin: 20,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
              }}
            >
              Checking barcode...
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              {scannedBarcode}
            </Text>
          </View>
        </View>
      )}

      {/* Bottom Navigation */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 10,
          elevation: 5,
          zIndex: 20,
          height: 80,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingHorizontal: 8,
        }}
      >
        {/* Dashboard */}
        <TouchableOpacity
          onPress={() => router.push("/admin/dashboard")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flex: 1,
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="dashboard" size={28} color={colors.primary} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.primary,
            }}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        {/* Inventory */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/inventory")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flex: 1,
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="inventory" size={28} color={colors.textSecondary} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.textSecondary,
            }}
          >
            Inventory
          </Text>
        </TouchableOpacity>

        {/* Sales */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/sales")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flex: 1,
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="storefront" size={28} color={colors.textSecondary} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.textSecondary,
            }}
          >
            Sales
          </Text>
        </TouchableOpacity>

        {/* Customers */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/customers")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flex: 1,
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="groups" size={28} color={colors.textSecondary} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.textSecondary,
            }}
          >
            Customers
          </Text>
        </TouchableOpacity>

        {/* Profile */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/profile")}
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flex: 1,
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="person" size={28} color={colors.textSecondary} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: colors.textSecondary,
            }}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

