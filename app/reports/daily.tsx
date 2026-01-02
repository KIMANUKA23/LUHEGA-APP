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
import { KPICard, ChartCard } from "../../src/components/reports";
import { LineChart } from "react-native-gifted-charts";
import { useTheme } from "../../src/context/ThemeContext";
import * as reportService from "../../src/services/reportService";
import { supabase } from "../../src/lib/supabase";
import { isOnline } from "../../src/services/syncService";
import { getOfflineDB } from "../../src/lib/database";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";
import { generateReportPDF, ReportData } from "../../src/utils/reportGenerator";

const screenWidth = Dimensions.get("window").width;

// Hourly sales data for today
const hourlyData = [
  { value: 0, label: "8am" },
  { value: 45000, label: "9am" },
  { value: 120000, label: "10am" },
  { value: 85000, label: "11am" },
  { value: 150000, label: "12pm" },
  { value: 95000, label: "1pm" },
  { value: 180000, label: "2pm" },
  { value: 220000, label: "3pm" },
  { value: 175000, label: "4pm" },
  { value: 140000, label: "5pm" },
  { value: 80000, label: "6pm" },
];

export default function DailySalesReportScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [loading, setLoading] = useState(true);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    revenue: 0,
    salesCount: 0,
    avgSale: 0,
    peakHour: "8:00 AM"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      // Fetch hourly data
      const hourly = await reportService.getHourlySales(today);
      setHourlyData(hourly);

      // Fetch KPIs
      const salesReport = await reportService.getSalesReport('day', null, true);

      // Find peak hour
      let maxVal = -1;
      let peak = "8:00 AM";
      hourly.forEach(h => {
        if (h.value > maxVal) {
          maxVal = h.value;
          peak = h.label;
        }
      });

      setKpis({
        revenue: salesReport.totalSales,
        salesCount: salesReport.transactionCount,
        avgSale: Math.round(salesReport.averageTransaction),
        peakHour: peak
      });

      // Fetch top products for today
      const topProductsToday = await reportService.getTopSellingProducts('day', 5);
      setTopProductsToday(topProductsToday);

      // Fetch recent sales for today
      const { start, end } = reportService.getDateRange('day');
      const online = await isOnline();
      let sales: any[] = [];
      if (online) {
        const { data } = await supabase
          .from('sales')
          .select('sale_id, created_at, customer_name, total_amount')
          .gte('sale_date', start)
          .lte('sale_date', end)
          .neq('sale_type', 'pending_debit')
          .order('created_at', { ascending: false })
          .limit(10);
        sales = data || [];
      } else {
        const db = getOfflineDB();
        if (db) {
          sales = await db.getAllAsync<any>(
            "SELECT sale_id, created_at, customer_name, total_amount FROM sales WHERE sale_date >= ? AND sale_date <= ? AND sale_type != 'pending_debit' ORDER BY created_at DESC LIMIT 10",
            [start, end]
          );
        }
      }
      setRecentSales(sales || []);

    } catch (error) {
      console.log("Error loading daily report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const reportData: ReportData = {
        title: 'Daily Sales Report',
        subtitle: 'Performance Summary',
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        kpis: [
          { label: "Revenue", value: formatTZS(kpis.revenue) },
          { label: "Sales Count", value: kpis.salesCount.toString() },
          { label: "Avg Sale", value: formatTZS(kpis.avgSale) },
          { label: "Peak Hour", value: kpis.peakHour },
        ],
        sections: [
          {
            title: 'Recent Sales',
            columns: ['Customer', 'Amount', 'Time'],
            rows: recentSales.map(sale => [
              sale.customer_name || 'Walk-in Customer',
              formatTZS(sale.total_amount),
              new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            ])
          }
        ]
      };

      await generateReportPDF(reportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report PDF');
    }
  };

  const [topProductsToday, setTopProductsToday] = useState<reportService.ProductReport[]>([]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Preparing daily report...</Text>
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

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Daily Sales Report
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

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
          <MaterialIcons name="share" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Today's Revenue"
            value={formatTZS(kpis.revenue)}
            trend={{ value: 0, isPositive: true }}
            icon="attach-money"
            iconColor={isDark ? "#60A5FA" : "#007BFF"}
            iconBgColor={isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)"}
          />
          <KPICard
            title="Sales Count"
            value={kpis.salesCount.toString()}
            trend={{ value: 0, isPositive: true }}
            icon="receipt"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Avg. Sale Value"
            value={formatTZS(kpis.avgSale)}
            subtitle="Per transaction"
            icon="analytics"
            iconColor={isDark ? "#A78BFA" : "#8B5CF6"}
            iconBgColor={isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(139, 92, 246, 0.1)"}
          />
          <KPICard
            title="Peak Hour"
            value={kpis.peakHour}
            subtitle="Highest sales"
            icon="schedule"
            iconColor={colors.warning}
            iconBgColor={isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)"}
          />
        </View>

        {/* Hourly Sales Chart */}
        <ChartCard title="Sales by Hour" subtitle="Today's hourly breakdown">
          <View style={{ alignItems: "center" }}>
            <LineChart
              data={hourlyData.map(d => ({ ...d, value: d.value / 1000 }))}
              width={screenWidth - 80}
              height={200}
              spacing={28}
              initialSpacing={10}
              color={colors.primary}
              thickness={3}
              startFillColor={isDark ? "rgba(96, 165, 250, 0.3)" : "rgba(0, 123, 255, 0.3)"}
              endFillColor={isDark ? "rgba(96, 165, 250, 0.01)" : "rgba(0, 123, 255, 0.01)"}
              startOpacity={0.9}
              endOpacity={0.1}
              areaChart
              hideDataPoints={false}
              dataPointsColor={colors.primary}
              dataPointsRadius={4}
              curved
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={colors.border}
              hideRules
              noOfSections={4}
              maxValue={300} // Values now in thousands
              yAxisLabelPrefix="TZS "
              yAxisLabelSuffix="K"
              isAnimated
              animationDuration={500}
            />
          </View>
        </ChartCard>

        {/* Recent Sales */}
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
              Today's Sales
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/sales/history")}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>View All</Text>
              <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {recentSales.map((sale, index) => (
            <TouchableOpacity
              key={sale.sale_id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: index < recentSales.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <MaterialIcons name="receipt" size={20} color={isDark ? "#60A5FA" : "#007BFF"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {sale.sale_id.substring(0, 8).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {sale.customer_name || "Walk-in"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.success }}>
                  {formatTZS(sale.total_amount)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          {recentSales.length === 0 && (
            <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }}>No sales recorded today</Text>
          )}
        </View>

        {/* Top Products Today */}
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
            Top Products Today
          </Text>
          {topProductsToday.map((product, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: index < topProductsToday.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ width: 24, fontSize: 14, fontWeight: "700", color: colors.textSecondary }}>
                {index + 1}.
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>
                  {product.productName}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{product.quantitySold} sold</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
                {formatTZS(product.totalRevenue)}
              </Text>
            </View>
          ))}
          {topProductsToday.length === 0 && (
            <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }}>No products sold today</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

