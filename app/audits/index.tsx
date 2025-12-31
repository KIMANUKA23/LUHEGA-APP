// Audits List Screen - match existing style
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as auditService from "../../src/services/auditService";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { Alert } from "react-native";

type Audit = {
  audit_id: string;
  part_id: string | null;
  part_name?: string;
  physical_count: number;
  system_count: number;
  adjustment: number;
  reason: string | null;
  performed_by: string | null;
  audit_date: string;
  status: "completed" | "in_progress" | "pending";
};

export default function AuditsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [activeFilter, setActiveFilter] = useState("all");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const auditRecords = await auditService.getAllAudits(user?.id || null, user?.role === 'admin');

      // Show each audit as individual item (like purchase orders)
      setAudits(auditRecords.reverse());
    } catch (error) {
      console.log("Error loading audits:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAudits();
    }, [])
  );

  const filters = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "in_progress", label: "In Progress" },
  ];

  const filteredAudits = useMemo(() => {
    if (activeFilter === "all") return audits;
    return audits.filter((a) => a.status === activeFilter);
  }, [activeFilter, audits]);

  const getStatusColor = (status: Audit["status"]) => {
    switch (status) {
      case "completed": return { bg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)", text: isDark ? "#34D399" : "#047857" };
      case "in_progress": return { bg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)", text: isDark ? "#FBBF24" : "#B45309" };
      case "pending": return { bg: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(107, 114, 128, 0.15)", text: isDark ? "#9CA3AF" : "#4B5563" };
    }
  };

  const handleCompleteAudit = async (auditId: string) => {
    Alert.alert(
      "Complete Audit",
      "Are you sure you want to complete this audit? This will apply all stock adjustments.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Complete",
          style: "default",
          onPress: async () => {
            try {
              const success = await auditService.completeAudit(auditId);
              if (success) {
                Alert.alert("Success", "Audit completed successfully!");
                loadAudits(); // Refresh the list
              } else {
                Alert.alert("Error", "Failed to complete audit");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to complete audit");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading audits...</Text>
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
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Inventory Audits
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            alignItems: 'center',
            gap: 8,
            height: '100%'
          }}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={{
                  height: 38,
                  paddingHorizontal: 18,
                  borderRadius: 9999,
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? "700" : "600",
                    color: isActive ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredAudits.map((audit) => {
          const statusStyle = getStatusColor(audit.status);
          const auditDate = new Date(audit.audit_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });

          return (
            <TouchableOpacity
              key={audit.audit_id}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.3 : 0.08,
                shadowRadius: 8,
                elevation: 3,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 12,
              }}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                      fontFamily: "Poppins_700Bold",
                      marginBottom: 4,
                    }}
                  >
                    Part: {audit.part_id || 'Unknown'}
                  </Text>
                  <Text style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: 6 }}>
                    Physical: {audit.physical_count} | System: {audit.system_count}
                  </Text>
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 9999,
                      backgroundColor: statusStyle.bg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: statusStyle.text,
                      }}
                    >
                      {audit.status === "completed" ? "Completed" : audit.status === "in_progress" ? "In Progress" : "Pending"}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 4 }}>
                    {audit.adjustment > 0 ? "+" : ""}{audit.adjustment}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{auditDate}</Text>
                  {audit.status === "in_progress" && (
                    <TouchableOpacity
                      onPress={() => handleCompleteAudit(audit.audit_id)}
                      style={{
                        backgroundColor: colors.success,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        marginTop: 6,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
                        Complete
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => router.push("/audits/new")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 90,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.5 : 0.3,
          shadowRadius: 12,
          elevation: 5,
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}


