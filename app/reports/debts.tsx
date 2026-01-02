// Debt Analytics - Overdue totals, collection chart, recovered vs pending
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
import { KPICard, ChartCard, FilterBar } from "../../src/components/reports";
import { PieChart, BarChart } from "react-native-gifted-charts";
import * as reportService from "../../src/services/reportService";
import { useSafeBottomPadding } from "../../src/hooks/useSafePadding";
import { generateReportPDF, ReportData } from "../../src/utils/reportGenerator";

const screenWidth = Dimensions.get("window").width;

export default function DebtAnalyticsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { bottomPadding } = useSafeBottomPadding();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [activeFilter, setActiveFilter] = useState<reportService.ReportPeriod>("week");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<reportService.DebtAnalytics | null>(null);

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await reportService.getDebtAnalytics(activeFilter);
      setData(result);
    } catch (error) {
      console.log("Error loading debt analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      const reportData: ReportData = {
        title: 'Debt Analytics Report',
        subtitle: `Period: ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}`,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        kpis: [
          { label: "Overdue Amount", value: formatTZS(data.overdueAmount) },
          { label: "Collected (This Week)", value: formatTZS(data.collectedThisWeek) },
          { label: "Total Outstanding", value: formatTZS(data.totalOutstanding) },
          { label: "Collection Rate", value: `${data.collectionRate}%` },
        ],
        sections: [
          {
            title: 'Overdue Summary',
            columns: ['Customer', 'Amount', 'Days Overdue'],
            rows: data.overdueDebts.map(d => [
              d.customer,
              formatTZS(d.amount),
              d.daysOverdue.toString()
            ])
          },
          {
            title: 'Recent Collections',
            columns: ['Customer', 'Amount', 'Date', 'Method'],
            rows: data.recentCollections.map(c => [
              c.customer,
              formatTZS(c.amount),
              c.date,
              c.method
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
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading debt analytics...</Text>
      </View>
    );
  }

  // Use fallback data for charts if empty
  const collectionData = data.collectionTrend.length > 0 ? data.collectionTrend : [
    { value: 0, label: "Mon", frontColor: colors.success },
    { value: 0, label: "Tue", frontColor: colors.success },
    { value: 0, label: "Wed", frontColor: colors.success },
    { value: 0, label: "Thu", frontColor: colors.success },
    { value: 0, label: "Fri", frontColor: colors.success },
    { value: 0, label: "Sat", frontColor: colors.success },
    { value: 0, label: "Sun", frontColor: colors.border },
  ];

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
          Debt Analytics
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
        {/* Total Outstanding Highlight */}
        <View
          style={{
            backgroundColor: colors.warning,
            borderRadius: 20,
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: colors.warning,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>Total Outstanding</Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: "#FFFFFF",
                fontFamily: "Poppins_700Bold",
                marginTop: 4,
              }}
            >
              {formatTZS(data.totalOutstanding)}
            </Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
              {data.overdueCount} overdue accounts
            </Text>
          </View>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="account-balance-wallet" size={32} color="#FFFFFF" />
          </View>
        </View>

        {/* KPI Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <KPICard
            title="Overdue Amount"
            value={formatTZS(data.overdueAmount)}
            subtitle={`${data.overdueCount} customers`}
            icon="warning"
            iconColor={colors.error}
            iconBgColor={isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)"}
          />
          <KPICard
            title="Collected"
            value={formatTZS(data.collectedThisWeek)}
            subtitle="This week"
            icon="check-circle"
            iconColor={colors.success}
            iconBgColor={isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(16, 185, 129, 0.1)"}
          />
        </View>

        {/* Collection Rate Card */}
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
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Collection Rate</Text>
            <Text style={{ fontSize: 28, fontWeight: "700", color: colors.success, marginTop: 4 }}>
              {data.collectionRate}%
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              Target: 80%
            </Text>
          </View>
          {/* Progress Ring */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 8,
              borderColor: colors.border,
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 8,
                borderColor: colors.success,
                borderTopColor: "transparent",
                borderRightColor: "transparent",
                transform: [{ rotate: "45deg" }],
              }}
            />
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.success }}>
              {data.collectionRate}%
            </Text>
          </View>
        </View>

        {/* Debt Status Donut */}
        <ChartCard title="Debt Status" subtitle="Current distribution">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
            <PieChart
              data={data.debtStatusDistribution}
              donut
              radius={70}
              innerRadius={45}
              innerCircleColor={colors.card}
              centerLabelComponent={() => (
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                    {data.overdueCount}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>Overdue</Text>
                </View>
              )}
            />
            <View style={{ gap: 10 }}>
              {data.debtStatusDistribution.map((item, index) => (
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
                    {item.label}: {item.value}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ChartCard>

        {/* Collection Trend Chart */}
        <ChartCard title="Collection Trend" subtitle="Daily collections this week">
          <View style={{ alignItems: "center" }}>
            <BarChart
              data={collectionData}
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
              maxValue={600000}
              yAxisLabelSuffix="K"
              labelWidth={30}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 11 }}
              isAnimated
            />
          </View>
        </ChartCard>

        {/* Overdue Debts */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.3)",
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <MaterialIcons name="warning" size={20} color={colors.error} />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.error,
                marginLeft: 8,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Overdue Debts
            </Text>
          </View>

          {data.overdueDebts.map((debt, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => router.push(`/debts/${debt.customer.replace(" ", "-")}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth: index < data.overdueDebts.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {debt.customer}
                </Text>
                <Text style={{ fontSize: 12, color: colors.error }}>
                  Since: {debt.dueDate} ({debt.daysOverdue}d overdue)
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.error }}>
                {formatTZS(debt.amount)}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => router.push("/debts")}
            style={{
              marginTop: 12,
              height: 40,
              borderRadius: 8,
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.error }}>
              View All Overdue
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Collections */}
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
            Recent Collections
          </Text>

          {data.recentCollections.map((collection, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: index < data.recentCollections.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  backgroundColor: isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(16, 185, 129, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <MaterialIcons name="check" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {collection.customer}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {collection.date} • {collection.method}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.success }}>
                +{formatTZS(collection.amount)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

