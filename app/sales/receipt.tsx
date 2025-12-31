// Sales Receipt Screen - match existing style
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
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as salesService from "../../src/services/salesService";
import * as inventoryService from "../../src/services/inventoryService";
import * as userService from "../../src/services/userService";
import * as settingsService from "../../src/services/settingsService";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type ReceiptData = {
  id: string;
  date: string;
  time: string;
  cashier: string;
  customer: string;
  customerPhone?: string;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; price: number; saleItemId: string }>;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
};

export default function SalesReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ saleId?: string }>();
  const { getSale } = useApp();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [settings, setSettings] = useState<settingsService.ReceiptSettings>(settingsService.DEFAULT_RECEIPT_SETTINGS);

  useEffect(() => {
    loadData();
  }, [params.saleId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load settings first
      const savedSettings = await settingsService.getReceiptSettings();
      setSettings(savedSettings);

      // Then load receipt data
      await loadReceiptData();
    } catch (error) {
      console.log("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReceiptData = async () => {
    if (!params.saleId) {
      Alert.alert("Error", "No sale ID provided. Please go back and try again.");
      router.back();
      return;
    }

    try {
      // Fetch sale from database
      const sale = await salesService.getSale(params.saleId);

      if (!sale) {
        Alert.alert("Error", "Sale not found.");
        router.back();
        return;
      }

      // Get staff name
      let staffName = "Staff Member";
      if (sale.user_id) {
        const staff = await userService.getUser(sale.user_id);
        staffName = staff?.name || "Staff Member";
      }

      // Get product names for items
      const itemsWithNames = await Promise.all(
        sale.items.map(async (item) => {
          const product = await inventoryService.getProduct(item.part_id);
          return {
            name: product?.name || "Unknown Product",
            quantity: item.quantity,
            price: item.unit_price,
            saleItemId: item.sale_item_id,
          };
        })
      );

      const saleDate = new Date(sale.sale_date);
      const formattedDate = saleDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const formattedTime = saleDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const subtotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = 0; // Tax not implemented yet
      const total = subtotal + tax;
      const amountPaid = sale.amount_paid || 0;
      const change = amountPaid - total;

      setReceiptData({
        id: sale.sale_id,
        date: formattedDate,
        time: formattedTime,
        cashier: staffName,
        customer: sale.customer_name || "Walk-in Customer",
        customerPhone: sale.customer_phone || undefined,
        paymentMethod: sale.payment_mode || "Cash",
        items: itemsWithNames,
        subtotal,
        tax,
        total,
        amountPaid,
        change: Math.max(0, change),
      });
    } catch (error) {
      console.log("Error loading receipt data:", error);
      throw error;
    }
  };

  const handleNewSale = () => {
    router.replace("/sales/new");
  };

  // Generate HTML receipt template
  const generateReceiptHTML = (data: ReceiptData, settings: settingsService.ReceiptSettings): string => {
    const itemsHTML = data.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827;">${item.name}</div>
          <div style="font-size: 12px; color: #6b7280;">Qty: ${item.quantity} × ${formatTZS(item.price)}</div>
        </td>
        <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827;">
          ${formatTZS(item.quantity * item.price)}
        </td>
      </tr>
    `
      )
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${data.id}</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      color: #111827;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px solid #111827;
      padding-bottom: 16px;
    }
    .company-name {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .company-address {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 2px;
    }
    .receipt-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #d1d5db;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    table {
      width: 100%;
      margin: 16px 0;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 2px solid #111827;
      margin-top: 8px;
      font-size: 18px;
      font-weight: 700;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #d1d5db;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${settings.storeName}</div>
    ${settings.showStoreInfo ? `
      <div class="company-address">${settings.storeAddress}</div>
      <div class="company-address">${settings.storePhone}</div>
    ` : ""}
    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Sales Receipt</div>
  </div>

  <div class="receipt-info">
    <div>
      <div class="info-label">Receipt #</div>
      <div class="info-value">${data.id}</div>
    </div>
    <div style="text-align: right;">
      <div class="info-label">Date & Time</div>
      <div class="info-value">${data.date}<br>${data.time}</div>
    </div>
  </div>

  <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
    <div class="summary-row">
      <span style="color: #6b7280;">Cashier:</span>
      <span style="font-weight: 600;">${data.cashier}</span>
    </div>
    ${settings.showCustomerInfo ? `
    <div class="summary-row">
      <span style="color: #6b7280;">Customer:</span>
      <span style="font-weight: 600;">${data.customer}</span>
    </div>
    ` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left; padding-bottom: 8px; color: #6b7280; font-size: 12px; font-weight: 600;">ITEM</th>
        <th style="text-align: right; padding-bottom: 8px; color: #6b7280; font-size: 12px; font-weight: 600;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div style="margin-top: 16px;">
    <div class="summary-row">
      <span style="color: #6b7280;">Subtotal</span>
      <span style="font-weight: 600;">${formatTZS(data.subtotal)}</span>
    </div>
    ${settings.showTaxInfo && data.tax > 0 ? `
    <div class="summary-row">
      <span style="color: #6b7280;">Tax</span>
      <span style="font-weight: 600;">${formatTZS(data.tax)}</span>
    </div>
    ` : ""}
    <div class="total-row">
      <span>TOTAL</span>
      <span>${formatTZS(data.total)}</span>
    </div>
    ${settings.showPaymentDetails ? `
      <div class="summary-row" style="margin-top: 12px;">
        <span style="color: #6b7280;">Payment Method</span>
        <span style="font-weight: 600;">${data.paymentMethod}</span>
      </div>
      <div class="summary-row">
        <span style="color: #6b7280;">Amount Paid</span>
        <span style="font-weight: 600;">${formatTZS(data.amountPaid)}</span>
      </div>
      ${data.change > 0 ? `
      <div class="summary-row">
        <span style="color: #6b7280;">Change</span>
        <span style="font-weight: 600;">${formatTZS(data.change)}</span>
      </div>
      ` : ""}
    ` : ""}
  </div>

  <div class="footer">
    <div style="margin-bottom: 8px;">${settings.footerMessage}</div>
    <div>Keep this receipt for your records</div>
  </div>
</body>
</html>
    `;
  };

  const handlePrint = async () => {
    if (!receiptData || printing) return;

    setPrinting(true);
    try {
      const html = generateReceiptHTML(receiptData, settings);

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Print the PDF
      await Print.printAsync({
        uri,
      });

      Alert.alert("Success", "Receipt sent to printer successfully!");
    } catch (error: any) {
      console.log("Error printing receipt:", error);
      Alert.alert(
        "Print Error",
        error.message || "Failed to print receipt. Please try again."
      );
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!receiptData || sharing) return;

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Not Available",
        "Sharing is not available on this device."
      );
      return;
    }

    setSharing(true);
    try {
      const html = generateReceiptHTML(receiptData, settings);

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      // Share the PDF
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Share Receipt ${receiptData.id}`,
        UTI: "com.adobe.pdf", // iOS only
      });
    } catch (error: any) {
      console.log("Error sharing receipt:", error);
      Alert.alert(
        "Share Error",
        error.message || "Failed to share receipt. Please try again."
      );
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading receipt...</Text>
      </View>
    );
  }

  if (!receiptData) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <Text style={{ color: colors.textSecondary }}>No receipt data available</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16, padding: 12, backgroundColor: colors.primary, borderRadius: 8 }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Go Back</Text>
        </TouchableOpacity>
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
          paddingTop: Math.max(insets?.top || 0, statusBarHeight) + 8,
          paddingBottom: 12,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/sales")}
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
          Receipt
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing || !receiptData}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              opacity: (sharing || !receiptData) ? 0.5 : 1,
            }}
            activeOpacity={0.7}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <MaterialIcons name="share" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Banner */}
        <View
          style={{
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)",
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.success,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <MaterialIcons name="check" size={36} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: isDark ? colors.success : "#047857" }}>
            Sale Complete!
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? colors.textSecondary : "#065F46", marginTop: 4 }}>
            Transaction successful
          </Text>
        </View>

        {/* Receipt Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          {/* Store Header */}
          <View
            style={{
              padding: 20,
              backgroundColor: isDark ? colors.surface : "#0F172A",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: isDark ? colors.text : "#FFFFFF", textAlign: 'center' }}>
              {settings.storeName}
            </Text>
            {settings.showStoreInfo && (
              <>
                <Text style={{ fontSize: 13, color: isDark ? colors.textSecondary : "rgba(255,255,255,0.7)", marginTop: 4, textAlign: 'center' }}>
                  {settings.storeAddress}
                </Text>
                <Text style={{ fontSize: 13, color: isDark ? colors.textSecondary : "rgba(255,255,255,0.7)", marginTop: 2, textAlign: 'center' }}>
                  {settings.storePhone}
                </Text>
              </>
            )}
          </View>

          {/* Receipt Details */}
          <View style={{ padding: 16 }}>
            {/* Receipt Info */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
                borderStyle: "dashed",
              }}
            >
              <View>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>Receipt #</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                  {receiptData.id}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>Date & Time</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                  {receiptData.date} {receiptData.time}
                </Text>
              </View>
            </View>

            {/* Cashier & Customer */}
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>Cashier:</Text>
                <Text style={{ fontSize: 13, color: "#111827" }}>{receiptData.cashier}</Text>
              </View>
              {settings.showCustomerInfo && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>Customer:</Text>
                  <Text style={{ fontSize: 13, color: "#111827" }}>{receiptData.customer}</Text>
                </View>
              )}
            </View>

            {/* Items */}
            <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 }}>
                ITEMS
              </Text>
              {receiptData.items.map((item, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    alignItems: "center"
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.text }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {item.quantity} × {formatTZS(item.price)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>
                      {formatTZS(item.quantity * item.price)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push({
                        pathname: "/returns/new",
                        params: { saleId: receiptData.id, saleItemId: item.saleItemId }
                      })}
                      style={{
                        padding: 4,
                        backgroundColor: colors.surface,
                        borderRadius: 8
                      }}
                    >
                      <MaterialIcons name="keyboard-return" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Totals */}
            <View style={{ paddingVertical: 12, gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Subtotal</Text>
                <Text style={{ fontSize: 13, color: colors.text }}>{formatTZS(receiptData.subtotal)}</Text>
              </View>
              {settings.showTaxInfo && receiptData.tax > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Tax</Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{formatTZS(receiptData.tax)}</Text>
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTopWidth: 2,
                  borderTopColor: colors.text,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>TOTAL</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                  {formatTZS(receiptData.total)}
                </Text>
              </View>
            </View>

            {/* Payment Details */}
            {settings.showPaymentDetails && (
              <View
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  borderStyle: "dashed",
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Payment Method</Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{receiptData.paymentMethod}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Amount Paid</Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{formatTZS(receiptData.amountPaid)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.success }}>Change</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: colors.success }}>
                    {formatTZS(receiptData.change)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View
            style={{
              padding: 16,
              backgroundColor: colors.surface,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center" }}>
              {settings.footerMessage}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, opacity: 0.7, marginTop: 4 }}>
              Keep this receipt for your records
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: Math.max(insets?.bottom || 0, 16),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: "row",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={handlePrint}
          disabled={printing || !receiptData}
          style={{
            flex: 1,
            height: 56,
            borderRadius: 12,
            backgroundColor: printing || !receiptData ? colors.border : colors.surface,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: (printing || !receiptData) ? 0.6 : 1,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          activeOpacity={0.85}
        >
          {printing ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <MaterialIcons name="print" size={22} color={colors.text} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Print</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNewSale}
          style={{
            flex: 2,
            height: 56,
            borderRadius: 12,
            backgroundColor: colors.primary,
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
          <MaterialIcons name="add" size={22} color="#FFFFFF" />
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" }}>New Sale</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
