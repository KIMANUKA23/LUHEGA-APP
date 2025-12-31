// Purchase Order Detail Screen - match existing style
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import * as poService from "../../src/services/poService";
import * as supplierService from "../../src/services/supplierService";
import * as inventoryService from "../../src/services/inventoryService";
import * as userService from "../../src/services/userService";

type POStatus = "pending" | "approved" | "shipped" | "delivered" | "cancelled";

type PODetailData = {
  id: string;
  date: string;
  supplier: {
    name: string;
    contact: string;
    phone: string;
  };
  status: POStatus;
  expectedDelivery: string | null;
  createdBy: string;
  items: Array<{ name: string; sku: string; quantity: number; unitPrice: number; received: number }>;
  subtotal: number;
  shipping: number;
  total: number;
  notes: string | null;
};

export default function PurchaseOrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [po, setPo] = useState<PODetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadPurchaseOrder();
  }, [id]);

  const loadPurchaseOrder = async () => {
    if (!id) {
      Alert.alert("Error", "No purchase order ID provided.");
      router.back();
      return;
    }

    setLoading(true);
    try {
      const poData = await poService.getPurchaseOrder(id);

      if (!poData) {
        Alert.alert("Error", "Purchase order not found.");
        router.back();
        return;
      }

      // Get supplier info
      let supplierName = "Unknown Supplier";
      let supplierContact = "N/A";
      let supplierPhone = "N/A";
      if (poData.supplier_id) {
        const supplier = await supplierService.getSupplier(poData.supplier_id);
        if (supplier) {
          supplierName = supplier.name;
          supplierContact = supplier.contact_name || "N/A";
          supplierPhone = supplier.phone || "N/A";
        }
      }

      // Get creator name
      let creatorName = "Admin";
      if (poData.created_by) {
        const creator = await userService.getUser(poData.created_by);
        creatorName = creator?.name || "Admin";
      }

      // Get product names for items
      const itemsWithNames = await Promise.all(
        poData.items.map(async (item) => {
          const product = await inventoryService.getProduct(item.part_id);
          return {
            name: product?.name || "Unknown Product",
            sku: product?.sku || "N/A",
            quantity: item.quantity,
            unitPrice: item.unit_cost,
            received: 0, // Received quantity not tracked in current schema
          };
        })
      );

      const poDate = new Date(poData.date_created);
      const formattedDate = poDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const expectedDate = poData.expected_date
        ? new Date(poData.expected_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
        : null;

      // Map status
      let status: POStatus = "pending";
      if (poData.status === "delivered") status = "delivered";
      else if (poData.status === "approved") status = "approved";
      else if (poData.status === "cancelled") status = "cancelled";

      setPo({
        id: poData.po_id,
        date: formattedDate,
        supplier: {
          name: supplierName,
          contact: supplierContact,
          phone: supplierPhone,
        },
        status,
        expectedDelivery: expectedDate,
        createdBy: creatorName,
        items: itemsWithNames,
        subtotal: poData.total_cost,
        shipping: 0, // Shipping not tracked in current schema
        total: poData.total_cost,
        notes: null, // Notes not in current schema
      });
    } catch (error) {
      console.log("Error loading purchase order:", error);
      Alert.alert("Error", "Failed to load purchase order details.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: POStatus) => {
    switch (status) {
      case "pending": return { bg: "rgba(245, 158, 11, 0.15)", text: "#B45309", label: "Pending", color: "#F59E0B" };
      case "approved": return { bg: "rgba(0, 123, 255, 0.15)", text: "#007BFF", label: "Approved", color: "#007BFF" };
      case "shipped": return { bg: "rgba(139, 92, 246, 0.15)", text: "#7C3AED", label: "Shipped", color: "#7C3AED" };
      case "delivered": return { bg: "rgba(16, 185, 129, 0.15)", text: "#047857", label: "Complete", color: "#16A34A" };
      case "cancelled": return { bg: "rgba(239, 68, 68, 0.15)", text: "#DC2626", label: "Cancelled", color: "#DC2626" };
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8F9FA", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={{ marginTop: 12, color: "#6B7280" }}>Loading purchase order...</Text>
      </View>
    );
  }

  if (!po) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8F9FA", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#6B7280" }}>Purchase order not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, padding: 12, backgroundColor: "#007BFF", borderRadius: 8 }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = getStatusStyle(po.status);

  const handleReceive = () => {
    router.push(`/purchase-orders/${po.id}/receive`);
  };

  const handleApprove = async () => {
    Alert.alert(
      "Approve Order",
      "Are you sure you want to approve this purchase order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setApproving(true);
            try {
              const success = await poService.approvePurchaseOrder(po.id);
              if (success) {
                Alert.alert("Success", "Purchase order approved!");
                loadPurchaseOrder(); // Reload data
              } else {
                Alert.alert("Error", "Failed to approve purchase order");
              }
            } catch (error) {
              console.log("Error approving PO:", error);
              Alert.alert("Error", "An unexpected error occurred");
            } finally {
              setApproving(false);
            }
          }
        }
      ]
    );
  };


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
              Purchase Order
            </Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
              {po.id}
            </Text>
          </View>
        </View>

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
          <MaterialIcons name="more-vert" size={24} color="#1C1B1F" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Tracker (Cycle) */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E0E2E6",
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 20, fontFamily: "Poppins_700Bold" }}>
            Order Cycle
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 10 }}>
            {/* Step 1: Pending */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: po.status === "pending" || po.status === "approved" || po.status === "delivered" ? "#F59E0B" : "#E5E7EB",
                alignItems: "center", justifyContent: "center", zIndex: 1
              }}>
                <MaterialIcons
                  name={po.status === "approved" || po.status === "delivered" ? "check" : "history"}
                  size={18} color="#FFF"
                />
              </View>
              <Text style={{ fontSize: 11, fontWeight: "600", marginTop: 8, color: po.status === "pending" ? "#F59E0B" : "#6B7280" }}>Pending</Text>
            </View>

            {/* Line 1 */}
            <View style={{ height: 2, flex: 1, backgroundColor: po.status === "approved" || po.status === "delivered" ? "#007BFF" : "#E5E7EB", marginTop: -20 }} />

            {/* Step 2: Approved */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: po.status === "approved" || po.status === "delivered" ? "#007BFF" : "#E5E7EB",
                alignItems: "center", justifyContent: "center", zIndex: 1
              }}>
                <MaterialIcons
                  name={po.status === "delivered" ? "check" : "verified"}
                  size={18} color="#FFF"
                />
              </View>
              <Text style={{ fontSize: 11, fontWeight: "600", marginTop: 8, color: po.status === "approved" ? "#007BFF" : "#6B7280" }}>Approved</Text>
            </View>

            {/* Line 2 */}
            <View style={{ height: 2, flex: 1, backgroundColor: po.status === "delivered" ? "#16A34A" : "#E5E7EB", marginTop: -20 }} />

            {/* Step 3: Complete */}
            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: po.status === "delivered" ? "#16A34A" : "#E5E7EB",
                alignItems: "center", justifyContent: "center", zIndex: 1
              }}>
                <MaterialIcons name="done-all" size={18} color="#FFF" />
              </View>
              <Text style={{ fontSize: 11, fontWeight: "600", marginTop: 8, color: po.status === "delivered" ? "#16A34A" : "#6B7280" }}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Status Card */}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Order Date</Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>{po.date}</Text>
            </View>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: statusStyle.bg,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: statusStyle.text }}>
                {statusStyle.label}
              </Text>
            </View>
          </View>

          {po.status === "shipped" && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "rgba(139, 92, 246, 0.08)",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <MaterialIcons name="local-shipping" size={24} color="#7C3AED" />
              <View>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Expected Delivery</Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#7C3AED" }}>
                  {po.expectedDelivery}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Supplier Info */}
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
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Supplier
          </Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="business" size={20} color="#6B7280" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                {po.supplier.name}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="person" size={20} color="#6B7280" />
              <Text style={{ fontSize: 14, color: "#374151" }}>{po.supplier.contact}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialIcons name="phone" size={20} color="#6B7280" />
              <Text style={{ fontSize: 14, color: "#374151" }}>{po.supplier.phone}</Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
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
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Order Items
          </Text>
          <View style={{ gap: 12 }}>
            {po.items.map((item, index) => (
              <View
                key={index}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#6B7280" }}>{item.sku}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
                    {formatTZS(item.quantity * item.unitPrice)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    {item.quantity} × {formatTZS(item.unitPrice)}
                  </Text>
                  {po.status === "delivered" && (
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#16A34A" }}>
                      Received: {item.received}/{item.quantity}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E5E7EB", gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>Subtotal</Text>
              <Text style={{ fontSize: 14, color: "#111827" }}>{formatTZS(po.subtotal)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: "#6B7280" }}>Shipping</Text>
              <Text style={{ fontSize: 14, color: "#111827" }}>{formatTZS(po.shipping)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E5E7EB" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#007BFF" }}>{formatTZS(po.total)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {po.notes && (
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
            <Text style={{ flex: 1, fontSize: 14, color: "#92400E" }}>{po.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {(po.status === "pending") && (
        <View
          style={{
            position: "absolute",
            bottom: po.status === "pending" ? 80 : 0,
            left: 0,
            right: 0,
            padding: 16,
            paddingBottom: 8,
            backgroundColor: "transparent",
          }}
        >
          <TouchableOpacity
            onPress={handleApprove}
            disabled={approving}
            style={{
              height: 56,
              borderRadius: 12,
              backgroundColor: "#007BFF",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: "#007BFF",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            {approving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={22} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                  Approve Order
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {(po.status === "shipped" || po.status === "approved" || po.status === "pending") && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
          }}
        >
          <TouchableOpacity
            onPress={handleReceive}
            style={{
              height: 56,
              borderRadius: 12,
              backgroundColor: "#16A34A",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: "#16A34A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="inventory" size={22} color="#FFFFFF" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Receive Delivery
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
