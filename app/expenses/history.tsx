import React, { useState, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    RefreshControl,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/context/ThemeContext";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useSafeHeaderPadding } from "../../src/hooks/useSafePadding";
import { formatTZS } from "../../src/utils/currency";

// Map categories to icons and colors
const CATEGORY_STYLES: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
    Food: { icon: "restaurant", color: "#F59E0B" }, // Amber
    Transport: { icon: "directions-bus", color: "#3B82F6" }, // Blue
    Rent: { icon: "home", color: "#8B5CF6" }, // Purple
    Electricity: { icon: "flash-on", color: "#FBBF24" }, // Yellow
    Supplies: { icon: "inventory-2", color: "#10B981" }, // Green
    Salaries: { icon: "payments", color: "#EC4899" }, // Pink
    Other: { icon: "category", color: "#6B7280" }, // Gray
};

export default function ExpenseHistoryScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { expenses, refreshExpenses, deleteExpense, manualSync } = useApp();
    const { isAdmin } = useAuth();
    const headerPadding = useSafeHeaderPadding();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredExpenses = useMemo(() => {
        let result = expenses;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (e) =>
                    e.category.toLowerCase().includes(query) ||
                    (e.description && e.description.toLowerCase().includes(query)) ||
                    e.staffName.toLowerCase().includes(query)
            );
        }
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, searchQuery]);

    const totalSpent = useMemo(() => {
        return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
    }, [filteredExpenses]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([refreshExpenses(), manualSync()]);
        } catch (error) {
            console.log("Error refreshing:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this expense? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const success = await deleteExpense(id);
                        if (success) {
                            Alert.alert("Success", "Expense deleted successfully.");
                        } else {
                            Alert.alert("Error", "Failed to delete expense.");
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header - Drastically Increased Padding for Visibility */}
            <View style={[styles.header, {
                backgroundColor: colors.background,
                paddingTop: Platform.OS === 'android' ? (headerPadding + 60) : (headerPadding + 40)
            }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Expenses</Text>
                    <TouchableOpacity
                        onPress={() => router.push("/expenses/new")}
                        style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="add" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Summary Card - Redesigned */}
                <View style={[styles.summaryCard, {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: colors.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    elevation: 5
                }]}>
                    <View style={styles.summaryInfo}>
                        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
                        <Text style={[styles.summaryAmount, { color: colors.text }]}>{formatTZS(totalSpent)}</Text>
                    </View>
                    <View style={[styles.summaryBadge, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.summarySub, { color: colors.primary }]}>
                            {filteredExpenses.length} Records
                        </Text>
                    </View>
                </View>

                {/* Search Bar - Modern Integrated Design */}
                <View style={styles.searchWrap}>
                    <View style={[styles.searchBox, {
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                        borderColor: colors.border,
                        borderWidth: 1,
                    }]}>
                        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search expenses..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                {filteredExpenses.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }]}>
                            <MaterialIcons name="receipt-long" size={48} color={colors.textSecondary} />
                        </View>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No expenses found</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                            Try adjusting your search or add a new expense.
                        </Text>
                    </View>
                ) : (
                    filteredExpenses.map((expense) => {
                        const style = CATEGORY_STYLES[expense.category] || CATEGORY_STYLES["Other"];
                        return (
                            <View
                                key={expense.id}
                                style={[
                                    styles.expenseCard,
                                    { backgroundColor: colors.card, borderColor: colors.border, shadowColor: isDark ? "#000" : "#94a3b8" },
                                ]}
                            >
                                <View style={styles.cardMain}>
                                    {/* Icon Box */}
                                    <View style={[styles.iconBox, { backgroundColor: style.color + "15" }]}>
                                        <MaterialIcons name={style.icon} size={24} color={style.color} />
                                    </View>

                                    {/* Content */}
                                    <View style={styles.cardContent}>
                                        <View style={styles.cardRow}>
                                            <Text style={[styles.categoryText, { color: colors.text }]}>{expense.category}</Text>
                                            <Text style={[styles.amountText, { color: colors.error }]}>
                                                {formatTZS(expense.amount)}
                                            </Text>
                                        </View>

                                        {expense.description && (
                                            <Text numberOfLines={1} style={[styles.descriptionText, { color: colors.textSecondary }]}>
                                                {expense.description}
                                            </Text>
                                        )}

                                        <View style={[styles.cardRow, { marginTop: 6 }]}>
                                            <View style={styles.metaRow}>
                                                <MaterialIcons name="person-outline" size={14} color={colors.textSecondary} />
                                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                                    {expense.staffName?.split(' ')[0]}
                                                </Text>
                                                <Text style={[styles.metaDivider, { color: colors.border }]}>|</Text>
                                                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                                                    {formatDate(expense.date)}
                                                </Text>
                                            </View>
                                            {!expense.synced && (
                                                <MaterialIcons name="cloud-off" size={14} color={colors.textSecondary} />
                                            )}
                                        </View>
                                    </View>
                                </View>

                                {/* Action Buttons (Admin Only) - Subtle Footer */}
                                {isAdmin && (
                                    <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                                        <TouchableOpacity
                                            onPress={() => router.push(`/expenses/${expense.id}`)}
                                            style={styles.actionBtn}
                                            activeOpacity={0.6}
                                        >
                                            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Details</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDelete(expense.id)}
                                            style={styles.actionBtn}
                                            activeOpacity={0.6}
                                        >
                                            <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        fontFamily: "Poppins_700Bold",
    },
    summaryCard: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    summaryInfo: {
        flex: 1,
    },
    summaryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 2,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    summaryAmount: {
        fontSize: 28,
        fontWeight: "700",
        fontFamily: "Poppins_700Bold",
    },
    summarySub: {
        fontSize: 12,
        fontWeight: "700",
    },
    searchWrap: {
        marginTop: 20,
        marginBottom: 10,
    },
    searchBox: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        height: '100%',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    expenseCard: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        elevation: 2,
        overflow: 'hidden',
    },
    cardMain: {
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    categoryText: {
        fontSize: 16,
        fontWeight: "700",
        fontFamily: "Poppins_700Bold",
    },
    amountText: {
        fontSize: 15,
        fontWeight: "700",
        fontFamily: "Poppins_700Bold",
    },
    descriptionText: {
        fontSize: 13,
        marginTop: 4,
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    metaText: {
        fontSize: 12,
        fontWeight: "500",
        marginLeft: 4,
    },
    metaDivider: {
        marginHorizontal: 8,
        fontSize: 10,
    },
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 60,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: "center",
        maxWidth: 240,
        lineHeight: 20,
    },
});
