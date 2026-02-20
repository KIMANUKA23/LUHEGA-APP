// Sync Status Indicator Component
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useApp } from "../context/AppContext";

export function SyncStatusIndicator() {
  // Logic is kept active for hooks, but UI is silenced as requested
  useNetworkStatus();
  useApp();

  return null;
}

