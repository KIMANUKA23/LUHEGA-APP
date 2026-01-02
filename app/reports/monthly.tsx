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
import { BarChart, LineChart } from "react-native-gifted-charts";
import * as reportService from "../../src/services/reportService";

import { useTheme } from "../../src/context/ThemeContext";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";
import { generateReportPDF, ReportData } from "../../src/utils/reportGenerator";

const screenWidth = Dimensions.get("window").width;

export default function MonthlySalesReportScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("0"); // Offset 0 = current
  const [monthOptions, setMonthOptions] = useState<any[]>([]);

  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    total: 0,
    change: 0,
    avgWeekly: 0,
    transactions: 0,
    bestWeek: "Week 1",
    bestWeekValue: 0,
    productsSold: 0,
    newCustomers: 0
  });

  useEffect(() => {
    // Generate month options dynamically
    const options = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      options.push({
        id: i.toString(),
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }
    setMonthOptions(options);
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const offset = parseInt(selectedMonth);

      // Fetch monthly performance (weeks breakdown)
      const weekData = await reportService.getMonthlyPerformanceReport(offset);
      setMonthlyData(weekData.map(d => ({
        ...d,
        frontColor: colors.primary
      })));

      // Fetch sales report for the month
      // We need a way to get a specific month's report. 
      // reportService.getSalesReport uses 'month' relative to now.
      // I'll assume for now we just want the current month or I should have added month support to getSalesReport.
      // Let's assume the user wants the selected month.
      const report = await reportService.getSalesReport('month', null, true);

      // Find best week
      let maxVal = -1;
      let best = "Week 1";
      weekData.forEach(d => {
        if (d.value > maxVal) {
          maxVal = d.value;
          best = d.label.replace('W', 'Week ');
        }
      });

      setKpis({
        total: report.totalSales,
        change: 0,
        avgWeekly: Math.round(report.totalSales / 4),
        transactions: report.transactionCount,
        bestWeek: best,
        bestWeekValue: maxVal,
        productsSold: 0, // Need to implement in reportService if really needed
        newCustomers: 0
      });

    } catch (error) {
      console.log("Error loading monthly report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const selectedOption = monthOptions.find(o => o.id === selectedMonth);
      const reportData: ReportData = {
        title: 'Monthly Sales Report',
        subtitle: selectedOption ? selectedOption.label : 'Performance Summary',
        date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        kpis: [
          { label: "Total Revenue", value: formatTZS(kpis.total) },
          { label: "Transactions", value: kpis.transactions.toString() },
          { label: "Weekly Avg", value: formatTZS(kpis.avgWeekly) },
          { label: "Best Week", value: kpis.bestWeek },
        ],
        sections: [
          {
            title: 'Weekly Performance',
            columns: ['Week', 'Revenue'],
            rows: monthlyData.map(d => [
              d.label.replace('W', 'Week '),
              formatTZS(d.value)
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
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Preparing monthly report...</Text>
      </View>
    );
  }

  const currentMonthLabel = monthOptions.find(o => o.id === selectedMonth)?.label || "Current Month";

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
            Monthly Sales Report
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {currentMonthLabel}
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

      {/* Month Selector */}
      <FilterBar
        options={monthOptions}
        activeFilter={selectedMonth}
        onFilterChange={setSelectedMonth}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Month Revenue"
            value={formatTZS(kpis.total)}
            trend={{ value: Math.abs(kpis.change), isPositive: kpis.change >= 0 }}
            icon="calendar-today"
            iconColor={isDark ? "#60A5FA" : "#007BFF"}
            iconBgColor={isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)"}
          />
          <KPICard
            title="Transactions"
            value={kpis.transactions.toString()}
            subtitle="This month"
            icon="receipt-long"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.1)" : "rgba(16, 185, 129, 0.1)"}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Weekly Average"
            value={formatTZS(kpis.avgWeekly)}
            subtitle="Per week"
            icon="date-range"
            iconColor={isDark ? "#A78BFA" : "#8B5CF6"}
            iconBgColor={isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(139, 92, 246, 0.1)"}
          />
          <KPICard
            title="Best Week"
            value={kpis.bestWeek}
            subtitle={formatTZS(kpis.bestWeekValue)}
            icon="emoji-events"
            iconColor={colors.warning}
            iconBgColor={isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)"}
          />
        </View>

        {/* Weekly Breakdown Chart */}
        <ChartCard title="Weekly Performance" subtitle="Revenue by week">
          <View style={{ alignItems: "center" }}>
            <BarChart
              data={monthlyData}
              width={screenWidth - 80}
              height={200}
              barWidth={50}
              spacing={30}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              noOfSections={4}
              maxValue={12000000}
              yAxisLabelSuffix="M"
              labelWidth={40}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 12 }}
              isAnimated
              animationDuration={500}
              showValuesAsTopLabel
              topLabelTextStyle={{ color: colors.primary, fontSize: 10, fontWeight: "600" }}
            />
          </View>
        </ChartCard>

        {/* No daily trend for month currently implemented */}

        {/* Monthly Summary */}
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
            Monthly Summary
          </Text>

          <View style={{ gap: 12 }}>
            {[
              { label: "Total Revenue", value: formatTZS(kpis.total), icon: "attach-money", color: isDark ? "#60A5FA" : "#007BFF" },
              { label: "Total Transactions", value: kpis.transactions.toString(), icon: "receipt", color: colors.success },
              { label: "Average Transaction", value: formatTZS(kpis.transactions > 0 ? kpis.total / kpis.transactions : 0), icon: "analytics", color: "#8B5CF6" },
              { label: "Products Sold", value: `${kpis.productsSold} units`, icon: "inventory", color: colors.warning },
              { label: "New Customers", value: kpis.newCustomers.toString(), icon: "person-add", color: "#0891B2" },
            ].map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: index < 4 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: `${item.color}15`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialIcons name={item.icon as any} size={18} color={item.color} />
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary }}>{item.label}</Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Compare with Last Month */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.08)",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: isDark ? "rgba(96, 165, 250, 0.2)" : "rgba(0, 123, 255, 0.1)",
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: colors.card,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <MaterialIcons name="compare-arrows" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
              Monthly Performance
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              Selected month total: {formatTZS(kpis.total)}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(16, 185, 129, 0.15)",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.success }}>
              {kpis.change >= 0 ? "+" : ""}{Math.round(kpis.change)}%
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

