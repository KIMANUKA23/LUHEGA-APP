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
    StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { formatTZS } from "../../../src/utils/currency";
import * as poService from "../../../src/services/poService";
import * as inventoryService from "../../../src/services/inventoryService";
import { useTheme } from "../../../src/context/ThemeContext";

export default function ReceiveDeliveryScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useTheme();
    const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState<Record<string, any>>({});

    useEffect(() => {
        loadPO();
    }, [id]);

    const loadPO = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await poService.getPurchaseOrder(id);
            if (!data) {
                Alert.alert("Error", "Purchase order not found");
                router.back();
                return;
            }
            setPo(data);

            // Fetch product details for names
            const productMap: Record<string, any> = {};
            for (const item of data.items) {
                const prod = await inventoryService.getProduct(item.part_id);
                if (prod) productMap[item.part_id] = prod;
            }
            setProducts(productMap);
        } catch (error) {
            console.log("Error loading PO for receive:", error);
            Alert.alert("Error", "Failed to load purchase order");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReceipt = async () => {
        Alert.alert(
            "Confirm Receipt",
            "Are you sure you have received all items in this order? This will update your inventory stock levels.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            const success = await poService.deliverPurchaseOrder(id!);
                            if (success) {
                                Alert.alert("Success", "Delivery received and stock updated!");
                                router.replace("/purchase-orders");
                            } else {
                                Alert.alert("Error", "Failed to update delivery status");
                            }
                        } catch (error) {
                            console.log("Error receiving delivery:", error);
                            Alert.alert("Error", "An unexpected error occurred");
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center" }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ExpoStatusBar style={isDark ? "light" : "dark"} />

            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: statusBarHeight + 8,
                        backgroundColor: colors.card,
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Receive Delivery</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Order ID:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{id}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date:</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                            {new Date(po?.date_created).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Items to Receive</Text>

                {po?.items.map((item: any, index: number) => {
                    const product = products[item.part_id];
                    return (
                        <View
                            key={item.po_item_id}
                            style={[
                                styles.itemCard,
                                { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                        >
                            <View style={styles.itemHeader}>
                                <Text style={[styles.itemName, { color: colors.text }]}>
                                    {product?.name || "Loading..."}
                                </Text>
                                <Text style={[styles.itemQty, { color: colors.primary }]}>x{item.quantity}</Text>
                            </View>
                            <Text style={[styles.itemSku, { color: colors.textSecondary }]}>
                                {product?.sku || "---"}
                            </Text>
                            <View style={styles.itemDetails}>
                                <Text style={[styles.itemPrice, { color: colors.textSecondary }]}>
                                    {formatTZS(item.unit_cost)} / unit
                                </Text>
                                <Text style={[styles.itemSubtotal, { color: colors.text }]}>
                                    {formatTZS(item.subtotal)}
                                </Text>
                            </View>
                        </View>
                    );
                })}

                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Order Value</Text>
                        <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatTZS(po?.total_cost || 0)}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Footer */}
            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: colors.success }]}
                    onPress={handleConfirmReceipt}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <MaterialIcons name="check-circle" size={22} color="#FFF" />
                            <Text style={styles.confirmButtonText}>Confirm Receipt</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    infoCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "600",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
    },
    itemCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    itemName: {
        fontSize: 15,
        fontWeight: "600",
        flex: 1,
    },
    itemQty: {
        fontSize: 16,
        fontWeight: "700",
        marginLeft: 12,
    },
    itemSku: {
        fontSize: 13,
        marginBottom: 8,
    },
    itemDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
        paddingTop: 8,
    },
    itemPrice: {
        fontSize: 13,
    },
    itemSubtotal: {
        fontSize: 15,
        fontWeight: "700",
    },
    summaryCard: {
        marginTop: 8,
        padding: 8
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    summaryLabel: {
        fontSize: 15,
        fontWeight: '500'
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '800'
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
    },
    confirmButton: {
        height: 56,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    confirmButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
    },
});
