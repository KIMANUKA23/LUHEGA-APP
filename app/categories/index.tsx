// Categories List Screen - match existing style
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as categoryService from "@/services/categoryService";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";

type CategoryDisplay = {
  id: string;
  name: string;
  description: string;
  productCount: number;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
};

// Map category names to icons and colors
const categoryIcons: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string }> = {
  "Engine Parts": { icon: "directions-car", color: "#2563EB" },
  "Brake Systems": { icon: "emergency", color: "#DC2626" },
  "Filters": { icon: "filter-alt", color: "#16A34A" },
  "Filters & Fluids": { icon: "filter-alt", color: "#16A34A" },
  "Electrical": { icon: "electrical-services", color: "#7C3AED" },
  "Suspension": { icon: "swap-vert", color: "#EA580C" },
  "Lighting": { icon: "lightbulb", color: "#EAB308" },
};

const defaultIcon = { icon: "category", color: "#6B7280" };

export default function CategoriesListScreen() {
  const router = useRouter();
  const { products } = useApp();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  // Load categories when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [products])
  );

  const loadCategories = async () => {
    setLoading(true);
    try {
      const dbCategories = await categoryService.getCategories();

      // Count products per category
      const categoryCounts = new Map<string, number>();
      products.forEach(product => {
        const count = categoryCounts.get(product.category) || 0;
        categoryCounts.set(product.category, count + 1);
      });

      // Convert to display format
      const displayCategories: CategoryDisplay[] = dbCategories.map(cat => {
        const iconData = categoryIcons[cat.name] || defaultIcon;
        return {
          id: cat.category_id,
          name: cat.name,
          description: cat.description || "No description",
          productCount: categoryCounts.get(cat.category_id) || 0,
          icon: iconData.icon,
          color: iconData.color,
        };
      });

      setCategories(displayCategories);
    } catch (error) {
      console.log('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(query.toLowerCase()) ||
      cat.description.toLowerCase().includes(query.toLowerCase())
  );

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
          Categories
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ position: "relative" }}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={{ position: "absolute", left: 16, top: 17, zIndex: 1 }}
          />
          <TextInput
            style={{
              height: 54,
              borderRadius: 9999,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              paddingLeft: 48,
              paddingRight: 16,
              fontSize: 15,
              color: colors.text,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: isDark ? 0.3 : 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
            placeholder="Search categories..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#007BFF" />
            <Text style={{ marginTop: 12, color: "#6B7280" }}>Loading categories...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredCategories.length === 0 && categories.length === 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="category" size={64} color="#D1D5DB" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280", marginTop: 16 }}>
              No categories found
            </Text>
            <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
              Create your first category to organize products.
            </Text>
          </View>
        )}

        {/* No Search Results */}
        {!loading && filteredCategories.length === 0 && categories.length > 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="search-off" size={64} color="#D1D5DB" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#6B7280", marginTop: 16 }}>
              No categories match your search
            </Text>
          </View>
        )}

        {/* Categories List */}
        {!loading && filteredCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            onPress={() => router.push(`/categories/${category.id}`)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.4 : 0.04,
              shadowRadius: 15,
              elevation: 4,
              flexDirection: "row",
              alignItems: "center",
            }}
            activeOpacity={0.85}
          >
            {/* Icon */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: `${category.color}15`,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <MaterialIcons name={category.icon} size={24} color={category.color} />
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.text,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                {category.name}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                {category.description}
              </Text>
            </View>

            {/* Product Count */}
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {category.productCount}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>products</Text>
            </View>

            <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => router.push("/categories/new")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 100,
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.5 : 0.3,
          shadowRadius: 15,
          elevation: 6,
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}


