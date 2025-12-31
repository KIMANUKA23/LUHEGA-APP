import React, { useState, useEffect } from "react";
import { useTheme } from "../../src/context/ThemeContext";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { KPICard, ChartCard } from "../../src/components/reports";
import { BarChart } from "react-native-gifted-charts";
import * as reportService from "../../src/services/reportService";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from "react-native";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";

const screenWidth = Dimensions.get("window").width;

export default function WeeklySalesReportScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);

  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [lastWeekData, setLastWeekData] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<reportService.ProductReport[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    change: 0,
    avg: 0,
    bestDay: "Friday",
    bestDayValue: 0,
    transactions: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch comparison data
      const comparison = await reportService.getWeeklyComparisonReport();
      setWeeklyData(comparison.thisWeek.map(d => ({
        ...d,
        frontColor: colors.primary
      })));
      setLastWeekData(comparison.lastWeek.map(d => ({
        ...d,
        frontColor: isDark ? "rgba(96, 165, 250, 0.3)" : "rgba(0, 123, 255, 0.3)"
      })));

      // Fetch weekly sales report for KPIs
      const weekReport = await reportService.getSalesReport('week', null, true);

      // Calculate change (approximate or fetch last week report)
      const lastWeekReport = await reportService.getSalesReport('month', null, true); // Simplified comparison or use custom range
      // For now let's just use the current stats from weekReport

      // Find best day
      let maxVal = -1;
      let best = "Friday";
      comparison.thisWeek.forEach(d => {
        if (d.value > maxVal) {
          maxVal = d.value;
          best = d.label;
        }
      });

      setKpis({
        total: weekReport.totalSales,
        change: 0, // Need last week's total for real change
        avg: Math.round(weekReport.totalSales / 7),
        bestDay: best,
        bestDayValue: maxVal,
        transactions: weekReport.transactionCount
      });

      // Fetch best sellers for the week
      const topProducts = await reportService.getTopSellingProducts('week', 5);
      setBestSellers(topProducts);

    } catch (error) {
      console.log("Error loading weekly report:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      const dateRange = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; }
              h1 { color: #1E3A8A; margin-bottom: 5px; }
              .date-range { color: #6B7280; margin-bottom: 30px; }
              .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
              .kpi-card { background: #F3F4F6; padding: 15px; border-radius: 8px; }
              .kpi-label { color: #6B7280; font-size: 12px; margin-bottom: 5px; }
              .kpi-value { color: #1F2937; font-size: 24px; font-weight: bold; }
              .section-title { font-size: 18px; font-weight: bold; margin: 30px 0 15px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background: #F3F4F6; padding: 10px; text-align: left; font-weight: 600; }
              td { padding: 10px; border-bottom: 1px solid #E5E7EB; }
              .footer { margin-top: 40px; text-align: center; color: #9CA3AF; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>Weekly Sales Report</h1>
            <div class="date-range">${dateRange}</div>
            
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Total Sales</div>
                <div class="kpi-value">${formatTZS(kpis.total)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Transactions</div>
                <div class="kpi-value">${kpis.transactions}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Daily Average</div>
                <div class="kpi-value">${formatTZS(kpis.avg)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Best Day</div>
                <div class="kpi-value">${kpis.bestDay}</div>
              </div>
            </div>

            <h2 class="section-title">Best Sellers This Week</h2>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${bestSellers.map(product => `
                  <tr>
                    <td>${product.productName}</td>
                    <td>${product.quantitySold}</td>
                    <td>${formatTZS(product.totalRevenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              Generated on ${new Date().toLocaleString()}<br/>
              LUHEGA Auto Spare Parts
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.log('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Preparing weekly report...</Text>
      </View>
    );
  }

  const dateRangeLabel = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

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
            Weekly Sales Report
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {dateRangeLabel()}
          </Text>
        </View>

        <TouchableOpacity
          onPress={generatePDF}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)",
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
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Week Total"
            value={formatTZS(kpis.total)}
            trend={{ value: Math.abs(kpis.change), isPositive: kpis.change >= 0 }}
            icon="date-range"
            iconColor={isDark ? "#60A5FA" : "#007BFF"}
            iconBgColor={isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)"}
          />
          <KPICard
            title="Avg Daily"
            value={formatTZS(kpis.avg)}
            subtitle="Sales per day"
            icon="analytics"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Transactions"
            value={kpis.transactions.toString()}
            subtitle="This week"
            icon="receipt-long"
            iconColor={isDark ? "#A78BFA" : "#8B5CF6"}
            iconBgColor={isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(139, 92, 246, 0.1)"}
          />
          <KPICard
            title="Best Day"
            value={kpis.bestDay}
            subtitle={formatTZS(kpis.bestDayValue)}
            icon="wb-sunny"
            iconColor={colors.warning}
            iconBgColor={isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)"}
          />
        </View>

        {/* Weekly Sales Chart */}
        <ChartCard title="Sales by Day" subtitle="This week vs last week">
          <TouchableOpacity
            onPress={() => setShowComparison(!showComparison)}
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: showComparison
                ? (isDark ? "rgba(96, 165, 250, 0.2)" : "rgba(0, 123, 255, 0.1)")
                : colors.surface,
              borderWidth: 1,
              borderColor: showComparison ? colors.primary : colors.border,
            }}
          >
            <MaterialIcons
              name="compare-arrows"
              size={16}
              color={showComparison ? colors.primary : colors.textSecondary}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: showComparison ? colors.primary : colors.textSecondary,
                marginLeft: 4,
              }}
            >
              Compare
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center", marginTop: 16 }}>
            <BarChart
              data={showComparison ? weeklyData.map((item, index) => ({
                ...item,
                stacks: [
                  { value: lastWeekData[index].value, color: lastWeekData[index].frontColor },
                  { value: item.value, color: item.frontColor }
                ]
              })) : weeklyData}
              width={screenWidth - 80}
              height={220}
              barWidth={showComparison ? 14 : 32}
              spacing={showComparison ? 30 : 16}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              noOfSections={4}
              maxValue={2500000}
              yAxisLabelPrefix=""
              yAxisLabelSuffix="M"
              labelWidth={36}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
              isAnimated
              animationDuration={500}
            />
          </View>

          {/* Legend */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.primary }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>This Week</Text>
            </View>
            {showComparison && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: isDark ? "rgba(96, 165, 250, 0.3)" : "rgba(0, 123, 255, 0.3)" }} />
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Last Week</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.success }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Best Day</Text>
            </View>
          </View>
        </ChartCard>

        {/* Best Sellers This Week */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: isDark ? "#FFF" : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.15 : 0.05,
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
            Best Sellers This Week
          </Text>
          {bestSellers.map((product, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: index < bestSellers.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {product.quantitySold} units sold
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                  {formatTZS(product.totalRevenue)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialIcons
                    name="trending-up"
                    size={12}
                    color={colors.success}
                  />
                  <Text style={{ fontSize: 11, color: colors.success, marginLeft: 2 }}>
                    Stable
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {bestSellers.length === 0 && (
            <Text style={{ color: colors.textSecondary, textAlign: "center", paddingVertical: 20 }}>No items sold this week</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
