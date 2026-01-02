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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { KPICard, ChartCard } from "../../src/components/reports";
import { BarChart } from "react-native-gifted-charts";
import * as reportService from "../../src/services/reportService";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";
import { generateReportPDF, ReportData } from "../../src/utils/reportGenerator";

const screenWidth = Dimensions.get("window").width;

export default function YearlySalesReportScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [loading, setLoading] = useState(true);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [bestMonths, setBestMonths] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<reportService.ProductReport[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    change: 0,
    avg: 0,
    transactions: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();

      // Fetch performance breakdown
      const performance = await reportService.getYearlyPerformanceReport(year);

      // Scale for thousands (K) - more appropriate for small business revenue
      setYearlyData(performance.map(d => ({
        ...d,
        value: d.value / 1000,
        frontColor: d.label === new Date().toLocaleString('default', { month: 'short' }) ? colors.warning : colors.primary
      })));

      // Fetch yearly sales report for KPIs
      const report = await reportService.getSalesReport('year', null, true);

      setKpis({
        total: report.totalSales,
        change: 0, // Need last year's total
        avg: Math.round(report.totalSales / 12),
        transactions: report.transactionCount
      });

      // Best months
      const sortedMonths = [...performance].sort((a, b) => b.value - a.value).slice(0, 3);
      setBestMonths(sortedMonths.map((m, idx) => ({
        month: m.label,
        revenue: m.value,
        transactions: 0, // Need better breakdown for this
        growth: 0
      })));

      // Top products of the year
      const products = await reportService.getTopSellingProducts('year', 5);
      setTopProducts(products);

    } catch (error) {
      console.log("Error loading yearly report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const reportData: ReportData = {
        title: 'Yearly Sales Report',
        subtitle: `Performance Review - ${new Date().getFullYear()}`,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric' }),
        kpis: [
          { label: "Total Revenue", value: formatTZS(kpis.total) },
          { label: "Transactions", value: kpis.transactions.toString() },
          { label: "Monthly Avg", value: formatTZS(kpis.avg) },
        ],
        sections: [
          {
            title: 'Top Products of the Year',
            columns: ['Product', 'Units Sold', 'Revenue'],
            rows: topProducts.map(p => [
              p.productName,
              p.quantitySold.toString(),
              formatTZS(p.totalRevenue)
            ])
          },
          {
            title: 'Performance by Month',
            columns: ['Month', 'Revenue (k)'],
            rows: yearlyData.map(d => [
              d.label,
              d.value.toFixed(0) + 'k'
            ])
          }
        ]
      };

      await generateReportPDF(reportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report PDF');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Assembling yearly analytics...</Text>
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
            Yearly Sales Report
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            Year {new Date().getFullYear()}
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
          <MaterialIcons name="download" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Annual Revenue Highlight */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 20,
            padding: 24,
            alignItems: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Annual Revenue</Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: "700",
              color: "#FFFFFF",
              fontFamily: "Poppins_700Bold",
              marginTop: 4,
            }}
          >
            {formatTZS(kpis.total)}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 9999,
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
          >
            <MaterialIcons name="trending-up" size={16} color="#FFFFFF" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF", marginLeft: 4 }}>
              +{Math.round(kpis.change)}% vs last year
            </Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Monthly Avg"
            value={formatTZS(kpis.avg)}
            subtitle="Per month"
            icon="calendar-today"
            iconColor={isDark ? "#A78BFA" : "#8B5CF6"}
            iconBgColor={isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(139, 92, 246, 0.1)"}
          />
          <KPICard
            title="Transactions"
            value={kpis.transactions.toLocaleString()}
            subtitle="Year total"
            icon="receipt-long"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"}
          />
        </View>

        {/* 12-Month Chart */}
        <ChartCard title="Monthly Revenue" subtitle="Revenue in thousands (TZS)">
          <View style={{ alignItems: "center" }}>
            <BarChart
              data={yearlyData}
              width={screenWidth - 64}
              height={200}
              barWidth={18}
              spacing={8}
              roundedTop
              hideRules
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
              noOfSections={4}
              maxValue={Math.max(...yearlyData.map(d => d.value), 1000) * 1.2}
              yAxisLabelSuffix="K"
              labelWidth={24}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 8 }}
              isAnimated
              animationDuration={500}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.success }} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Best Month</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.warning }} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Current</Text>
            </View>
          </View>
        </ChartCard>

        {/* Best Months */}
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
            Best Performing Months
          </Text>
          {bestMonths.map((m, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: index < bestMonths.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: index === 0 ? colors.warning + "20" : index === 1 ? colors.border : colors.warning + "40",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: index === 0 ? colors.warning : index === 1 ? colors.textSecondary : colors.warning,
                  }}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  {m.month}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {(m.transactions || 0)} transactions
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
                  {formatTZS(m.revenue * 1000)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.success }}>+{m.growth}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Top Products of the Year */}
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
            Top Products of the Year
          </Text>
          {topProducts.map((product, index) => (
            <View
              key={index}
              style={{
                paddingVertical: 10,
                borderBottomWidth: index < topProducts.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                  {index + 1}. {product.productName}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
                  {formatTZS(product.totalRevenue)}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {product.quantitySold.toLocaleString()} units sold
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
