// Audit Detail Screen - match existing style
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

type AuditItem = {
  id: string;
  name: string;
  sku: string;
  systemCount: number;
  physicalCount: number;
  adjustment: number;
};

const auditData = {
  id: "AUD-001",
  date: "Dec 1, 2024",
  performedBy: "John Doe",
  status: "completed",
  notes: "Minor discrepancies found in brake pads and spark plugs. Likely due to unrecorded sales.",
  items: [
    { id: "1", name: "Oil Filter A3", sku: "SKU-001", systemCount: 15, physicalCount: 15, adjustment: 0 },
    { id: "2", name: "Brake Pad Set", sku: "SKU-002", systemCount: 10, physicalCount: 8, adjustment: -2 },
    { id: "3", name: "Spark Plug NGK", sku: "SKU-003", systemCount: 25, physicalCount: 24, adjustment: -1 },
    { id: "4", name: "Air Filter", sku: "SKU-004", systemCount: 22, physicalCount: 22, adjustment: 0 },
    { id: "5", name: "Battery 12V", sku: "SKU-005", systemCount: 5, physicalCount: 5, adjustment: 0 },
  ] as AuditItem[],
};

export default function AuditDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const audit = auditData; // In real app, fetch by id
  const totalDiscrepancies = audit.items.filter(item => item.adjustment !== 0).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ExpoStatusBar style="dark" backgroundColor="#F8F9FA" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 12,
          backgroundColor: "rgba(248, 249, 250, 0.9)",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(226, 232, 240, 0.8)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
            <MaterialIcons name="arrow-back" size={24} color="#1C1B1F" />
          </TouchableOpacity>
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#111827",
                fontFamily: "Poppins_700Bold",
              }}
            >
              Audit Details
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {audit.id}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {}}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="share" size={22} color="#007BFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E0E2E6",
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Date</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", marginTop: 2 }}>
                {audit.date}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Performed By</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827", marginTop: 2 }}>
                {audit.performedBy}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "#F8FAFC",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#007BFF" }}>
                {audit.items.length}
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Items Audited</Text>
            </View>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: totalDiscrepancies > 0 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: totalDiscrepancies > 0 ? "#DC2626" : "#16A34A",
                }}
              >
                {totalDiscrepancies}
              </Text>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>Discrepancies</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {audit.notes && (
          <View
            style={{
              backgroundColor: "#FFFBEB",
              borderRadius: 12,
              padding: 12,
              flexDirection: "row",
              gap: 12,
            }}
          >
            <MaterialIcons name="notes" size={20} color="#D97706" />
            <Text style={{ flex: 1, fontSize: 14, color: "#92400E", lineHeight: 20 }}>
              {audit.notes}
            </Text>
          </View>
        )}

        {/* Items */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E0E2E6",
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Audit Results
          </Text>

          {audit.items.map((item, index) => (
            <View
              key={item.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: index < audit.items.length - 1 ? 1 : 0,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>{item.sku}</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>System</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    {item.systemCount}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>Physical</Text>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                    {item.physicalCount}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>Adjustment</Text>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: item.adjustment === 0 ? "#16A34A" : "#DC2626",
                    }}
                  >
                    {item.adjustment === 0 ? "✓" : item.adjustment > 0 ? `+${item.adjustment}` : item.adjustment}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}


