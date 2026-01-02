// Reports Home Dashboard - Main analytics dashboard
import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { KPICard, FilterBar, ChartCard } from "../../src/components/reports";
import { BarChart, PieChart } from "react-native-gifted-charts";
import * as reportService from "../../src/services/reportService";
import { useAuth } from "../../src/context/AuthContext";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";
import { generateReportPDF, ReportData } from "../../src/utils/reportGenerator";

const screenWidth = Dimensions.get("window").width;

const quickLinks = [
  { id: "daily", label: "Daily Report", icon: "today", route: "/reports/daily", color: "#007BFF" },
  { id: "weekly", label: "Weekly Report", icon: "date-range", route: "/reports/weekly", color: "#16A34A" },
  { id: "monthly", label: "Monthly Report", icon: "calendar-today", route: "/reports/monthly", color: "#D97706" },
  { id: "yearly", label: "Yearly Report", icon: "event-note", route: "/reports/yearly", color: "#8B5CF6" },
  { id: "inventory", label: "Inventory Analytics", icon: "inventory", route: "/reports/inventory", color: "#DC2626" },
  { id: "debts", label: "Debt Analytics", icon: "account-balance-wallet", route: "/reports/debts", color: "#EA580C" },
  { id: "staff", label: "Staff Performance", icon: "people", route: "/reports/staff", color: "#0891B2" },
  { id: "profit", label: "Profit & Loss", icon: "trending-up", route: "/reports/profit-loss", color: "#059669" },
];

export default function ReportsHomeScreen() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { getLowStockProducts } = useApp();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [activeFilter, setActiveFilter] = useState<reportService.ReportPeriod>("week");
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    revenue: { value: 0, trend: 0, isPositive: true },
    sales: { value: 0, trend: 0, isPositive: true },
    debts: { value: 0, trend: 0, isPositive: false },
    lowStock: { value: 0, trend: 0, isPositive: false },
  });
  const [weeklyData, setWeeklyData] = useState<Array<{ value: number; label: string; frontColor: string }>>([]);
  const [topProducts, setTopProducts] = useState<reportService.ProductReport[]>([]);

  useEffect(() => {
    loadReportData();
  }, [activeFilter, user?.id, isAdmin]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Load KPI data
      const [salesReport, debtReport, stockReport, topProductsData] = await Promise.all([
        reportService.getSalesReport(activeFilter, user?.id || null, isAdmin),
        reportService.getDebtReport(),
        reportService.getStockReport(),
        reportService.getTopSellingProducts(activeFilter, 3),
      ]);

      setKpiData({
        revenue: { value: salesReport.totalSales, trend: 0, isPositive: true },
        sales: { value: salesReport.transactionCount, trend: 0, isPositive: true },
        debts: { value: debtReport.totalOutstanding, trend: 0, isPositive: false },
        lowStock: { value: stockReport.lowStockCount, trend: 0, isPositive: false },
      });

      setTopProducts(topProductsData);

      // Get real daily sales breakdown for weekly chart
      const { thisWeek } = await reportService.getWeeklyComparisonReport(user?.id || null, isAdmin);

      // Map daily breakdown to chart format
      const weeklyChartData = thisWeek.map((dayData, index) => {
        return {
          value: Math.round(dayData.value),
          label: dayData.label,
          frontColor: dayData.label === "Fri"
            ? colors.success
            : (isDark ? "rgba(0, 123, 255, 0.8)" : colors.primary), // Highlight Friday
        };
      });

      setWeeklyData(weeklyChartData);
    } catch (error) {
      console.log("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const reportData: ReportData = {
        title: 'Master Business Summary',
        subtitle: `Performance Overview (${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)})`,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        kpis: [
          { label: "Total Revenue", value: formatTZS(kpiData.revenue.value) },
          { label: "Total Transactions", value: kpiData.sales.value.toString() },
          { label: "Active Debts", value: formatTZS(kpiData.debts.value) },
          { label: "Low Stock Items", value: kpiData.lowStock.value.toString() },
        ],
        sections: [
          {
            title: 'Top Products Performance',
            columns: ['Product Name', 'Quantity Sold', 'Total Revenue'],
            rows: topProducts.map(p => [
              p.productName,
              p.quantitySold.toString(),
              formatTZS(p.totalRevenue)
            ])
          },
          {
            title: 'Reporting Areas Covered',
            columns: ['Report Type', 'Description'],
            rows: [
              ['Daily/Weekly/Monthly Sales', 'Full revenue and profit tracking per period'],
              ['Inventory Analytics', 'Stock levels, valuation, and reorder alerts'],
              ['Debt Analytics', 'Outstanding balances and collection tracking'],
              ['Staff Performance', 'Individual sales contributions and rankings']
            ]
          }
        ]
      };

      await generateReportPDF(reportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate summary report PDF');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading reports...</Text>
      </View>
    );
  }

  // Generate category data from top products (simplified)
  const categoryData = topProducts.length > 0
    ? topProducts.slice(0, 4).map((product, index) => {
      const pieColors = ["#007BFF", "#16A34A", "#D97706", "#DC2626"];
      const total = topProducts.reduce((sum, p) => sum + p.totalRevenue, 0);
      const percentage = total > 0 ? Math.round((product.totalRevenue / total) * 100) : 0;
      return {
        value: percentage,
        color: pieColors[index] || "#8B5CF6",
        text: `${percentage}%`,
        label: product.productName.length > 15 ? product.productName.substring(0, 15) + "..." : product.productName,
      };
    })
    : [];

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
          Reports & Analytics
        </Text>

        <TouchableOpacity
          onPress={handleExport}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="download" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={(filter) => setActiveFilter(filter as reportService.ReportPeriod)}
        options={[
          { id: "day", label: "Today" },
          { id: "week", label: "This Week" },
          { id: "month", label: "This Month" },
          { id: "year", label: "This Year" },
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards Grid */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Total Revenue"
            value={formatTZS(kpiData.revenue.value)}
            trend={{ value: kpiData.revenue.trend, isPositive: kpiData.revenue.isPositive }}
            icon="attach-money"
            iconColor={isDark ? "#60A5FA" : "#007BFF"}
            iconBgColor={isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)"}
          />
          <KPICard
            title="Total Sales"
            value={kpiData.sales.value.toString()}
            trend={{ value: kpiData.sales.trend, isPositive: kpiData.sales.isPositive }}
            icon="shopping-cart"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Active Debts"
            value={formatTZS(kpiData.debts.value)}
            trend={{ value: Math.abs(kpiData.debts.trend), isPositive: !kpiData.debts.isPositive }}
            icon="account-balance-wallet"
            iconColor={colors.warning}
            iconBgColor={isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)"}
          />
          <KPICard
            title="Low Stock"
            value={`${kpiData.lowStock.value} items`}
            subtitle="Needs reorder"
            icon="warning"
            iconColor={colors.error}
            iconBgColor={isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)"}
          />
        </View>

        {/* Weekly Sales Chart */}
        <ChartCard title="Weekly Sales Overview" subtitle="Revenue by day">
          <View style={{ alignItems: "center" }}>
            {weeklyData.length > 0 ? (
              <BarChart
                data={weeklyData}
                width={screenWidth - 80}
                height={200}
                barWidth={28}
                spacing={20}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={1}
                xAxisColor={colors.border}
                yAxisThickness={0}
                yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                noOfSections={4}
                maxValue={Math.max(...weeklyData.map(d => d.value), 100000) * 1.2}
                yAxisLabelPrefix="TZS "
                yAxisLabelSuffix="K"
                labelWidth={30}
                xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
                isAnimated
                animationDuration={500}
              />
            ) : (
              <Text style={{ color: colors.textSecondary, padding: 20 }}>No sales data available</Text>
            )}
          </View>
        </ChartCard>

        {/* Sales by Category */}
        <ChartCard title="Top Products Distribution" subtitle="Revenue by product">
          {categoryData.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
              <PieChart
                data={categoryData}
                donut
                radius={80}
                innerRadius={50}
                innerCircleColor={colors.card}
                centerLabelComponent={() => (
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                      {categoryData.reduce((sum, item) => sum + item.value, 0)}%
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total</Text>
                  </View>
                )}
              />
              <View style={{ gap: 8 }}>
                {categoryData.map((item, index) => (
                  <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        backgroundColor: item.color,
                      }}
                    />
                    <Text style={{ fontSize: 13, color: colors.text }}>
                      {item.label}: {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, padding: 20, textAlign: "center" }}>No product data available</Text>
          )}
        </ChartCard>

        {/* Top Products */}
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
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Top Selling Products
          </Text>
          {topProducts.length > 0 ? (
            topProducts.map((product, index) => {
              const rank = index + 1;
              return (
                <View
                  key={product.productId}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: rank < topProducts.length ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor:
                        rank === 1
                          ? (isDark ? "rgba(251, 191, 36, 0.2)" : "#FEF3C7")
                          : rank === 2
                            ? (isDark ? "rgba(156, 163, 175, 0.2)" : "#E5E7EB")
                            : (isDark ? "rgba(251, 146, 60, 0.2)" : "#FED7AA"),
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color:
                          rank === 1
                            ? (isDark ? "#FBBF24" : "#D97706")
                            : rank === 2
                              ? (isDark ? "#9CA3AF" : "#6B7280")
                              : (isDark ? "#FB923C" : "#EA580C"),
                      }}
                    >
                      #{rank}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                      {product.productName}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {product.quantitySold} units sold
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
                    {formatTZS(product.totalRevenue)}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={{ color: colors.textSecondary, padding: 20, textAlign: "center" }}>No product sales data available</Text>
          )}
        </View>

        {/* Quick Links */}
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: colors.text,
            marginTop: 8,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Detailed Reports
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {quickLinks.map((link) => (
            <TouchableOpacity
              key={link.id}
              onPress={() => router.push(link.route)}
              style={{
                width: "47%",
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.2 : 0.03,
                shadowRadius: 6,
                elevation: 2,
              }}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: isDark ? `${link.color}30` : `${link.color}15`,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <MaterialIcons name={link.icon as any} size={24} color={isDark ? colors.text : link.color} />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: isDark ? colors.text : "#374151",
                  textAlign: "center",
                }}
              >
                {link.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

