// Profit & Loss Report - Revenue, cost, profit comparison chart
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
import { KPICard, ChartCard, FilterBar } from "../../src/components/reports";
import { BarChart } from "react-native-gifted-charts";
import { useTheme } from "../../src/context/ThemeContext";
import * as reportService from "../../src/services/reportService";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";
import { generateReportPDF, ReportData } from "../../src/utils/reportGenerator";

const screenWidth = Dimensions.get("window").width;

export default function ProfitLossScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [activeFilter, setActiveFilter] = useState<reportService.ReportPeriod>("month");
  const [loading, setLoading] = useState(true);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // getMonthlyPLBreakdown is currently hardcoded for last 6 months in service
      // but we could adapt it if needed. For now, we use it as the source of truth.
      const data = await reportService.getMonthlyPLBreakdown();
      setMonthlyBreakdown([...data].reverse()); // Show newest first for the list
    } catch (error) {
      console.log("Error loading P&L data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const reportData: ReportData = {
        title: 'Profit & Loss Report',
        subtitle: 'Financial Performance Summary',
        date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        kpis: [
          { label: "Revenue", value: formatTZS(currentRevenue) },
          { label: "Cost of Goods", value: formatTZS(currentCost) },
          { label: "Gross Profit", value: formatTZS(currentProfit) },
          { label: "Margin", value: `${profitMargin.toFixed(1)}%` },
        ],
        sections: [
          {
            title: 'Monthly Breakdown (Last 6 Months)',
            columns: ['Month', 'Revenue', 'Cost', 'Profit'],
            rows: monthlyBreakdown.map(d => [
              d.month,
              formatTZS(d.revenue),
              formatTZS(d.cost),
              formatTZS(d.profit)
            ])
          }
        ]
      };

      await generateReportPDF(reportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report PDF');
    }
  };

  // Data for chart (oldest to newest)
  const chartData = [...monthlyBreakdown].reverse();

  // Monthly P&L Data - Stacked bar showing revenue vs cost
  const plData = chartData.map(d => ({
    stacks: [
      { value: d.revenue / 1000000, color: colors.primary },
      { value: d.cost / 1000000, color: colors.error },
    ],
    label: d.month.split(' ')[0],
  }));

  // Simple data for profit visualization
  const profitData = chartData.map(d => ({
    value: d.profit / 1000000,
    label: d.month.split(' ')[0],
    frontColor: colors.success,
  }));

  const currentMonth = monthlyBreakdown[0] || { revenue: 0, cost: 0, profit: 0, margin: 0 };
  const lastMonth = monthlyBreakdown[1] || { revenue: 0, cost: 0, profit: 0, margin: 0 };

  const currentRevenue = currentMonth.revenue;
  const currentCost = currentMonth.cost;
  const currentProfit = currentMonth.profit;
  const profitMargin = currentMonth.margin;

  const profitChange = lastMonth.profit > 0
    ? ((currentProfit - lastMonth.profit) / lastMonth.profit) * 100
    : 0;

  const expenseCategories = [
    { category: "Cost of Goods", amount: currentCost, percentage: 100 },
    // Since we only track COGS right now, others are placeholder or 0
    { category: "Other Expenses", amount: 0, percentage: 0 },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Calculating financials...</Text>
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
          Profit & Loss
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
        onFilterChange={(f) => setActiveFilter(f as reportService.ReportPeriod)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Profit Highlight */}
        <View
          style={{
            backgroundColor: colors.success,
            borderRadius: 20,
            padding: 24,
            alignItems: "center",
            shadowColor: colors.success,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 8,
          }}
        >
          <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Net Profit</Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: "700",
              color: "#FFFFFF",
              fontFamily: "Poppins_700Bold",
              marginTop: 4,
            }}
          >
            {formatTZS(currentProfit)}
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
              +{profitChange.toFixed(1)}% vs last month
            </Text>
          </View>
        </View>

        {/* KPI Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Revenue"
            value={formatTZS(currentRevenue)}
            trend={{ value: 7.5, isPositive: true }}
            icon="trending-up"
            iconColor={isDark ? "#60A5FA" : "#007BFF"}
            iconBgColor={isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)"}
          />
          <KPICard
            title="Costs"
            value={formatTZS(currentCost)}
            trend={{ value: 9.4, isPositive: false }}
            icon="trending-down"
            iconColor={colors.error}
            iconBgColor={isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)"}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Profit Margin"
            value={`${profitMargin}%`}
            subtitle="This month"
            icon="pie-chart"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(16, 185, 129, 0.1)"}
          />
          <KPICard
            title="ROI"
            value="57.6%"
            subtitle="Return on investment"
            icon="show-chart"
            iconColor={isDark ? "#A78BFA" : "#8B5CF6"}
            iconBgColor={isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(139, 92, 246, 0.1)"}
          />
        </View>

        {/* Profit Trend Chart */}
        <ChartCard title="Profit Trend" subtitle="Monthly net profit (in millions TZS)">
          <View style={{ alignItems: "center" }}>
            <BarChart
              data={profitData}
              width={screenWidth - 100}
              height={180}
              barWidth={50}
              spacing={40}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              noOfSections={4}
              maxValue={20}
              yAxisLabelSuffix="M"
              labelWidth={40}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 12 }}
              isAnimated
              showValuesAsTopLabel
              topLabelTextStyle={{ color: colors.success, fontSize: 12, fontWeight: "700" }}
            />
          </View>
        </ChartCard>

        {/* Monthly Breakdown */}
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
            Monthly Breakdown
          </Text>

          {monthlyBreakdown.map((month, index) => (
            <View
              key={index}
              style={{
                paddingVertical: 14,
                borderBottomWidth: index < monthlyBreakdown.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 10 }}>
                {month.month}
              </Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? "#60A5FA" : "#007BFF", marginRight: 8 }} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Revenue</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#60A5FA" : "#007BFF" }}>
                    {formatTZS(month.revenue)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.error, marginRight: 8 }} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>Costs</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.error }}>
                    -{formatTZS(month.cost)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.success, marginRight: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>Net Profit</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.success }}>
                      {formatTZS(month.profit)}
                    </Text>
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(16, 185, 129, 0.1)",
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.success }}>
                        {month.margin}%
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Expense Breakdown */}
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
            Expense Breakdown
          </Text>

          {expenseCategories.map((expense, index) => (
            <View key={index} style={{ marginBottom: index < expenseCategories.length - 1 ? 14 : 0 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 14, color: colors.text }}>{expense.category}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {formatTZS(expense.amount)}
                </Text>
              </View>
              {/* Progress Bar */}
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" }}>
                <View
                  style={{
                    width: `${expense.percentage}%`,
                    height: "100%",
                    borderRadius: 4,
                    backgroundColor: index === 0 ? colors.error : isDark ? "#60A5FA" : colors.primary,
                  }}
                />
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                {expense.percentage}% of total expenses
              </Text>
            </View>
          ))}
        </View>

        {/* Financial Summary */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(16, 185, 129, 0.08)",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <MaterialIcons name="insights" size={22} color={colors.success} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: isDark ? colors.success : "#047857",
                marginLeft: 8,
              }}
            >
              Financial Summary
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: isDark ? colors.textSecondary : "#065F46", lineHeight: 22 }}>
            Your profit margin of {profitMargin}% is healthy for an auto parts business.
            Revenue has increased by 7.5% this month while maintaining cost efficiency.
            Continue monitoring cost of goods to maximize profitability.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

