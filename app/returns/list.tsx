import React, { useMemo, useEffect, useState } from "react";
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
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

type ReturnStatus = "pending" | "approved" | "rejected";

type ReturnListItem = {
  id: string;
  date: string;
  status: ReturnStatus;
  productName: string;
  quantity: number;
};

export default function ReturnsListScreen() {
  const router = useRouter();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const { isAdmin } = useAuth();
  const { getAllReturns, refreshReturns } = useApp();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);

  const loadReturns = async () => {
    setLoading(true);
    try {
      await refreshReturns();
    } catch (e) {
      console.log("Error refreshing returns:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadReturns();
    }, [])
  );

  const returnsList: ReturnListItem[] = useMemo(() => {
    const returns = getAllReturns();
    return returns.map(r => ({
      id: r.id,
      date: new Date(r.dateReturned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: r.status,
      productName: r.productName,
      quantity: r.quantity,
    }));
  }, [getAllReturns, loading]);

  const getStatusStyle = (status: ReturnStatus) => {
    switch (status) {
      case "pending":
        return {
          backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(251, 191, 36, 0.18)",
          textColor: isDark ? colors.warning : "#92400E",
          label: "Pending",
        };
      case "approved":
        return {
          backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.18)",
          textColor: isDark ? colors.success : "#166534",
          label: "Approved",
        };
      case "rejected":
        return {
          backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(248, 113, 113, 0.2)",
          textColor: isDark ? colors.error : "#991B1B",
          label: "Rejected",
        };
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
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 4,
          elevation: 2,
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
          {isAdmin ? "Return Requests" : "My Returns"}
        </Text>

        <TouchableOpacity
          onPress={() => { }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="filter-list" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading returns...</Text>
          </View>
        ) : returnsList.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="inbox" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No returns found
            </Text>
          </View>
        ) : (
          returnsList.map((r) => {
            const status = getStatusStyle(r.status);
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => router.push(`/returns/${r.id}`)}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 18,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.07,
                  shadowRadius: 12,
                  elevation: 3,
                }}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, fontFamily: "Poppins_700Bold" }}>
                      #{r.id}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                      {r.date}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, backgroundColor: status.backgroundColor }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: status.textColor }}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                  {r.quantity}x {r.productName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>View details</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button - New Return */}
      <TouchableOpacity
        onPress={() => router.push("/returns")}
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

