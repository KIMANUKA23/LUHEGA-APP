// Inventory List Screen
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as inventoryService from "@/services/inventoryService";
import * as categoryService from "@/services/categoryService";
import * as supplierService from "@/services/supplierService";

export default function InventoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scannedBarcode?: string }>();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { products, refreshProducts } = useApp();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingBarcode, setCheckingBarcode] = useState(false);
  const insets = useSafeAreaInsets();
  const lastProcessedBarcode = React.useRef<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/(auth)/login-choice");
    }
  }, [isAuthenticated, authLoading, router]);

  // Refresh products when screen is focused - MUST be before early returns
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated || authLoading) return;

      const loadProducts = async () => {
        setLoading(true);
        await refreshProducts();
        setLoading(false);
      };
      loadProducts();
    }, [isAuthenticated, authLoading, refreshProducts])
  );

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Handle scanned barcode - Staff: Check if product exists
  useEffect(() => {
    if (params.scannedBarcode && params.scannedBarcode !== lastProcessedBarcode.current) {
      lastProcessedBarcode.current = params.scannedBarcode;
      handleBarcodeScan(params.scannedBarcode);
    }
  }, [params.scannedBarcode]);

  const handleBarcodeScan = async (barcode: string) => {
    console.log("🔍 Scanning barcode:", barcode);
    setCheckingBarcode(true);
    setSearchQuery(barcode); // Set in search field

    try {
      // Check if product exists by SKU
      const product = await inventoryService.getProductBySku(barcode);
      console.log("📦 Product search result:", product ? `Found: ${product.name} (${product.part_id})` : "Not found");

      if (product) {
        // Product found - navigate directly to product detail 
        console.log("🚀 Navigating to:", `/inventory/${product.part_id}`);
        router.push(`/inventory/${product.part_id}`);
      } else {
        // Product not found
        Alert.alert(
          "Product Not Found",
          `No product found with SKU: ${barcode}\n\nThis product is not in inventory.`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.log('❌ Error checking barcode:', error);
      Alert.alert("Error", "Failed to check product. Please try again.");
    } finally {
      setCheckingBarcode(false);
    }
  };

  const handleOpenScanner = () => {
    router.push({
      pathname: "/inventory/scan",
      params: { returnTo: "/(tabs)/inventory" },
    });
  };

  const filteredProducts = products.filter(
    (product) =>
      (product.status !== 'archived') && // Only show active products
      (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top, StatusBar.currentHeight || 0) + 8,
          paddingBottom: 12,
          justifyContent: "center",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Inventory
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            position: "relative",
            height: 56,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              left: 16,
              zIndex: 1,
            }}
          >
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
          </View>
          <TextInput
            style={{
              flex: 1,
              height: 56,
              borderRadius: 9999,
              backgroundColor: colors.surface,
              paddingLeft: 48,
              paddingRight: 48,
              fontSize: 16,
              color: colors.text,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={{
            position: "absolute",
            right: 16,
            flexDirection: "row",
            gap: 8,
          }}>
            <TouchableOpacity
              onPress={handleOpenScanner}
              style={{
                padding: 8,
                backgroundColor: colors.primary,
                borderRadius: 8,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="qr-code-scanner" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                padding: 8,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="tune" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Products List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading inventory...</Text>
          </View>
        )}

        {/* Checking Barcode */}
        {checkingBarcode && (
          <View style={{
            padding: 16,
            backgroundColor: isDark ? "rgba(37, 99, 235, 0.2)" : "#EFF6FF",
            borderRadius: 12,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12
          }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 14 }}>Checking product...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && products.length === 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="inventory-2" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No products found
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
              Your inventory is empty. Add products to get started.
            </Text>
          </View>
        )}

        {/* No Search Results */}
        {!loading && filteredProducts.length === 0 && products.length > 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="search-off" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No products match your search
            </Text>
          </View>
        )}

        {/* Products List */}
        {!loading && filteredProducts.map((product) => (
          <TouchableOpacity
            key={product.id}
            onPress={() => router.push(`/inventory/${product.id}`)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: product.quantityInStock <= product.reorderLevel
                ? isDark ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)"
                : colors.border,
              shadowColor: product.quantityInStock <= product.reorderLevel ? "#EF4444" : "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
            activeOpacity={0.7}
          >
            {/* Image Placeholder with gradient */}
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                backgroundColor: isDark ? "rgba(107, 114, 128, 0.2)" : "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <MaterialIcons name="inventory-2" size={28} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </View>

            {/* Product Info */}
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.text,
                  lineHeight: 20,
                }}
                numberOfLines={1}
              >
                {product.name}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                }}
              >
                SKU: {product.sku}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: product.quantityInStock <= product.reorderLevel
                      ? isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)"
                      : isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: product.quantityInStock <= product.reorderLevel ? colors.error : colors.success,
                    }}
                  >
                    {product.quantityInStock} in stock
                  </Text>
                </View>
                {product.quantityInStock <= product.reorderLevel && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    <MaterialIcons name="warning" size={12} color={colors.error} />
                    <Text style={{ fontSize: 11, color: colors.error, fontWeight: "500" }}>Low</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Price */}
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                {formatTZS(product.sellingPrice)}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
