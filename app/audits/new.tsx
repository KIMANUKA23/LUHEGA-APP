// New Audit Screen - match existing style
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as auditService from "../../src/services/auditService";
import * as inventoryService from "../../src/services/inventoryService";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { Alert, ActivityIndicator } from "react-native";

type AuditItem = {
  part_id: string;
  name: string;
  sku: string;
  systemCount: number;
  physicalCount: number | null;
};

export default function NewAuditScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [items, setItems] = useState<AuditItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const products = await inventoryService.getProducts();
      // Show all products for audit
      const auditItems: AuditItem[] = products.map(p => ({
        part_id: p.part_id,
        name: p.name,
        sku: p.sku,
        systemCount: p.quantity_in_stock || 0,
        physicalCount: null,
      }));
      setItems(auditItems);
    } catch (error) {
      console.log("Error loading products:", error);
      Alert.alert("Error", "Failed to load products for audit");
    } finally {
      setLoading(false);
    }
  };

  const updatePhysicalCount = (partId: string, count: string) => {
    setItems(prev => prev.map(item =>
      item.part_id === partId ? { ...item, physicalCount: count ? parseInt(count) : null } : item
    ));
  };

  const getDiscrepancy = (item: AuditItem) => {
    if (item.physicalCount === null) return null;
    return item.physicalCount - item.systemCount;
  };

  const handleSubmit = async () => {
    // Filter items that have physical count entered
    const itemsToSubmit = items.filter(item => item.physicalCount !== null);

    if (itemsToSubmit.length === 0) {
      Alert.alert("Validation Error", "Please enter physical count for at least one item");
      return;
    }

    setSubmitting(true);
    try {
      // Submit each item as a separate audit record
      for (const item of itemsToSubmit) {
        await auditService.createInventoryAudit({
          part_id: item.part_id,
          physical_count: item.physicalCount!,
          system_count: item.systemCount,
          reason: notes.trim() || null,
          performed_by: user?.id || null,
        });
      }

      Alert.alert(
        "Success",
        `Audit submitted successfully for ${itemsToSubmit.length} item(s). Stock has been adjusted.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.log("Error submitting audit:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to submit audit. Please try again."
      );
    } finally {
      setSubmitting(false);
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
          <MaterialIcons name="close" size={24} color={colors.text} />
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
          New Audit
        </Text>

        <View style={{ width: 40 }} />
        {submitting && (
          <ActivityIndicator size="small" color={colors.primary} style={{ position: "absolute", right: 16 }} />
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading products...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Instructions */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              padding: 12,
              backgroundColor: isDark ? "rgba(37, 99, 235, 0.15)" : "rgba(0, 123, 255, 0.08)",
              borderRadius: 12,
              gap: 12,
            }}
          >
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 13, color: isDark ? "#93C5FD" : "#1E40AF", lineHeight: 18 }}>
              Enter the physical count for each item. System will calculate discrepancies automatically.
            </Text>
          </View>

          {/* Items List */}
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
              Items to Audit
            </Text>

            {items.length === 0 ? (
              <Text style={{ textAlign: "center", color: colors.textSecondary, padding: 20 }}>
                No products found. Please add products to inventory first.
              </Text>
            ) : items.map((item, index) => {
              const discrepancy = getDiscrepancy(item);
              return (
                <View
                  key={item.part_id}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: index < items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.sku}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>System</Text>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                        {item.systemCount}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Physical Count</Text>
                      <TextInput
                        style={{
                          height: 44,
                          borderRadius: 8,
                          backgroundColor: colors.surface,
                          borderWidth: 1,
                          borderColor: colors.border,
                          paddingHorizontal: 12,
                          fontSize: 15,
                          color: colors.text,
                          textAlign: "center",
                        }}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="number-pad"
                        value={item.physicalCount?.toString() || ""}
                        onChangeText={(text) => updatePhysicalCount(item.part_id, text)}
                      />
                    </View>
                    <View style={{ width: 80, alignItems: "center" }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Discrepancy</Text>
                      <View
                        style={{
                          height: 44,
                          width: "100%",
                          borderRadius: 8,
                          backgroundColor: discrepancy === null
                            ? colors.surface
                            : discrepancy === 0
                              ? (isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)")
                              : (isDark ? "rgba(220, 38, 38, 0.2)" : "rgba(239, 68, 68, 0.2)"),
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: discrepancy === null
                              ? colors.textSecondary
                              : discrepancy === 0
                                ? colors.success
                                : colors.error,
                          }}
                        >
                          {discrepancy === null ? "-" : discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Notes */}
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
                marginBottom: 12,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Notes
            </Text>
            <TextInput
              style={{
                height: 100,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
                fontSize: 15,
                color: colors.text,
                textAlignVertical: "top",
              }}
              placeholder="Add any notes about discrepancies..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      )}

      {/* Bottom Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || items.filter(i => i.physicalCount !== null).length === 0}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: submitting || items.filter(i => i.physicalCount !== null).length === 0 ? colors.border : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Submit Audit
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


