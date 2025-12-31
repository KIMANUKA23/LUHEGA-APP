// Category Detail/Edit Screen - match existing style
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as categoryService from "../../src/services/categoryService";
import * as inventoryService from "../../src/services/inventoryService";
import { useApp } from "../../src/context/AppContext";

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const { products } = useApp();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalProducts: 0, inStock: 0, lowStock: 0 });

  useEffect(() => {
    loadCategory();
  }, [id]);

  useEffect(() => {
    calculateStats();
  }, [products, id]);

  const loadCategory = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const category = await categoryService.getCategory(id);
      if (category) {
        setName(category.name);
        setDescription(category.description || "");
      } else {
        Alert.alert("Error", "Category not found");
        router.back();
      }
    } catch (error) {
      console.log("Error loading category:", error);
      Alert.alert("Error", "Failed to load category");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!id) return;

    const categoryProducts = products.filter(p => p.category === id);
    const totalProducts = categoryProducts.length;
    const inStock = categoryProducts.filter(p => p.quantityInStock > 0).length;
    const lowStock = categoryProducts.filter(p => p.quantityInStock > 0 && p.quantityInStock <= p.reorderLevel).length;

    setStats({ totalProducts, inStock, lowStock });
  };

  const handleSave = async () => {
    if (!id || !name.trim()) {
      Alert.alert("Validation Error", "Category name is required.");
      return;
    }

    setSaving(true);
    try {
      await categoryService.updateCategory(id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      Alert.alert("Success", "Category updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log('Error updating category:', error);
      Alert.alert(
        "Error",
        error.message || "Failed to update category. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category? All products in this category will be unassigned. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            try {
              await categoryService.deleteCategory(id);
              Alert.alert("Success", "Category deleted successfully!", [
                { text: "OK", onPress: () => router.push("/categories") },
              ]);
            } catch (error: any) {
              console.log('Error deleting category:', error);
              Alert.alert(
                "Error",
                error.message || "Failed to delete category. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" }}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>Loading category...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <ExpoStatusBar style="dark" backgroundColor="#F8F9FA" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 12,
          backgroundColor: "rgba(248, 249, 250, 0.9)",
          borderBottomWidth: 1,
          borderBottomColor: "rgba(226, 232, 240, 0.8)",
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
          <MaterialIcons name="close" size={24} color="#1C1B1F" />
        </TouchableOpacity>

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "700",
            color: "#1C1B1F",
            fontFamily: "Poppins_700Bold",
          }}
        >
          Edit Category
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9999,
            backgroundColor: saving ? "#9CA3AF" : "#007BFF",
          }}
          activeOpacity={0.85}
        >
          {saving ? (
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
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Info Card */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E0E2E6",
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Category Information
          </Text>

          {/* Name */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 }}>
              Category Name *
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="category" size={20} color="#9CA3AF" style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: "#1C1B1F",
                }}
                placeholder="Enter category name"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Description */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 }}>
              Description
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="description" size={20} color="#9CA3AF" style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 100,
                  borderRadius: 12,
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  paddingLeft: 44,
                  paddingRight: 16,
                  paddingTop: 16,
                  fontSize: 15,
                  color: "#1C1B1F",
                  textAlignVertical: "top",
                }}
                placeholder="Enter description"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#E0E2E6",
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Statistics
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "#F8FAFC",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#007BFF" }}>{stats.totalProducts}</Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Products</Text>
            </View>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "#F8FAFC",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#16A34A" }}>{stats.inStock}</Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>In Stock</Text>
            </View>
            <View
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                backgroundColor: "#F8FAFC",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "700", color: "#DC2626" }}>{stats.lowStock}</Text>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Low Stock</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View
          style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(239, 68, 68, 0.3)",
            padding: 16,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#DC2626",
              marginBottom: 8,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Danger Zone
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#991B1B",
              marginBottom: 16,
              lineHeight: 18,
            }}
          >
            Deleting this category will unassign all products from this category.
            Products will not be deleted.
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: "#DC2626",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="delete" size={20} color="#FFFFFF" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              Delete Category
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: saving ? "#9CA3AF" : "#007BFF",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#007BFF",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


