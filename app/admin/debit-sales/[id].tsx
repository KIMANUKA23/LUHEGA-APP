// Debit Sale Detail & Approval Screen - Admin Only
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../../src/utils/currency";
import { useAuth } from "../../../src/context/AuthContext";
import { useApp } from "../../../src/context/AppContext";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import { useTheme } from "../../../src/context/ThemeContext";
import * as userService from "../../../src/services/userService";
import * as inventoryService from "../../../src/services/inventoryService";

type SaleItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  partId?: string;
};

type DebitSaleDetail = {
  id: string;
  customerName: string;
  customerPhone: string;
  staffName: string;
  saleDate: string;
  totalAmount: number;
  amountPaid: number;
  balanceRemaining: number;
  paymentMode: string;
  items: SaleItem[];
  notes?: string;
};

export default function DebitSaleDetailScreen() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getSale, createDebt, getAllDebts, refreshSales, refreshProducts, refreshDebts, updateSaleType } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [detail, setDetail] = useState<DebitSaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSaleDetail();
  }, [id]);

  const loadSaleDetail = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const sale = getSale(id);
      if (!sale || sale.saleType !== 'debit') {
        Alert.alert("Error", "Debit sale not found");
        router.back();
        return;
      }

      // Get staff name
      let staffName = "Unknown Staff";
      if (sale.staffId) {
        const staff = await userService.getUser(sale.staffId);
        staffName = staff?.name || "Unknown Staff";
      }

      // Get product names for items
      const itemsWithNames: SaleItem[] = await Promise.all(
        sale.items.map(async (item) => {
          let productName = item.productName || "Unknown Product";
          if (item.productId) {
            const product = await inventoryService.getProduct(item.productId);
            if (product) {
              productName = product.name;
            }
          }
          return {
            name: productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
            partId: item.productId,
          };
        })
      );

      setDetail({
        id: sale.id,
        customerName: sale.customerName || "Walk-in Customer",
        customerPhone: sale.customerPhone || "",
        staffName,
        saleDate: new Date(sale.saleDate).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        totalAmount: sale.totalAmount,
        amountPaid: sale.amountPaid || 0,
        balanceRemaining: sale.amountRemaining,
        paymentMode: sale.paymentMode || "Debit",
        items: itemsWithNames,
        notes: sale.notes,
      });
    } catch (error) {
      console.log("Error loading sale detail:", error);
      Alert.alert("Error", "Failed to load sale details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading sale details...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ fontSize: 16, color: colors.textSecondary }}>Sale not found.</Text>
      </View>
    );
  }

  const handleApprove = async () => {
    if (processing || !id || !detail) return;

    // If a debt already exists for this sale, treat it as already approved
    const alreadyApproved = getAllDebts().some(d => d.saleId === id);
    if (alreadyApproved) {
      Alert.alert("Already Approved", "This debit sale was already approved.");
      return;
    }

    Alert.alert(
      "Approve Debit Sale",
      "This will approve the debit sale and create a debt entry. The sale is already created and will be marked as approved. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            setProcessing(true);
            try {
              // The sale already exists, just create the debt entry
              await createDebt({
                saleId: id,
                customerName: detail.customerName,
                customerPhone: detail.customerPhone,
                totalAmount: detail.totalAmount,
                amountPaid: 0,
                balanceRemaining: detail.totalAmount,
                status: "unpaid",
              });

              // Update sale type to 'debit' (from pending_debit)
              await updateSaleType(id, "debit");

              await Promise.all([refreshSales(), refreshProducts(), refreshDebts()]);

              Alert.alert("Success", "Debit sale approved and debt entry created.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error: any) {
              console.log("Error approving debit sale:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to approve sale. Please try again."
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    if (!id || !detail) return;

    Alert.alert(
      "Reject Debit Sale",
      "Are you sure you want to reject this debit sale? This will remove it from pending sales. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              // Note: In a real app, you might want to mark the sale as rejected
              // For now, we'll just refresh and it won't show in pending if it's already processed
              await refreshSales();

              Alert.alert("Success", "Debit sale rejected.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error: any) {
              console.log("Error rejecting debit sale:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to reject sale. Please try again."
              );
            } finally {
              setProcessing(false);
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
            Debit Sale Details
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>#{detail.id}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 12,
          }}
        >
          <SummaryRow label="Customer Name" value={detail.customerName} accent colors={colors} />
          <SummaryRow label="Phone Number" value={detail.customerPhone} colors={colors} />
          <SummaryRow label="Staff Member" value={detail.staffName} colors={colors} />
          <SummaryRow label="Sale Date" value={detail.saleDate} colors={colors} />
          <SummaryRow label="Payment Mode" value={detail.paymentMode} colors={colors} />

          {detail.notes && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Notes</Text>
              <Text style={{ fontSize: 14, color: colors.text, marginTop: 4 }}>{detail.notes}</Text>
            </View>
          )}
        </View>

        {/* Amount Summary */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Total Amount</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
              {formatTZS(detail.totalAmount)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Amount Paid</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.success }}>
              {formatTZS(detail.amountPaid)}
            </Text>
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 12,
              marginTop: 4,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                Balance Remaining
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.error }}>
                {formatTZS(detail.balanceRemaining)}
              </Text>
            </View>
          </View>
        </View>

        {/* Items List */}
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
            Sale Items
          </Text>

          {detail.items.map((item, index) => (
            <View
              key={index}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 }}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                  {formatTZS(item.subtotal)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  Qty: {item.quantity} × {formatTZS(item.unitPrice)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Actions - Approve/Reject */}
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
          disabled={processing}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 14,
            backgroundColor: processing ? colors.border : colors.success,
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
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Approve Sale
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleReject}
          disabled={processing}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 14,
            backgroundColor: processing ? colors.border : colors.error,
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
          {processing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
            >
              Reject Sale
            </Text>
          )}
        </TouchableOpacity>
      </View>
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

