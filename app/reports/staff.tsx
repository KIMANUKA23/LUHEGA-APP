// Staff Performance Report - Sales per staff, ranking, revenue per employee
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

export default function StaffPerformanceScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [activeFilter, setActiveFilter] = useState<reportService.ReportPeriod>("month");
  const [loading, setLoading] = useState(true);
  const [staffRankings, setStaffRankings] = useState<reportService.StaffPerformance[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    revenue: 0,
    avgPerStaff: 0,
    transactions: 0
  });

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await reportService.getStaffPerformanceReport(activeFilter);
      setStaffRankings(data);

      // Prepare chart data
      const chart = data.slice(0, 5).map((s, idx) => ({
        value: s.revenue / 1000000, // Show in millions
        label: s.name.split(' ')[0], // First name for label
        frontColor: idx === 4 ? colors.warning : colors.primary
      }));
      setChartData(chart);

      const totalRevenue = data.reduce((sum, s) => sum + s.revenue, 0);
      setTotals({
        revenue: totalRevenue,
        avgPerStaff: data.length > 0 ? Math.round(totalRevenue / data.length) : 0,
        transactions: data.reduce((sum, s) => sum + s.transactions, 0)
      });
    } catch (error) {
      console.log("Error loading staff performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const reportData: ReportData = {
        title: 'Staff Performance Report',
        subtitle: `Period: ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        kpis: [
          { label: "Total Revenue", value: formatTZS(totals.revenue) },
          { label: "Avg Per Staff", value: formatTZS(totals.avgPerStaff) },
          { label: "Total Transactions", value: totals.transactions.toString() },
          { label: "Staff Count", value: staffRankings.length.toString() },
        ],
        sections: [
          {
            title: 'Staff Rankings',
            columns: ['Staff Name', 'Sales Count', 'Revenue'],
            rows: staffRankings.map(s => [
              s.name,
              s.transactions.toString(),
              formatTZS(s.revenue)
            ])
          }
        ]
      };

      await generateReportPDF(reportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report PDF');
    }
  };

  const metrics = [
    { label: "Average Transaction", value: formatTZS(totals.transactions > 0 ? totals.revenue / totals.transactions : 0), icon: "receipt" },
    { label: "Staff Count", value: staffRankings.length.toString(), icon: "people" },
    { label: "Total Transactions", value: totals.transactions.toLocaleString(), icon: "shopping-cart" },
    { label: "Top Performer", value: staffRankings[0]?.name || "N/A", icon: "emoji-events" },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Analyzing team performance...</Text>
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
          Staff Performance
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
        {/* KPI Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Team Revenue"
            value={formatTZS(totals.revenue)}
            trend={{ value: 0, isPositive: true }}
            icon="people"
            iconColor={isDark ? "#60A5FA" : "#007BFF"}
            iconBgColor={isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(0, 123, 255, 0.1)"}
          />
          <KPICard
            title="Avg per Staff"
            value={formatTZS(totals.avgPerStaff)}
            subtitle="This period"
            icon="person"
            iconColor={isDark ? "#A78BFA" : "#8B5CF6"}
            iconBgColor={isDark ? "rgba(167, 139, 250, 0.1)" : "rgba(139, 92, 246, 0.1)"}
          />
        </View>

        {/* Performance Chart */}
        <ChartCard title="Revenue by Staff" subtitle="This month (in millions TZS)">
          <View style={{ alignItems: "center" }}>
            <BarChart
              data={chartData}
              width={screenWidth - 80}
              height={200}
              barWidth={40}
              spacing={24}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisThickness={0}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              noOfSections={4}
              maxValue={5}
              yAxisLabelSuffix="M"
              labelWidth={40}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
              isAnimated
              showValuesAsTopLabel
              topLabelTextStyle={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}
            />
          </View>
        </ChartCard>

        {/* Staff Rankings */}
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
            Staff Rankings
          </Text>

          {staffRankings.map((staff, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                borderBottomWidth: index < staffRankings.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              {/* Rank Badge */}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  backgroundColor:
                    staff.rank === 1
                      ? isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7"
                      : staff.rank === 2
                        ? colors.border
                        : staff.rank === 3
                          ? isDark ? "rgba(249, 115, 22, 0.2)" : "#FED7AA"
                          : colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {staff.rank <= 3 ? (
                  <MaterialIcons
                    name="emoji-events"
                    size={16}
                    color={staff.rank === 1 ? colors.warning : staff.rank === 2 ? colors.textSecondary : "#EA580C"}
                  />
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary }}>
                    {staff.rank}
                  </Text>
                )}
              </View>

              {/* Avatar */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? "rgba(96, 165, 250, 0.15)" : "rgba(0, 123, 255, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "700", color: isDark ? "#60A5FA" : colors.primary }}>
                  {staff.avatar}
                </Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                  {staff.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {staff.transactions} sales • Avg: {formatTZS(staff.avgSale)}
                </Text>
              </View>

              {/* Revenue */}
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#60A5FA" : colors.primary }}>
                  {formatTZS(staff.revenue)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialIcons
                    name={staff.change >= 0 ? "trending-up" : "trending-down"}
                    size={12}
                    color={staff.change >= 0 ? colors.success : colors.error}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: staff.change >= 0 ? colors.success : colors.error,
                      marginLeft: 2,
                    }}
                  >
                    {staff.change >= 0 ? "+" : ""}{staff.change}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Performance Metrics */}
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
            Team Metrics
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {metrics.map((metric, index) => (
              <View
                key={index}
                style={{
                  width: "47%",
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F8FAFC",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <MaterialIcons name={metric.icon as any} size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 6 }}>
                    {metric.label}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Performer Highlight */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(96, 165, 250, 0.15)" : "rgba(0, 123, 255, 0.08)",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
            }}
          >
            <MaterialIcons name="emoji-events" size={28} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Top Performer</Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 2 }}>
              {staffRankings[0]?.name || "N/A"}
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? "#60A5FA" : colors.primary, marginTop: 2 }}>
              {formatTZS(staffRankings[0]?.revenue || 0)} in revenue
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: colors.success,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>RANK #1</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

