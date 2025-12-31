// Inventory Detail Screen
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useAuth } from "../../src/context/AuthContext";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as inventoryService from "../../src/services/inventoryService";

export default function InventoryDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isAdmin } = useAuth();
  const { getProduct, refreshProducts } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [product, setProduct] = useState<{
    id: string;
    name: string;
    sku: string;
    category: string;
    supplier: string;
    description: string;
    costPrice: number;
    sellingPrice: number;
    stock: number;
    reorderLevel: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const loadProduct = async () => {
        setLoading(true);
        const productId = Array.isArray(id) ? id[0] : id;

        // 1. Try to get from context (fast)
        const prod = getProduct(productId);

        if (prod) {
          setProduct({
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            category: prod.category,
            supplier: prod.supplier,
            description: prod.description || "",
            costPrice: prod.costPrice,
            sellingPrice: prod.sellingPrice,
            stock: prod.quantityInStock,
            reorderLevel: prod.reorderLevel,
          });
          setLoading(false);
        } else {
          // 2. Fallback: Fetch directly from service
          try {
            const sp = await inventoryService.getProduct(productId);
            if (sp) {
              setProduct({
                id: sp.part_id,
                name: sp.name,
                sku: sp.sku,
                category: "Loading...", // Will be updated on refresh
                supplier: "Loading...",
                description: sp.description || "",
                costPrice: sp.cost_price,
                sellingPrice: sp.selling_price,
                stock: sp.quantity_in_stock,
                reorderLevel: sp.reorder_level,
              });
            } else {
              Alert.alert("Error", "Product not found.");
              router.back();
            }
          } catch (error) {
            console.log("Error loading product detail:", error);
            Alert.alert("Error", "Failed to load product details.");
            router.back();
          } finally {
            setLoading(false);
          }
        }
      };

      loadProduct();
    }
  }, [id, getProduct]);

  const handleDelete = async () => {
    if (!id || !product) return;

    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const productId = Array.isArray(id) ? id[0] : id;
              await inventoryService.deleteProduct(productId);

              // Refresh products in context
              await refreshProducts();

              Alert.alert("Success", "Product removed successfully", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error: any) {
              console.log("Error removing product:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to remove product."
              );
            }
          },
        },
      ]
    );
  };

  if (loading || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading product...</Text>
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
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 8,
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
            fontWeight: "600",
            color: colors.text,
          }}
          numberOfLines={1}
        >
          Product Details
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Edit button - Admin only */}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push(`/inventory/edit/${id}`)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="edit" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
          {/* Delete button - Admin only */}
          {isAdmin && (
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete" size={24} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Image */}
        <View
          style={{
            width: "100%",
            height: 200,
            borderRadius: 12,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <MaterialIcons name="image" size={64} color={colors.textSecondary} />
        </View>

        {/* Product Info Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
              marginBottom: 8,
            }}
          >
            {product.name}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 16,
            }}
          >
            {product.sku}
          </Text>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Category</Text>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>
                {product.category}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Supplier</Text>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>
                {product.supplier}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Description</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.text,
                  flex: 1,
                  textAlign: "right",
                }}
              >
                {product.description}
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Pricing
          </Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cost Price</Text>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>
                {formatTZS(product.costPrice)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Selling Price</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
                {formatTZS(product.sellingPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Card */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Stock Information
          </Text>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Current Stock</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: product.stock <= product.reorderLevel ? colors.error : colors.text,
                }}
              >
                {product.stock} units
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Reorder Level</Text>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>
                {product.reorderLevel} units
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

