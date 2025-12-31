// Bulk Stock Update Screen - Rapid inventory adjustments
import React, { useState, useEffect, useMemo } from "react";
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
    FlatList,
    LayoutAnimation,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useRoleGuard } from "../../src/hooks/useRoleGuard";
import { useApp } from "../../src/context/AppContext";
import * as inventoryService from "@/services/inventoryService";
import { useTheme } from "../../src/context/ThemeContext";

type UpdateItem = {
    product: inventoryService.Product;
    newQuantity: string;
    mode: "add" | "set";
};

export default function BulkUpdateScreen() {
    const { isAdmin } = useRoleGuard("admin");
    const { products, refreshProducts } = useApp();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ scannedBarcode?: string }>();
    const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItems, setSelectedItems] = useState<UpdateItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // Handle scanned barcode
    useEffect(() => {
        if (params.scannedBarcode) {
            handleAddItemBySku(params.scannedBarcode);
        }
    }, [params.scannedBarcode]);

    const handleAddItemBySku = async (sku: string) => {
        try {
            const product = await inventoryService.getProductBySku(sku);
            if (product) {
                addItem(product);
            } else {
                Alert.alert("Not Found", "No product found with this barcode.");
            }
        } catch (error) {
            console.log("Error finding product:", error);
        }
    };

    const addItem = (product: any) => {
        const partId = product.part_id || product.id;
        const exists = selectedItems.find(item => (item.product.part_id || (item.product as any).id) === partId);
        if (exists) return;

        // Ensure we have a consistent ServiceProduct-like object or at least the fields we need
        const normalizedProduct: inventoryService.Product = {
            part_id: product.part_id || product.id,
            sku: product.sku,
            name: product.name,
            quantity_in_stock: product.quantity_in_stock !== undefined ? product.quantity_in_stock : product.quantityInStock,
            reorder_level: product.reorder_level !== undefined ? product.reorder_level : product.reorderLevel,
            cost_price: product.cost_price !== undefined ? product.cost_price : product.costPrice,
            selling_price: product.selling_price !== undefined ? product.selling_price : product.sellingPrice,
            category_id: product.category_id || null,
            supplier_id: product.supplier_id || null,
            description: product.description || null,
            image_url: product.image_url || product.imageUrl || null,
            created_at: product.created_at || new Date().toISOString(),
            updated_at: product.updated_at || product.updatedAt || product.created_at || new Date().toISOString(),
        };

        setSelectedItems([
            ...selectedItems,
            { product: normalizedProduct, newQuantity: "", mode: "add" }
        ]);
        setShowSearch(false);
        setSearchQuery("");
    };

    const removeItem = (partId: string) => {
        setSelectedItems(selectedItems.filter(item => item.product.part_id !== partId));
    };

    const updateItemValue = (partId: string, value: string) => {
        setSelectedItems(selectedItems.map(item =>
            item.product.part_id === partId ? { ...item, newQuantity: value } : item
        ));
    };

    const toggleMode = (partId: string) => {
        setSelectedItems(selectedItems.map(item =>
            item.product.part_id === partId ? { ...item, mode: item.mode === "add" ? "set" : "add" } : item
        ));
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        return products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5);
    }, [searchQuery, products]);

    const handleSave = async () => {
        if (selectedItems.length === 0) {
            Alert.alert("No Items", "Please add at least one item to update.");
            return;
        }

        // Validate inputs
        const invalid = selectedItems.find(item => isNaN(parseInt(item.newQuantity)) || (parseInt(item.newQuantity) < 0 && item.mode === "set"));
        if (invalid) {
            Alert.alert("Invalid Input", "Please enter valid numbers for all items.");
            return;
        }

        setLoading(true);
        try {
            // Process updates
            for (const item of selectedItems) {
                const qty = parseInt(item.newQuantity) || 0;
                if (item.mode === "add") {
                    await inventoryService.updateStock(item.product.part_id, qty);
                } else {
                    await inventoryService.updateProduct(item.product.part_id, {
                        quantity_in_stock: qty
                    });
                }
            }

            await refreshProducts();
            Alert.alert("Success", "Inventory updated successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.log("Error bulk updating:", error);
            Alert.alert("Error", error.message || "Failed to update inventory.");
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
                    paddingTop: statusBarHeight + 8,
                    paddingBottom: 12,
                    backgroundColor: colors.card,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
                >
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, fontFamily: "Poppins_700Bold" }}>
                    Bulk Stock Update
                </Text>

                <TouchableOpacity
                    onPress={() => router.push({ pathname: "/inventory/scan", params: { returnTo: "/inventory/bulk-update" } })}
                    style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
                >
                    <MaterialIcons name="qr-code-scanner" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
                {/* Search Bar */}
                <View style={{ zIndex: 10 }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: colors.card,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            paddingHorizontal: 12,
                            height: 50,
                        }}
                    >
                        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={{ flex: 1, marginLeft: 8, color: colors.text, fontSize: 15 }}
                            placeholder="Search product to add..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                setShowSearch(text.length > 0);
                            }}
                            onFocus={() => setShowSearch(searchQuery.length > 0)}
                        />
                    </View>

                    {showSearch && (
                        <View
                            style={{
                                position: "absolute",
                                top: 55,
                                left: 0,
                                right: 0,
                                backgroundColor: colors.card,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.border,
                                elevation: 5,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                overflow: "hidden",
                            }}
                        >
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((p) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => addItem(p)}
                                        style={{
                                            padding: 12,
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.border,
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontWeight: "600" }}>{p.name}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>SKU: {p.sku} | In Stock: {p.quantityInStock}</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={{ padding: 12 }}>
                                    <Text style={{ color: colors.textSecondary }}>No products found</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* Selected Items List */}
                <View style={{ gap: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                        Items to Update ({selectedItems.length})
                    </Text>

                    {selectedItems.length === 0 ? (
                        <View style={{ padding: 40, alignItems: "center" }}>
                            <MaterialIcons name="inventory" size={64} color={colors.border} />
                            <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: "center" }}>
                                Scan or search to add products for bulk update
                            </Text>
                        </View>
                    ) : (
                        selectedItems.map((item) => (
                            <View
                                key={item.product.part_id}
                                style={{
                                    backgroundColor: colors.card,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    padding: 20,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.05,
                                    shadowRadius: 12,
                                    elevation: 2,
                                }}
                            >
                                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                                            {item.product.name}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                            Current Stock: {item.product.quantity_in_stock}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(item.product.part_id)}>
                                        <MaterialIcons name="close" size={20} color={colors.error} />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                                    <TouchableOpacity
                                        onPress={() => toggleMode(item.product.part_id)}
                                        style={{
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 8,
                                            backgroundColor: item.mode === "add" ? colors.primary : colors.surface,
                                            borderWidth: 1,
                                            borderColor: item.mode === "add" ? colors.primary : colors.border,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: "600", color: item.mode === "add" ? "#FFF" : colors.text }}>
                                            {item.mode === "add" ? "Adding" : "Setting"}
                                        </Text>
                                    </TouchableOpacity>

                                    <TextInput
                                        style={{
                                            flex: 1,
                                            backgroundColor: colors.surface,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            paddingHorizontal: 12,
                                            height: 40,
                                            color: colors.text,
                                        }}
                                        placeholder={item.mode === "add" ? "Qty to add..." : "New count..."}
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="numeric"
                                        value={item.newQuantity}
                                        onChangeText={(val) => updateItemValue(item.product.part_id, val)}
                                    />
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {selectedItems.length > 0 && (
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={{
                            borderRadius: 20,
                            overflow: "hidden",
                            marginTop: 16,
                            elevation: 4,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.3,
                            shadowRadius: 12,
                        }}
                    >
                        <LinearGradient
                            colors={isDark ? ["#1E40AF", "#1E3A8A"] : ["#3B82F6", "#1D4ED8"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                                height: 56,
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "row",
                                gap: 10,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <MaterialIcons name="save" size={24} color="#FFF" />
                                    <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 }}>Save All Changes</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
}
