// Add New Product Screen - match existing style
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
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoleGuard } from "../../src/hooks/useRoleGuard";
import { useApp } from "../../src/context/AppContext";
import * as inventoryService from "@/services/inventoryService";
import * as categoryService from "@/services/categoryService";
import * as supplierService from "@/services/supplierService";
import { useTheme } from "../../src/context/ThemeContext";
import { syncAllDebounced } from "../../src/services/syncService";
import { pickImage, uploadImage } from "../../src/services/storageService";

export default function AddProductScreen() {
  // Guard: Admin only
  const { isAdmin } = useRoleGuard("admin");
  const { refreshProducts } = useApp();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ scannedBarcode?: string }>();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [description, setDescription] = useState("");
  const [showManualBarcode, setShowManualBarcode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSku, setCheckingSku] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Load categories and suppliers
  const [categories, setCategories] = useState<{ category_id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ supplier_id: string; name: string }[]>([]);

  useEffect(() => {
    loadCategoriesAndSuppliers();
  }, []);

  const loadCategoriesAndSuppliers = async () => {
    try {
      const [cats, sups] = await Promise.all([
        categoryService.getCategories(),
        supplierService.getSuppliers(),
      ]);
      setCategories(cats);
      setSuppliers(sups);
    } catch (error) {
      console.log('Error loading categories/suppliers:', error);
    }
  };

  // Handle scanned barcode from scanner - Admin: Fill form if product exists
  useEffect(() => {
    if (params.scannedBarcode) {
      handleBarcodeScan(params.scannedBarcode);
    }
  }, [params.scannedBarcode]);

  const handleBarcodeScan = async (barcode: string) => {
    setSku(barcode);
    setCheckingSku(true);

    try {
      // Check if product exists by SKU
      const existingProduct = await inventoryService.getProductBySku(barcode);

      if (existingProduct) {
        // Product exists - fill form with existing data
        Alert.alert(
          "Product Found",
          `Product "${existingProduct.name}" already exists with this SKU. Fill form with existing data?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Fill Form",
              onPress: () => {
                setName(existingProduct.name);
                setCategoryId(existingProduct.category_id || "");
                setSupplierId(existingProduct.supplier_id || "");
                setPrice(existingProduct.selling_price.toString());
                setCost(existingProduct.cost_price.toString());
                setQuantity(existingProduct.quantity_in_stock.toString());
                setReorderLevel(existingProduct.reorder_level.toString());
                setDescription(existingProduct.description || "");
              },
            },
          ]
        );
      }
    } catch (error) {
      console.log('Error checking SKU:', error);
    } finally {
      setCheckingSku(false);
    }
  };

  const handleOpenScanner = () => {
    router.push({
      pathname: "/inventory/scan",
      params: { returnTo: "/inventory/new" },
    });
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim() || !sku.trim() || !price.trim() || !cost.trim()) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    const sellingPrice = parseFloat(price);
    const costPrice = parseFloat(cost);
    const qty = parseInt(quantity) || 0;
    const reorder = parseInt(reorderLevel) || 0;

    if (isNaN(sellingPrice) || sellingPrice < 0) {
      Alert.alert("Validation Error", "Please enter a valid selling price.");
      return;
    }

    if (isNaN(costPrice) || costPrice < 0) {
      Alert.alert("Validation Error", "Please enter a valid cost price.");
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = null;
      if (imageUri) {
        finalImageUrl = await uploadImage(imageUri, 'spareparts', 'products');
      }

      await inventoryService.createProduct({
        sku: sku.trim(),
        name: name.trim(),
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        description: description.trim() || null,
        cost_price: costPrice,
        selling_price: sellingPrice,
        quantity_in_stock: qty,
        reorder_level: reorder,
        image_url: finalImageUrl,
        status: 'active',
      });

      // Refresh products in AppContext
      await refreshProducts();

      // Trigger a background sync so the new product is pushed to Supabase
      // and becomes visible on other devices using the same admin account.
      syncAllDebounced();

      // Better UX: Navigate immediately to inventory list
      if (Platform.OS === 'web') {
        router.dismissAll();
        router.replace("/(tabs)/inventory");
        return;
      }

      Alert.alert("Success", "Product created successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Force navigation back to inventory list, clearing potential stack issues
            router.dismissAll();
            router.replace("/(tabs)/inventory");
          }
        },
      ]);
    } catch (error: any) {
      console.log('Error creating product:', error);
      Alert.alert(
        "Error",
        error.message || "Failed to create product. Please try again."
      );
    } finally {
      setLoading(false);
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
          paddingTop: insets.top + 8,
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
          Add Product
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9999,
            backgroundColor: loading ? colors.border : colors.primary,
            opacity: loading ? 0.6 : 1,
          }}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: insets.bottom + 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Picker */}
        <View
          style={{
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={async () => {
              const uri = await pickImage();
              if (uri) setImageUri(uri);
            }}
            style={{
              width: 120,
              height: 120,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ alignItems: 'center' }}>
                <MaterialIcons name="add-a-photo" size={32} color={colors.textSecondary} />
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  Add Image
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity
              onPress={() => setImageUri(null)}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>
                Remove Image
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Basic Info */}
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
            Basic Information
          </Text>

          {/* Product Name */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Product Name *
            </Text>
            <TextInput
              style={{
                height: 54,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                fontSize: 15,
                color: colors.text,
              }}
              placeholder="Enter product name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* SKU */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              SKU / Part Number *
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, position: "relative" }}>
                <TextInput
                  style={{
                    flex: 1,
                    height: 54,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 16,
                    paddingRight: checkingSku ? 40 : 16,
                    fontSize: 15,
                    color: colors.text,
                  }}
                  placeholder="SKU-XXX"
                  placeholderTextColor={colors.textSecondary}
                  value={sku}
                  onChangeText={setSku}
                />
                {checkingSku && (
                  <View style={{
                    position: "absolute",
                    right: 12,
                    top: 15,
                  }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={handleOpenScanner}
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
                <MaterialIcons name="qr-code-scanner" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Manual Barcode Entry Toggle */}
            <TouchableOpacity
              onPress={() => setShowManualBarcode(!showManualBarcode)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
                gap: 8,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={showManualBarcode ? "keyboard" : "edit"}
                size={18}
                color={colors.primary}
              />
              <Text style={{ fontSize: 13, fontWeight: "500", color: colors.primary }}>
                {showManualBarcode ? "Hide Manual Entry" : "Enter Manual Barcode"}
              </Text>
            </TouchableOpacity>

            {/* Manual Barcode Input - shown when toggled */}
            {showManualBarcode && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
                  Enter Barcode Manually
                </Text>
                <TextInput
                  style={{
                    height: 54,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: 16,
                    fontSize: 15,
                    color: colors.text,
                  }}
                  placeholder="Type barcode here..."
                  placeholderTextColor={colors.textSecondary}
                  value={sku}
                  onChangeText={setSku}
                  autoFocus={showManualBarcode}
                  keyboardType="default"
                />
              </View>
            )}
          </View>

          {/* Category */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Category
            </Text>
            {categories.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.category_id}
                      onPress={() => setCategoryId(cat.category_id)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 9999,
                        backgroundColor: categoryId === cat.category_id ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)") : colors.surface,
                        borderWidth: 1,
                        borderColor: categoryId === cat.category_id ? colors.primary : colors.border,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: categoryId === cat.category_id ? colors.primary : colors.text,
                        }}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={{ fontSize: 14, color: colors.textSecondary, fontStyle: "italic" }}>
                No categories available. Please add categories first.
              </Text>
            )}
          </View>

          {/* Supplier */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Supplier
            </Text>
            {suppliers.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {suppliers.map((sup) => (
                    <TouchableOpacity
                      key={sup.supplier_id}
                      onPress={() => setSupplierId(sup.supplier_id)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 9999,
                        backgroundColor: supplierId === sup.supplier_id ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.1)") : colors.surface,
                        borderWidth: 1,
                        borderColor: supplierId === sup.supplier_id ? colors.primary : colors.border,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: supplierId === sup.supplier_id ? colors.primary : colors.text,
                        }}
                      >
                        {sup.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={{ fontSize: 14, color: colors.textSecondary, fontStyle: "italic" }}>
                No suppliers available. Please add suppliers first.
              </Text>
            )}
          </View>
        </View>

        {/* Pricing */}
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
            Pricing
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
                Selling Price *
              </Text>
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
                Cost Price
              </Text>
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={cost}
                onChangeText={setCost}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Stock */}
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
            Stock Information
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
                Initial Quantity *
              </Text>
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
                Reorder Level
              </Text>
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="5"
                placeholderTextColor={colors.textSecondary}
                value={reorderLevel}
                onChangeText={setReorderLevel}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Description */}
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
            Description
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
            placeholder="Add product description, specifications, compatibility info..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          padding: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: loading ? colors.border : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.5 : 0.3,
            shadowRadius: 8,
            elevation: 4,
            opacity: loading ? 0.6 : 1,
          }}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Add Product
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
