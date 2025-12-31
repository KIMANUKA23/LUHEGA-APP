// Sync Status Indicator Component
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useApp } from "../context/AppContext";

export function SyncStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const { syncing, manualSync } = useApp();

  if (!isOnline) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: "#FEF2F2",
          borderRadius: 8,
          gap: 6,
        }}
      >
        <MaterialIcons name="cloud-off" size={16} color="#DC2626" />
        <Text style={{ fontSize: 12, color: "#DC2626", fontWeight: "600" }}>
          Offline
        </Text>
      </View>
    );
  }

  if (syncing) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: "#DBEAFE",
          borderRadius: 8,
          gap: 6,
        }}
      >
        <MaterialIcons name="sync" size={16} color="#2563EB" />
        <Text style={{ fontSize: 12, color: "#2563EB", fontWeight: "600" }}>
          Syncing...
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={manualSync}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#F0FDF4",
        borderRadius: 8,
        gap: 6,
      }}
      activeOpacity={0.7}
    >
      <MaterialIcons name="cloud-done" size={16} color="#16A34A" />
      <Text style={{ fontSize: 12, color: "#16A34A", fontWeight: "600" }}>
        Synced
      </Text>
    </TouchableOpacity>
  );
}

