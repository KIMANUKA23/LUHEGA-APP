import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../src/context/ThemeContext";
import { useApp } from "../../src/context/AppContext";
import { useAuth } from "../../src/context/AuthContext";
import { useSafeHeaderPadding } from "../../src/hooks/useSafePadding";

// Helper for category icons
const CATEGORY_META: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
    Food: { icon: "restaurant", label: "Food" },
    Transport: { icon: "directions-bus", label: "Transport" },
    Rent: { icon: "home", label: "Rent" },
    Electricity: { icon: "flash-on", label: "Energy" },
    Supplies: { icon: "inventory-2", label: "Supplies" },
    Salaries: { icon: "payments", label: "Salaries" },
    Other: { icon: "category", label: "Other" },
};

export default function EditExpenseScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const { getExpense, updateExpense } = useApp();
    const { isAdmin } = useAuth();
    const headerPadding = useSafeHeaderPadding();

    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAdmin) {
            Alert.alert("Permission Denied", "Only administrators can edit expenses.");
            router.back();
            return;
        }

        const expense = getExpense(id as string);
        if (expense) {
            setCategory(expense.category);
            setAmount(expense.amount.toString());
            setDescription(expense.description || "");
            setIsLoading(false);
        } else {
            Alert.alert("Error", "Expense not found.");
            router.back();
        }
    }, [id, isAdmin]);

    const handleSubmit = async () => {
        if (!category || !amount) {
            Alert.alert("Error", "Please fill in the category and amount.");
            return;
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            Alert.alert("Error", "Please enter a valid amount.");
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await updateExpense(id as string, {
                category,
                amount: numAmount,
                description: description || null,
            });

            if (success) {
                Alert.alert("Success", "Expense updated successfully!", [
                    {
                        text: "OK", onPress: () => {
                            if (router.canDismiss()) {
                                router.dismissAll();
                            }
                            router.replace("/(tabs)/expenses");
                        }
                    },
                ]);
            } else {
                throw new Error("Update failed");
            }
        } catch (error) {
            console.log("Error updating expense:", error);
            Alert.alert("Error", "Failed to update expense. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center" }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, paddingTop: headerPadding }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Edit Expense</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Amount Input Section (Prominent) */}
                    <View style={styles.amountSection}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Amount Spent</Text>
                        <View style={[styles.amountInputContainer, { borderBottomColor: colors.primary }]}>
                            <Text style={[styles.currencyPrefix, { color: colors.text }]}>TZS</Text>
                            <TextInput
                                style={[styles.amountInput, { color: colors.text }]}
                                placeholder="0"
                                placeholderTextColor={colors.textSecondary + "80"}
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
                    </View>

                    {/* Category Grid */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
                    <View style={styles.gridContainer}>
                        {Object.entries(CATEGORY_META).map(([key, meta]) => {
                            const isSelected = category === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    style={[
                                        styles.gridItem,
                                        {
                                            backgroundColor: isSelected ? colors.primary : colors.card,
                                            borderColor: isSelected ? colors.primary : colors.border,
                                            shadowColor: isDark ? "#000" : "#94a3b8"
                                        }
                                    ]}
                                    onPress={() => setCategory(key)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons
                                        name={meta.icon}
                                        size={28}
                                        color={isSelected ? "#FFFFFF" : colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.gridLabel,
                                        { color: isSelected ? "#FFFFFF" : colors.textSecondary }
                                    ]}>
                                        {meta.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Description Input */}
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Note (Optional)</Text>
                    <View style={[styles.noteContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput
                            style={[styles.noteInput, { color: colors.text }]}
                            placeholder="What was this for?"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            textAlignVertical="top"
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 },
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>Update Expense</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.05)",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        fontFamily: "Poppins_700Bold",
    },
    scrollContent: {
        padding: 24,
    },
    amountSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        paddingBottom: 8,
        paddingHorizontal: 16,
        minWidth: 150,
        justifyContent: 'center',
    },
    currencyPrefix: {
        fontSize: 24,
        fontWeight: '700',
        marginRight: 8,
        fontFamily: "Poppins_700Bold",
    },
    amountInput: {
        fontSize: 40,
        fontWeight: '700',
        fontFamily: "Poppins_700Bold",
        minWidth: 60,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 12,
        fontFamily: "Poppins_700Bold",
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '30%', // Approx 3 items per row
        aspectRatio: 1,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    gridLabel: {
        fontSize: 12,
        fontWeight: "600",
    },
    noteContainer: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        height: 100,
    },
    noteInput: {
        flex: 1,
        fontSize: 16,
    },
    submitButton: {
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 40,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
        fontFamily: "Poppins_700Bold",
    },
});
