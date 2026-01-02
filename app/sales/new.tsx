// New Sale (POS) Screen - match Stitch design
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../src/utils/currency";
import { useApp } from "../../src/context/AppContext";
import { useTheme } from "../../src/context/ThemeContext";
import { getProductBySku } from "../../src/services/inventoryService";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 16 * 2 - 12) / 2; // 2 columns, 16px padding, 12px gap

type PopularItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function NewSaleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scannedBarcode?: string }>();
  const { products, refreshProducts } = useApp();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingBarcode, setCheckingBarcode] = useState(false);

  // Calculate cart totals
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Add item to cart
  const addToCart = (item: PopularItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(c => c.id === item.id);
      if (existingItem) {
        // Increase quantity if already in cart
        return prevCart.map(c =>
          c.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      } else {
        // Add new item to cart
        return [...prevCart, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
      }
    });
  };

  // Products are already loaded by AppContext, no need to refresh
  useEffect(() => {
    // Just ensure we have products, if empty then refresh
    if (products.length === 0) {
      const load = async () => {
        setLoading(true);
        await refreshProducts();
        setLoading(false);
      };
      load();
    }
  }, [products.length, refreshProducts]);

  // Reset cart when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setCart([]);
    }, [])
  );

  // Convert products to popular items format
  const popularItems: PopularItem[] = products
    .filter(p => p.quantityInStock > 0)
    .slice(0, 20) // Limit to top 20
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.sellingPrice,
      stock: p.quantityInStock,
    }));

  const filteredItems = searchQuery
    ? popularItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : popularItems;

  // Handle scanned barcode from scanner
  useEffect(() => {
    if (params.scannedBarcode) {
      handleBarcodeScan(params.scannedBarcode);
      // Clear param after processing to prevent repeated additions
      router.setParams({ scannedBarcode: undefined });
    }
  }, [params.scannedBarcode]);

  const handleBarcodeScan = async (barcode: string) => {
    setCheckingBarcode(true);

    try {
      // Check if product exists by SKU/barcode
      const product = await getProductBySku(barcode);

      if (product) {
        // Product found - add to cart
        const cartItem: PopularItem = {
          id: product.part_id,
          name: product.name,
          price: product.selling_price,
          stock: product.quantity_in_stock,
        };

        addToCart(cartItem);

        Alert.alert(
          "Product Found",
          `${product.name}\nBarcode: ${barcode}\nAdded to cart!`,
          [{ text: "OK", style: "default" }]
        );
      } else {
        // Product not found
        Alert.alert(
          "Product Not Found",
          `No product found with barcode: ${barcode}`,
          [{ text: "OK", style: "default" }]
        );
      }
    } catch (error) {
      console.log('Error checking barcode:', error);
      Alert.alert(
        "Error",
        "Failed to check barcode. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setCheckingBarcode(false);
    }
  };

  const handleOpenScanner = () => {
    router.push({
      pathname: "/inventory/scan",
      params: { returnTo: "/sales/new" },
    });
  };

  const handleViewCart = () => {
    // Pass cart data to payment screen
    const cartItems = cart.map(item => ({
      part_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
    }));
    router.push({
      pathname: "/sales/payment",
      params: {
        total: cartTotal.toString(),
        items: JSON.stringify(cartItems),
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Top App Bar */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
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

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          New Sale
        </Text>

        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, paddingBottom: 140 + insets.bottom }}>
        {/* Search Bar */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: 56,
              borderRadius: 9999,
              backgroundColor: colors.surface,
              paddingHorizontal: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 3,
              elevation: 2,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                paddingLeft: 12,
                paddingRight: 8,
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name="search"
                size={22}
                color={colors.textSecondary}
              />
            </View>
            <TextInput
              style={{
                flex: 1,
                height: "100%",
                fontSize: 16,
                color: colors.text,
                paddingHorizontal: 4,
              }}
              placeholder="Search by name or barcode"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              onPress={handleOpenScanner}
              disabled={checkingBarcode}
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 123, 255, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 4,
              }}
              activeOpacity={0.8}
            >
              {checkingBarcode ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons
                  name="qr-code-scanner"
                  size={22}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sales History shortcut */}
        <TouchableOpacity
          onPress={() => router.push("/sales/history")}
          style={{
            paddingHorizontal: 16,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 123, 255, 0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="receipt-long" size={20} color={colors.primary} />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.primary,
            }}
          >
            View Sales History
          </Text>
        </TouchableOpacity>

        {/* Popular Items */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
              paddingBottom: 8,
              paddingTop: 8,
            }}
          >
            Popular Items
          </Text>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 4,
            }}
          >
            {popularItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => addToCart(item)}
                style={{
                  width: CARD_WIDTH,
                  borderRadius: 12,
                  backgroundColor: colors.card,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                activeOpacity={0.8}
              >
                {/* Image placeholder (square) */}
                <View
                  style={{
                    width: "100%",
                    aspectRatio: 1,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    marginBottom: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons
                    name="image"
                    size={32}
                    color={colors.textSecondary}
                  />
                </View>

                <View style={{ gap: 2 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {formatTZS(item.price)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                    }}
                  >
                    Stock: {item.stock}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Floating Cart Summary - only show if cart has items */}
      {cartItemCount > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 95 + insets.bottom, // elevated above the new taller V2 tab bar
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
          <TouchableOpacity
            onPress={handleViewCart}
            style={{
              height: 56,
              borderRadius: 16,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
            activeOpacity={0.85}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "#FFFFFF",
              }}
              numberOfLines={1}
            >
              View Cart ({cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} | {formatTZS(cartTotal)})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


