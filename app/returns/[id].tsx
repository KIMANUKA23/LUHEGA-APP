import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

type ReturnItem = {
  name: string;
  quantity: number;
  condition: "good" | "damaged" | "suspected";
  note?: string;
  photos?: string[];
};

type ReturnDetail = {
  id: string;
  saleId: string;
  customer: string;
  requestDate: string;
  reason: string;
  items: ReturnItem[];
  totalRefund: number;
};

export default function ReturnDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isAdmin } = useAuth();
  const { approveReturn, rejectReturn, getReturn, refreshReturns } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [triedRefresh, setTriedRefresh] = useState(false);

  // Get return from context - must have valid ID
  const returnFromContext = id ? getReturn(id) : null;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // If we have it in context, we are good, just stop loading
    if (returnFromContext) {
      setLoading(false);
      return;
    }

    if (triedRefresh) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setTriedRefresh(true);
    refreshReturns()
      .catch((e) => console.log('Error refreshing returns:', e))
      .finally(() => setLoading(false));
  }, [id, returnFromContext, triedRefresh, refreshReturns]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading return details...</Text>
      </View>
    );
  }

  if (!id || !returnFromContext) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <MaterialIcons name="error-outline" size={48} color={colors.textSecondary} />
        <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 8, marginTop: 16 }}>Return not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const detail: ReturnDetail = {
    id: returnFromContext.id,
    saleId: returnFromContext.saleId,
    customer: "Customer", // Would come from sale lookup if needed
    requestDate: new Date(returnFromContext.dateReturned).toLocaleDateString(),
    reason: returnFromContext.reason,
    totalRefund: 0, // Would calculate from items if needed
    items: [{
      name: returnFromContext.productName,
      quantity: returnFromContext.quantity,
      condition: returnFromContext.condition,
    }],
  };

  const isPending = returnFromContext.status === "pending";

  const getConditionStyle = (condition: "good" | "damaged" | "suspected") => {
    switch (condition) {
      case "damaged":
        return {
          label: "Damaged",
          backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.12)",
          color: colors.error,
        };
      case "good":
        return {
          label: "Good",
          backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.12)",
          color: colors.success,
        };
      case "suspected":
        return {
          label: "Suspected Fake",
          backgroundColor: isDark ? "rgba(249, 115, 22, 0.2)" : "rgba(249, 115, 22, 0.12)",
          color: colors.warning,
        };
    }
  };

  const handleApprove = () => {
    if (!id) return;

    Alert.alert(
      "Approve Return",
      "Are you sure you want to approve this return? Stock will be updated if items are in good condition.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            try {
              await approveReturn(id);
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to approve return");
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    if (!id) return;

    Alert.alert(
      "Reject Return",
      "Are you sure you want to reject this return? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await rejectReturn(id);
              router.back();
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to reject return");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
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

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Return Request Details
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>#{detail.id}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.04,
            shadowRadius: 8,
            elevation: 2,
            gap: 12,
          }}
        >
          <SummaryRow label="Original Sale ID" value={`#${detail.saleId}`} accent colors={colors} />
          <SummaryRow label="Customer Name" value={detail.customer} colors={colors} />
          <SummaryRow label="Date of Request" value={detail.requestDate} colors={colors} />

          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Return Reason</Text>
            <Text style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>
              {detail.reason}
            </Text>
          </View>

          <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Estimated Refund</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
              {formatTZS(detail.totalRefund)}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Items to be Returned
          </Text>

          {detail.items.map((item) => {
            const condition = getConditionStyle(item.condition);
            return (
              <View
                key={item.name}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isDark ? 0.3 : 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ padding: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                    {item.name}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                      Quantity: {item.quantity}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 9999,
                        backgroundColor: condition.backgroundColor,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: condition.color,
                        }}
                      >
                        {condition.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.photos && item.photos.length > 0 && (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }}>
                      Uploaded Photos
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {item.photos.map((photo) => (
                        <View
                          key={photo}
                          style={{
                            flex: 1,
                            aspectRatio: 1,
                            borderRadius: 12,
                            overflow: "hidden",
                            backgroundColor: colors.surface,
                          }}
                        >
                          <Image
                            source={{ uri: photo }}
                            resizeMode="cover"
                            style={{ width: "100%", height: "100%" }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {item.note && (
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      padding: 16,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "500", color: colors.text }}>
                      Additional Notes
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                      {item.note}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Actions - Admin Only for Pending Returns */}
      {isAdmin && isPending && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.card,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={handleApprove}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 14,
              backgroundColor: colors.success,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.success,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Approve Return
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReject}
            style={{
              flex: 1,
              height: 52,
              borderRadius: 14,
              backgroundColor: colors.error,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.error,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Reject Return
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Display for Non-Pending Returns */}
      {(!isPending || !isAdmin) && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: 16,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <View
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: returnFromContext?.status === "approved"
                ? (isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)")
                : returnFromContext?.status === "rejected"
                  ? (isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)")
                  : (isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(107, 114, 128, 0.1)"),
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: returnFromContext?.status === "approved"
                  ? colors.success
                  : returnFromContext?.status === "rejected"
                    ? colors.error
                    : colors.textSecondary,
              }}
            >
              Status: {returnFromContext?.status === "approved"
                ? "Approved"
                : returnFromContext?.status === "rejected"
                  ? "Rejected"
                  : "Pending Admin Approval"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  accent,
  colors,
}: {
  label: string;
  value: string;
  accent?: boolean;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: accent ? colors.primary : colors.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
}


