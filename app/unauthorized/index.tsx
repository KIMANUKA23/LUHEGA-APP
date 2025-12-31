// Unauthorized Spares List Screen - match existing style
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
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as unauthorizedService from "../../src/services/unauthorizedService";
import * as userService from "../../src/services/userService";
import * as inventoryService from "../../src/services/inventoryService";
import { useTheme } from "../../src/context/ThemeContext";

type IncidentStatus = "open" | "in_progress" | "resolved";

type Incident = {
  id: string;
  title: string;
  description: string;
  reportedBy: string;
  date: string;
  status: IncidentStatus;
  partName?: string;
};

// Will be loaded from database

const filters = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In Progress" },
  { id: "resolved", label: "Resolved" },
];

export default function UnauthorizedSparesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [activeFilter, setActiveFilter] = useState("all");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const dbIncidents = await unauthorizedService.getUnauthorizedSpares();
      const users = await userService.getUsers();
      const userMap = new Map(users.map(u => [u.id, u.name]));

      // Fetch product names
      const incidentsWithDetails = await Promise.all(
        dbIncidents.map(async (incident) => {
          let partName: string | undefined;
          if (incident.part_id) {
            const product = await inventoryService.getProduct(incident.part_id);
            partName = product?.name;
          }

          return {
            id: incident.incident_id,
            title: incident.description.length > 50
              ? incident.description.substring(0, 50) + "..."
              : incident.description,
            description: incident.description,
            reportedBy: incident.reported_by ? userMap.get(incident.reported_by) || "Unknown" : "Unknown",
            date: new Date(incident.date_reported).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            status: incident.status as IncidentStatus,
            partName,
          };
        })
      );

      setIncidents(incidentsWithDetails);
    } catch (error) {
      console.log("Error loading incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const filteredIncidents = useMemo(() => {
    if (activeFilter === "all") return incidents;
    return incidents.filter((i) => i.status === activeFilter);
  }, [activeFilter, incidents]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading incidents...</Text>
      </View>
    );
  }

  const getStatusStyle = (status: IncidentStatus) => {
    switch (status) {
      case "open": return { bg: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)", text: colors.error, label: "Open" };
      case "in_progress": return { bg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)", text: colors.warning, label: "In Progress" };
      case "resolved": return { bg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)", text: colors.success, label: "Resolved" };
    }
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
          backgroundColor: colors.background,
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
          Unauthorized Spares
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <View style={{ height: 60 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: isActive
                    ? (isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(0, 123, 255, 0.16)")
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isActive ? colors.primary : colors.text,
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
        {filteredIncidents.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <MaterialIcons name="verified" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No incidents found
            </Text>
          </View>
        ) : (
          filteredIncidents.map((incident) => {
            const statusStyle = getStatusStyle(incident.status);
            return (
              <TouchableOpacity
                key={incident.id}
                onPress={() => router.push(`/unauthorized/${incident.id}`)}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: incident.status === "open" ? colors.error : colors.border,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 10,
                  elevation: 3,
                }}
                activeOpacity={0.8}
              >
                {/* Header */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.text,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      {incident.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                      {incident.id} • {incident.date}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 9999,
                      backgroundColor: statusStyle.bg,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: statusStyle.text }}>
                      {statusStyle.label}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginTop: 12,
                    lineHeight: 20,
                  }}
                  numberOfLines={2}
                >
                  {incident.description}
                </Text>

                {/* Footer */}
                <View style={{ flexDirection: "row", marginTop: 12, gap: 16 }}>
                  {incident.partName && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MaterialIcons name="inventory-2" size={16} color={colors.textSecondary} />
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{incident.partName}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <MaterialIcons name="person" size={16} color={colors.textSecondary} />
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>{incident.reportedBy}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => router.push("/unauthorized/report")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 90,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.error,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 5,
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="report" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}


