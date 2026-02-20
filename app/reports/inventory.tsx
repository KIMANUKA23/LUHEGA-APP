// Inventory Analytics - Low stock, movement chart, reorder alerts
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { KPICard, ChartCard } from "../../src/components/reports";
import { PieChart, BarChart } from "react-native-gifted-charts";
import { useTheme } from "../../src/context/ThemeContext";
import * as reportService from "../../src/services/reportService";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";
import { generateReportPDF, ReportData } from "../../src/utils/reportGenerator";

const screenWidth = Dimensions.get("window").width;

export default function InventoryAnalyticsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<reportService.InventoryAnalytics | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await reportService.getInventoryAnalytics();
      setData(result);
    } catch (error) {
      console.log("Error loading inventory analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      const reportData: ReportData = {
        title: 'Inventory Analytics Report',
        subtitle: 'Inventory Status & Stock Summary',
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        kpis: [
          { label: "Total Units", value: data.totalItems.toLocaleString() },
          { label: "Product Variants", value: data.totalProductCount.toLocaleString() },
          { label: "Cost Value", value: formatTZS(data.totalCostValue) },
          { label: "Selling Value", value: formatTZS(data.totalSellingValue) },
          { label: "Potential Profit", value: formatTZS(data.potentialProfit) },
          { label: "Low Stock", value: data.lowStockCount.toString() },
        ],
        sections: [
          {
            title: 'Low Stock Alert Items',
            columns: ['Product Name', 'Current', 'Reorder'],
            rows: data.lowStockItems.map(item => [
              item.name,
              item.current.toString(),
              item.reorder.toString()
            ])
          },
          {
            title: 'Stock Distribution',
            columns: ['Category', 'Percentage'],
            rows: data.stockDistribution.map(d => [
              d.label,
              `${d.value}%`
            ])
          }
        ]
      };

      await generateReportPDF(reportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report PDF');
    }
  };

  if (loading || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Auditing inventory...</Text>
      </View>
    );
  }

  // No fallback needed anymore
  const movementData = data.movementTrend.map(item => ({
    ...item,
    frontColor: item.value > 0 ? colors.primary : colors.border
  }));

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
          Inventory Analytics
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards - Row 1 */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Total Units"
            value={data.totalItems.toLocaleString()}
            subtitle="Stock in hand"
            icon="inventory"
            iconColor={isDark ? "#60A5FA" : "#007BFF"}
            iconBgColor={isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)"}
          />
          <KPICard
            title="Variants"
            value={data.totalProductCount.toLocaleString()}
            subtitle="Unique Parts"
            icon="category"
            iconColor={isDark ? "#A78BFA" : "#8B5CF6"}
            iconBgColor={isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(139, 92, 246, 0.1)"}
          />
        </View>

        {/* KPI Cards - Row 2 */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Total Cost"
            value={formatTZS(data.totalCostValue)}
            subtitle="Inv. Investment"
            icon="payments"
            iconColor={colors.error}
            iconBgColor={isDark ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)"}
          />
          <KPICard
            title="Selling Value"
            value={formatTZS(data.totalSellingValue)}
            subtitle="Expected revenue"
            icon="monetization-on"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"}
          />
        </View>

        {/* KPI Cards - Row 3 */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Potential Profit"
            value={formatTZS(data.potentialProfit)}
            subtitle="Net after sales"
            icon="trending-up"
            iconColor={isDark ? "#FB923C" : "#F97316"}
            iconBgColor={isDark ? "rgba(251, 146, 60, 0.1)" : "rgba(249, 115, 22, 0.1)"}
          />
          <KPICard
            title="Low Stock"
            value={data.lowStockCount.toString()}
            subtitle="Items to reorder"
            icon="warning"
            iconColor={colors.warning}
            iconBgColor={isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)"}
            onPress={() => { }}
          />
        </View>

        {/* Reorder Alerts */}
        {data.reorderAlerts.length > 0 && (
          <View
            style={{
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.3)",
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <MaterialIcons name="notifications-active" size={22} color={colors.error} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: isDark ? "#FCA5A5" : "#DC2626",
                  marginLeft: 8,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                Reorder Alerts
              </Text>
            </View>
            {data.reorderAlerts.map((alert, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  borderBottomWidth: index < data.reorderAlerts.length - 1 ? 1 : 0,
                  borderBottomColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.2)",
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: alert.urgency === "critical" ? colors.error : colors.warning,
                    marginRight: 10,
                  }}
                />
                <Text style={{ flex: 1, fontSize: 14, color: isDark ? colors.text : "#991B1B" }}>{alert.name}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: alert.urgency === "critical" ? colors.error : colors.warning,
                  }}
                >
                  {alert.daysLeft === 0 ? "Out now!" : `${alert.daysLeft} items`}
                </Text>
              </View>
            ))}
          </View>
        )
        }

        {/* Stock Distribution Donut */}
        <ChartCard title="Stock by Category" subtitle="Distribution of inventory">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
            <PieChart
              data={data.stockDistribution}
              donut
              radius={80}
              innerRadius={50}
              innerCircleColor={colors.card}
              centerLabelComponent={() => (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                    {data.totalItems}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>Items</Text>
                </View>
              )}
            />
            <View style={{ gap: 8 }}>
              {data.stockDistribution.map((item, index) => (
                <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      backgroundColor: item.color,
                    }}
                  />
                  <Text style={{ fontSize: 12, color: colors.text }}>
                    {item.label}: {item.value}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ChartCard>

        {/* Stock Movement Chart */}
        <ChartCard title="Stock Movement" subtitle="Items sold this week">
          <View style={{ alignItems: "center" }}>
            <BarChart
              data={movementData}
              width={screenWidth - 80}
              height={180}
              barWidth={28}
              spacing={20}
              roundedTop
              hideRules
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              noOfSections={4}
              maxValue={80}
              labelWidth={30}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
              isAnimated
            />
          </View>
        </ChartCard>

        {/* Low Stock List */}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Low Stock Items
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/inventory")}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>View All</Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {data.lowStockItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: index < data.lowStockItems.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: item.current <= 2
                    ? (isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)")
                    : (isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.1)"),
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <MaterialIcons
                  name="inventory-2"
                  size={20}
                  color={item.current <= 2 ? colors.error : colors.warning}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.sku}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: item.current <= 2 ? colors.error : colors.warning,
                  }}
                >
                  {item.current}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Reorder: {item.reorder}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => router.push("/purchase-orders/new")}
            style={{
              marginTop: 16,
              height: 44,
              borderRadius: 10,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0 : 0.2,
              shadowRadius: 8,
              elevation: 2,
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="add-shopping-cart" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              Create Purchase Order
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

