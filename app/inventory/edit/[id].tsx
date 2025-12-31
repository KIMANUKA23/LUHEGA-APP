// Inventory Edit Screen (Admin Only)
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useRoleGuard } from "../../../src/hooks/useRoleGuard";
import * as inventoryService from "../../../src/services/inventoryService";
import * as categoryService from "../../../src/services/categoryService";
import * as supplierService from "../../../src/services/supplierService";
import { useTheme } from "../../../src/context/ThemeContext";

export default function InventoryEdit() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryId: "",
    supplierId: "",
    description: "",
    costPrice: "",
    sellingPrice: "",
    stock: "",
    reorderLevel: "",
  });
  const [categories, setCategories] = useState<Array<{ category_id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ supplier_id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      if (!productId) {
        setLoading(false);
        return;
      }

      const [product, cats, sups] = await Promise.all([
        inventoryService.getProduct(productId),
        categoryService.getCategories(),
        supplierService.getSuppliers(),
      ]);

      if (!product) {
        Alert.alert("Error", "Product not found");
        router.back();
        return;
      }

      setCategories(cats);
      setSuppliers(sups);

      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        categoryId: product.category_id || "",
        supplierId: product.supplier_id || "",
        description: product.description || "",
        costPrice: product.cost_price?.toString() || "0",
        sellingPrice: product.selling_price?.toString() || "0",
        stock: product.quantity_in_stock?.toString() || "0",
        reorderLevel: product.reorder_level?.toString() || "0",
      });
    } catch (error) {
      console.log("Error loading product:", error);
      Alert.alert("Error", "Failed to load product");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    if (!formData.name.trim() || !formData.sku.trim()) {
      Alert.alert("Validation Error", "Name and SKU are required");
      return;
    }

    const costPrice = parseFloat(formData.costPrice);
    const sellingPrice = parseFloat(formData.sellingPrice);
    const stock = parseInt(formData.stock) || 0;
    const reorderLevel = parseInt(formData.reorderLevel) || 0;

    if (isNaN(costPrice) || costPrice < 0) {
      Alert.alert("Validation Error", "Please enter a valid cost price");
      return;
    }

    if (isNaN(sellingPrice) || sellingPrice < 0) {
      Alert.alert("Validation Error", "Please enter a valid selling price");
      return;
    }

    setSaving(true);
    try {
      const productId = Array.isArray(id) ? id[0] : id;
      if (!productId) throw new Error("Product ID is missing");

      await inventoryService.updateProduct(productId, {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        category_id: formData.categoryId || null,
        supplier_id: formData.supplierId || null,
        description: formData.description.trim() || null,
        cost_price: costPrice,
        selling_price: sellingPrice,
        quantity_in_stock: stock,
        reorder_level: reorderLevel,
      });

      Alert.alert("Success", "Product updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log('Error updating product:', error);
      Alert.alert(
        "Error",
        error.message || "Failed to update product. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Reusable styles
  const styles = {
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading product...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 48,
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
            Edit Product
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              minWidth: 60,
              alignItems: "flex-end",
            }}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.primary,
                }}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View
          style={styles.card}
        >
          <Text
            style={styles.sectionTitle}
          >
            Basic Information
          </Text>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={styles.label}>
                Product Name
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderWidth: 1,
                  borderColor: "#CDDBEA",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: "#1C1B1F",
                }}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>
            <View>
              <Text style={styles.label}>
                SKU
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderWidth: 1,
                  borderColor: "#CDDBEA",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: "#1C1B1F",
                }}
                value={formData.sku}
                onChangeText={(text) => setFormData({ ...formData, sku: text })}
              />
            </View>
            <View>
              <Text style={styles.label}>
                Category
              </Text>
              <View
                style={[styles.input, { justifyContent: "center" }]}
              >
                <Text style={{ fontSize: 16, color: formData.categoryId ? colors.text : colors.textSecondary }}>
                  {formData.categoryId
                    ? categories.find(c => c.category_id === formData.categoryId)?.name || "Select category"
                    : "Select category (optional)"}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.category_id}
                      onPress={() => setFormData({ ...formData, categoryId: cat.category_id })}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: formData.categoryId === cat.category_id ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: formData.categoryId === cat.category_id ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        color: formData.categoryId === cat.category_id ? "#FFFFFF" : colors.textSecondary,
                        fontWeight: formData.categoryId === cat.category_id ? "600" : "400",
                      }}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View>
              <Text style={styles.label}>
                Supplier
              </Text>
              <View
                style={[styles.input, { justifyContent: "center" }]}
              >
                <Text style={{ fontSize: 16, color: formData.supplierId ? colors.text : colors.textSecondary }}>
                  {formData.supplierId
                    ? suppliers.find(s => s.supplier_id === formData.supplierId)?.name || "Select supplier"
                    : "Select supplier (optional)"}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {suppliers.map(sup => (
                    <TouchableOpacity
                      key={sup.supplier_id}
                      onPress={() => setFormData({ ...formData, supplierId: sup.supplier_id })}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: formData.supplierId === sup.supplier_id ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: formData.supplierId === sup.supplier_id ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{
                        fontSize: 13,
                        color: formData.supplierId === sup.supplier_id ? "#FFFFFF" : colors.textSecondary,
                        fontWeight: formData.supplierId === sup.supplier_id ? "600" : "400",
                      }}>
                        {sup.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View>
              <Text style={styles.label}>
                Description
              </Text>
              <TextInput
                style={[styles.input, { height: 100, paddingTop: 16, textAlignVertical: "top" }]}
                placeholderTextColor={colors.textSecondary}
                multiline
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#1C1B1F",
              marginBottom: 16,
            }}
          >
            Pricing
          </Text>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 14, color: "#757575", marginBottom: 8 }}>
                Cost Price (TZS)
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderWidth: 1,
                  borderColor: "#CDDBEA",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: "#1C1B1F",
                }}
                keyboardType="numeric"
                value={formData.costPrice}
                onChangeText={(text) => setFormData({ ...formData, costPrice: text })}
              />
            </View>
            <View>
              <Text style={{ fontSize: 14, color: "#757575", marginBottom: 8 }}>
                Selling Price (TZS)
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderWidth: 1,
                  borderColor: "#CDDBEA",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: "#1C1B1F",
                }}
                keyboardType="numeric"
                value={formData.sellingPrice}
                onChangeText={(text) => setFormData({ ...formData, sellingPrice: text })}
              />
            </View>
          </View>
        </View>

        {/* Stock Information */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#1C1B1F",
              marginBottom: 16,
            }}
          >
            Stock Information
          </Text>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontSize: 14, color: "#757575", marginBottom: 8 }}>
                Current Stock
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderWidth: 1,
                  borderColor: "#CDDBEA",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: "#1C1B1F",
                }}
                keyboardType="numeric"
                value={formData.stock}
                onChangeText={(text) => setFormData({ ...formData, stock: text })}
              />
            </View>
            <View>
              <Text style={{ fontSize: 14, color: "#757575", marginBottom: 8 }}>
                Reorder Level
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderWidth: 1,
                  borderColor: "#CDDBEA",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: "#1C1B1F",
                }}
                keyboardType="numeric"
                value={formData.reorderLevel}
                onChangeText={(text) => setFormData({ ...formData, reorderLevel: text })}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

