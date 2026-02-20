// Start Return Screen - match existing style
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useApp } from "../../src/context/AppContext";
import * as returnsService from "../../src/services/returnsService";

const returnReasons = [
  { id: "defective", label: "Defective Product", icon: "report-problem" },
  { id: "wrong_item", label: "Wrong Item", icon: "swap-horiz" },
  { id: "not_needed", label: "No Longer Needed", icon: "remove-shopping-cart" },
  { id: "damaged", label: "Damaged on Arrival", icon: "broken-image" },
  { id: "other", label: "Other Reason", icon: "more-horiz" },
];

export default function StartReturnScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { returns, refreshSales, refreshReturns } = useApp();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  // Get saleId from URL params (if navigating from sales list)
  const params = useLocalSearchParams<{ saleId?: string; saleItemId?: string }>();

  const [saleId, setSaleId] = useState(params.saleId || "");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<'good' | 'damaged' | 'suspected'>('good');
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [saleFound, setSaleFound] = useState<{
    id: string;
    date: string;
    items: {
      saleItemId: string;
      productId: string;
      name: string;
      quantity: number;
      price: number;
      returnQty: number;
      returnStatus: string;
    }[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-load sale if saleId is provided in URL params
  useEffect(() => {
    if (params.saleId) {
      handleLookup(params.saleId);
    }
  }, [params.saleId]);

  const handleLookup = async (lookupSaleId?: string) => {
    const idToLookup = (lookupSaleId || saleId).trim();
    if (!idToLookup) return;

    // UUID Validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idToLookup)) {
      Alert.alert("Invalid ID", "Please enter a valid Sale ID (UUID format).");
      return;
    }

    setLoading(true);
    try {
      const { getSale } = await import("../../src/services/salesService");
      const { getProduct } = await import("../../src/services/inventoryService");

      const sale = await getSale(idToLookup);

      if (!sale) {
        Alert.alert("Not Found", "Sale not found. Please check the sale ID.");
        setSaleFound(null);
        return;
      }

      // If saleItemId param exists, filter to only that item
      const targetItemId = params.saleItemId;
      const filteredItems = targetItemId
        ? sale.items.filter(item => item.sale_item_id === targetItemId)
        : sale.items;

      if (targetItemId && filteredItems.length === 0) {
        Alert.alert("Item Not Found", "The requested item was not found in this sale.");
        // Fallback to showing all items? Or return? 
        // Let's show all items if filter fails so user isn't stuck empty
      }

      // Use filtered list or full list if filter found nothing (fail-safe)
      const itemsToProcess = (targetItemId && filteredItems.length > 0) ? filteredItems : sale.items;

      // Fetch product details for each item
      const itemsWithDetails = await Promise.all(
        itemsToProcess.map(async (item) => {
          const product = await getProduct(item.part_id);
          // Auto-set quantity to 1 if we filtered effectively, else 0
          const initialReturnQty = (targetItemId && item.sale_item_id === targetItemId) ? 1 : 0;

          return {
            saleItemId: item.sale_item_id,
            productId: item.part_id,
            name: product?.name || "Unknown Product",
            quantity: item.quantity,
            price: Number(item.unit_price),
            returnQty: initialReturnQty,
            returnStatus: (item as any).return_status || 'none', // Added returnStatus
          };
        })
      );

      setSaleFound({
        id: sale.sale_id,
        date: new Date(sale.sale_date).toLocaleDateString(),
        items: itemsWithDetails,
        total: Number(sale.total_amount),
      });
    } catch (error) {
      console.log("Error looking up sale:", error);
      Alert.alert("Error", "Failed to lookup sale. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!saleFound) {
      Alert.alert("Error", "Please lookup a sale first");
      return;
    }

    if (!selectedReason) {
      Alert.alert("Required Field", "Please select a return reason");
      return;
    }

    // Find items with return quantity > 0
    const itemsToReturn = saleFound.items.filter(item => item.returnQty > 0);

    if (itemsToReturn.length === 0) {
      Alert.alert("Validation Error", "Please specify return quantities for at least one item");
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let errors: string[] = [];

    try {
      // Create return for each item
      for (const item of itemsToReturn) {
        try {
          console.log(`Creating return for item: ${item.name} (Qty: ${item.returnQty})`);
          await returnsService.createReturn({
            sale_item_id: item.saleItemId,
            sale_id: saleFound.id,
            user_id: user?.id || null,
            product_id: item.productId,
            product_name: item.name,
            quantity: item.returnQty,
            reason: returnReasons.find(r => r.id === selectedReason)?.label || selectedReason,
            condition: selectedCondition,
            notes: notes.trim() || null,
          });
          successCount++;
        } catch (err: any) {
          console.log(`Failed to return item ${item.name}:`, err);
          errors.push(`${item.name}: ${err.message || "Unknown error"}`);
        }
      }

      if (successCount > 0) {
        const message = errors.length > 0
          ? `Return submitted for ${successCount} item(s). \n\nFailed: ${errors.join(", ")}`
          : `Return request submitted for ${successCount} item(s). Admin will review it.`;

        // Better UX for Web: Navigate immediately without blocking Alert
        if (Platform.OS === 'web') {
          router.dismissAll();
          router.replace("/(tabs)/returns");
          return;
        }

        Alert.alert(
          "Success",
          message,
          [{
            text: "View Returns", onPress: () => {
              if (router.canDismiss()) {
                router.dismissAll();
              }
              router.replace("/(tabs)/returns");
            }
          }]
        );
      } else {
        Alert.alert("Error", `Failed to submit returns:\n${errors.join("\n")}`);
      }
    } catch (error: any) {
      console.log("Critical error submitting return:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to submit return request. Please try again."
      );
    } finally {
      setSubmitting(false);
      // Refresh data so UI updates immediately
      await Promise.all([refreshSales(), refreshReturns()]);
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
          Process Return
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 120 + insets.bottom,
          gap: 16
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Lookup Sale - Hide if we came from a deep link (saleId param exists) */}
        {!params.saleId && (
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
              Find Original Sale
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, position: "relative" }}>
                <MaterialIcons
                  name="receipt"
                  size={20}
                  color={colors.textSecondary}
                  style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    height: 54,
                    borderRadius: 12,
                    backgroundColor: isDark ? colors.background : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingLeft: 44,
                    paddingRight: 16,
                    fontSize: 16,
                    color: colors.text,
                  }}
                  placeholder="Enter Sale ID..."
                  placeholderTextColor={colors.textSecondary}
                  value={saleId}
                  onChangeText={setSaleId}
                />
              </View>
              <TouchableOpacity
                onPress={() => handleLookup()}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="search" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sale Found */}
        {saleFound && (
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
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                  {saleFound.id}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{saleFound.date}</Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 9999,
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.success }}>Found</Text>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {saleFound.items.map((item, index) => {
                // Compute return status live from context
                const itemReturn = returns.find(r =>
                  r.saleItemId === item.saleItemId && r.status !== 'rejected'
                );
                const isReturned = !!itemReturn;
                const isPartial = false; // We can add partial logic later if needed

                return (
                  <View
                    key={index}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.surface,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      opacity: isReturned ? 0.7 : 1,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        Qty: {item.quantity} × {formatTZS(item.price)}
                      </Text>
                      {isReturned && (
                        <View style={{
                          alignSelf: 'flex-start',
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginTop: 4
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.success }}>RETURNED</Text>
                        </View>
                      )}
                      {isPartial && !isReturned && (
                        <View style={{
                          alignSelf: 'flex-start',
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginTop: 4
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.warning }}>PARTIALLY RETURNED</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
                        {isReturned ? "Status" : "Return"}
                      </Text>

                      {isReturned ? (
                        <MaterialIcons name="check-circle" size={24} color={colors.success} />
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setSaleFound(prev => prev ? {
                                ...prev,
                                items: prev.items.map(i =>
                                  i.saleItemId === item.saleItemId
                                    ? { ...i, returnQty: Math.max(0, i.returnQty - 1) }
                                    : i
                                )
                              } : null);
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: isDark ? colors.background : "#E5E7EB",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <MaterialIcons name="remove" size={18} color={colors.text} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, width: 24, textAlign: "center" }}>
                            {item.returnQty}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setSaleFound(prev => prev ? {
                                ...prev,
                                items: prev.items.map(i =>
                                  i.saleItemId === item.saleItemId
                                    ? { ...i, returnQty: Math.min(item.quantity, i.returnQty + 1) }
                                    : i
                                )
                              } : null);
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              backgroundColor: colors.primary,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <MaterialIcons name="add" size={18} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Return Reason */}
        {saleFound && (
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
              Return Reason *
            </Text>
            <View style={{ gap: 8 }}>
              {returnReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  onPress={() => setSelectedReason(reason.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedReason === reason.id ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)") : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedReason === reason.id ? colors.primary : colors.border,
                    gap: 12,
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={reason.icon as any}
                    size={22}
                    color={selectedReason === reason.id ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: selectedReason === reason.id ? "600" : "500",
                      color: selectedReason === reason.id ? colors.primary : colors.text,
                    }}
                  >
                    {reason.label}
                  </Text>
                  {selectedReason === reason.id && (
                    <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Condition Selection */}
        {saleFound && (
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
              Item Condition *
            </Text>
            <View style={{ gap: 8 }}>
              {[
                { id: 'good', label: 'Good Condition', icon: 'check-circle', color: colors.success },
                { id: 'damaged', label: 'Damaged', icon: 'broken-image', color: colors.error },
                { id: 'suspected', label: 'Suspected Issue', icon: 'warning', color: colors.warning },
              ].map((condition) => (
                <TouchableOpacity
                  key={condition.id}
                  onPress={() => setSelectedCondition(condition.id as 'good' | 'damaged' | 'suspected')}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedCondition === condition.id ? `${condition.color}15` : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedCondition === condition.id ? condition.color : colors.border,
                    gap: 12,
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={condition.icon as any}
                    size={22}
                    color={selectedCondition === condition.id ? condition.color : colors.textSecondary}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: selectedCondition === condition.id ? "600" : "500",
                      color: selectedCondition === condition.id ? condition.color : colors.text,
                    }}
                  >
                    {condition.label}
                  </Text>
                  {selectedCondition === condition.id && (
                    <MaterialIcons name="check-circle" size={20} color={condition.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        {saleFound && (
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
              Additional Notes
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
              placeholder="Describe the condition of the items..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {saleFound && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 16,
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 20,
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !selectedReason}
            style={{
              height: 56,
              borderRadius: 12,
              backgroundColor: submitting || !selectedReason ? colors.textSecondary : colors.primary,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="assignment-return" size={22} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                  Submit Return Request
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


