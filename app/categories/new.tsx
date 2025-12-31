// Create New Category Screen - match existing style
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as categoryService from "../../src/services/categoryService";
import { Alert, ActivityIndicator } from "react-native";
import { useTheme } from "../../src/context/ThemeContext";

export default function CreateCategoryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Category name is required.");
      return;
    }

    setLoading(true);
    try {
      await categoryService.createCategory({
        name: name.trim(),
        description: description.trim() || null,
      });
      Alert.alert("Success", "Category created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log('Error creating category:', error);
      Alert.alert(
        "Error",
        error.message || "Failed to create category. Please try again."
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
          New Category
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 9999,
            backgroundColor: loading ? colors.border : colors.primary,
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
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Info Card */}
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
            Category Information
          </Text>

          {/* Name */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Category Name *
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="category" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="Enter category name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Description */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 }}>
              Description
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons name="description" size={20} color={colors.textSecondary} style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }} />
              <TextInput
                style={{
                  height: 100,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingLeft: 44,
                  paddingRight: 16,
                  paddingTop: 16,
                  fontSize: 15,
                  color: colors.text,
                  textAlignVertical: "top",
                }}
                placeholder="Enter category description"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        </View>

        {/* Tip */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            padding: 12,
            backgroundColor: isDark ? "rgba(37, 99, 235, 0.15)" : "rgba(0, 123, 255, 0.08)",
            borderRadius: 12,
            gap: 12,
          }}
        >
          <MaterialIcons name="info" size={20} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 13, color: isDark ? "#93C5FD" : "#1E40AF", lineHeight: 18 }}>
            Categories help organize your inventory. Products can be assigned to
            categories for easier browsing and filtering.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          padding: 16,
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
          }}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
              Create Category
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


