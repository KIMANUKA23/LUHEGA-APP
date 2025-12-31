// Create New Purchase Order Screen - match existing style
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
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useTheme } from "../../src/context/ThemeContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { useApp } from "../../src/context/AppContext";
import * as poService from "../../src/services/poService";
import * as supplierService from "../../src/services/supplierService";
import * as inventoryService from "../../src/services/inventoryService";
import { useAuth } from "../../src/context/AuthContext";
import uuid from "react-native-uuid";

type OrderItem = {
  id: string;
  partId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export default function CreatePurchaseOrderScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { refreshPurchaseOrders, refreshProducts } = useApp();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [suppliers, setSuppliers] = useState<Array<{ supplier_id: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ part_id: string; name: string; sku: string }>>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemSku, setNewItemSku] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<{ part_id: string; name: string; sku: string } | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sups, prods] = await Promise.all([
        supplierService.getSuppliers(),
        inventoryService.getProducts(),
      ]);
      setSuppliers(sups);
      setProducts(prods);
    } catch (error) {
      console.log("Error loading data:", error);
      Alert.alert("Error", "Failed to load suppliers and products");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addItem = () => {
    if (!selectedProduct) {
      Alert.alert("Validation Error", "Please select a product");
      return;
    }

    if (!newItemQuantity.trim() || !newItemPrice.trim()) {
      Alert.alert("Validation Error", "Please fill in quantity and unit price");
      return;
    }

    const product = selectedProduct;

    const quantity = parseInt(newItemQuantity);
    const unitPrice = parseFloat(newItemPrice);

    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("Validation Error", "Please enter a valid quantity");
      return;
    }

    if (isNaN(unitPrice) || unitPrice <= 0) {
      Alert.alert("Validation Error", "Please enter a valid unit price");
      return;
    }

    setItems(prev => [...prev, {
      id: uuid.v4() as string,
      partId: product.part_id,
      name: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
    }]);

    setSelectedProduct(null);
    setNewItemQuantity("");
    setNewItemPrice("");
    setShowAddItem(false);
  };

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      Alert.alert("Validation Error", "Please select a supplier");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Validation Error", "Please add at least one item to the order");
      return;
    }

    setSubmitting(true);
    try {
      await poService.createPurchaseOrder({
        supplier_id: selectedSupplier,
        created_by: user?.id || null,
        items: items.map(item => ({
          part_id: item.partId,
          quantity: item.quantity,
          unit_cost: item.unitPrice,
        })),
        expected_date: null,
      });

      // Refresh PO list to show the new PO immediately
      await refreshPurchaseOrders();

      Alert.alert(
        "Success",
        "Purchase order created successfully!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.log("Error creating purchase order:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create purchase order. Please try again."
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
          New Purchase Order
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 180, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Supplier Selection */}
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
            Select Supplier *
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : suppliers.length === 0 ? (
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", padding: 16 }}>
              No suppliers available. Please add suppliers first.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {suppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.supplier_id}
                  onPress={() => setSelectedSupplier(supplier.supplier_id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: selectedSupplier === supplier.supplier_id
                      ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.12)")
                      : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedSupplier === supplier.supplier_id ? colors.primary : colors.border,
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 9999,
                      backgroundColor: selectedSupplier === supplier.supplier_id
                        ? (isDark ? "rgba(37, 99, 235, 0.3)" : "rgba(0, 123, 255, 0.15)")
                        : colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <MaterialIcons
                      name="business"
                      size={20}
                      color={selectedSupplier === supplier.supplier_id ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: selectedSupplier === supplier.supplier_id ? "600" : "500",
                      color: selectedSupplier === supplier.supplier_id ? colors.primary : colors.text,
                    }}
                  >
                    {supplier.name}
                  </Text>
                  {selectedSupplier === supplier.supplier_id && (
                    <MaterialIcons name="check-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Order Items */}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Order Items
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddItem(!showAddItem)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.12)",
                gap: 4,
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name={showAddItem ? "close" : "add"} size={18} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                {showAddItem ? "Cancel" : "Add Item"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Add Item Form */}
          {showAddItem && (
            <View style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 12,
              gap: 12,
            }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                Add New Item
              </Text>

              {/* Product Selection */}
              <View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>Select Product *</Text>
                {products.length === 0 ? (
                  <Text style={{ fontSize: 14, color: colors.error, padding: 12, textAlign: "center" }}>
                    No products available. Please add products to inventory first.
                  </Text>
                ) : (
                  <View style={{ gap: 8, maxHeight: 200 }}>
                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
                      {products.map((product) => (
                        <TouchableOpacity
                          key={product.part_id}
                          onPress={() => setSelectedProduct(product)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 12,
                            borderRadius: 8,
                            backgroundColor: selectedProduct?.part_id === product.part_id
                              ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.12)")
                              : colors.card,
                            borderWidth: 1,
                            borderColor: selectedProduct?.part_id === product.part_id ? colors.primary : colors.border,
                            marginBottom: 6,
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 14,
                              fontWeight: selectedProduct?.part_id === product.part_id ? "600" : "500",
                              color: selectedProduct?.part_id === product.part_id ? colors.primary : colors.text
                            }}>
                              {product.name}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                              SKU: {product.sku}
                            </Text>
                          </View>
                          {selectedProduct?.part_id === product.part_id && (
                            <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>Quantity *</Text>
                    <TextInput
                      style={{
                        height: 44,
                        borderRadius: 8,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 12,
                        fontSize: 14,
                        color: colors.text,
                      }}
                      placeholder="Qty"
                      placeholderTextColor={colors.textSecondary}
                      value={newItemQuantity}
                      onChangeText={setNewItemQuantity}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>Unit Price *</Text>
                    <TextInput
                      style={{
                        height: 44,
                        borderRadius: 8,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 12,
                        fontSize: 14,
                        color: colors.text,
                      }}
                      placeholder="Price"
                      placeholderTextColor={colors.textSecondary}
                      value={newItemPrice}
                      onChangeText={setNewItemPrice}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={addItem}
                  disabled={!selectedProduct || products.length === 0}
                  style={{
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: selectedProduct ? colors.primary : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: selectedProduct ? "#FFFFFF" : colors.textSecondary }}>
                    Add to Order
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {items.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <MaterialIcons name="inventory" size={48} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 12 }}>
                {t("no_items_added_yet")}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {items.map((item) => (
                <View
                  key={item.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{item.sku}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeItem(item.id)}>
                      <MaterialIcons name="close" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, -1)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons name="remove" size={20} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, width: 40, textAlign: "center" }}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, 1)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: colors.primary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <MaterialIcons name="add" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        @ {formatTZS(item.unitPrice)}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                        {formatTZS(item.quantity * item.unitPrice)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
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
              height: 80,
              borderRadius: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 12,
              fontSize: 15,
              color: colors.text,
              textAlignVertical: "top",
            }}
            placeholder={t("add_special_instructions")}
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      {/* Bottom Summary & Action */}
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            {t("total")} ({items.length} {t("items_count")})
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>
            {formatTZS(subtotal)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !selectedSupplier || items.length === 0}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: (submitting || !selectedSupplier || items.length === 0) ? colors.border : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.3,
            shadowRadius: 8,
            elevation: 4,
            opacity: (submitting || !selectedSupplier || items.length === 0) ? 0.6 : 1,
          }}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="send" size={22} color="#FFFFFF" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                {t("create_order")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
