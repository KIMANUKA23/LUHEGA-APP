import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";

type SupplierDetail = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  categories: { icon: keyof typeof MaterialIcons.glyphMap; label: string; color: string; bg: string }[];
};

const suppliers: Record<string, SupplierDetail> = {
  "supplier-1": {
    id: "supplier-1",
    name: "AutoParts Inc.",
    contact: "John Doe",
    phone: "+1 234 567 890",
    email: "contact@autopartsinc.com",
    address: "123 Industrial Park Rd, Springfield, USA",
    categories: [
      { icon: "directions-car", label: "Engine Parts", color: "#2563EB", bg: "rgba(59, 130, 246, 0.15)" },
      { icon: "filter-alt", label: "Filters & Fluids", color: "#16A34A", bg: "rgba(34, 197, 94, 0.15)" },
      { icon: "electrical-services", label: "Electrical Components", color: "#7C3AED", bg: "rgba(129, 140, 248, 0.18)" },
      { icon: "emergency", label: "Brake Systems", color: "#DC2626", bg: "rgba(248, 113, 113, 0.18)" },
    ],
  },
};

export default function SupplierDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  // In a real app, you'd fetch this from the API or context
  // For now, we'll try to use the mock data or fall back gracefully
  const supplier = (id && suppliers[id]) || {
    id: id || "unknown",
    name: "Supplier Details",
    contact: "N/A",
    phone: "N/A",
    email: "N/A",
    address: "N/A",
    categories: []
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Supplier Details
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {supplier.name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => { }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(0, 123, 255, 0.2)" : "rgba(0, 123, 255, 0.08)",
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="call" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(0, 123, 255, 0.2)" : "rgba(0, 123, 255, 0.08)",
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="email" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Supplier information card */}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
              }}
            >
              Supplier Information
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/suppliers/edit/${supplier.id}`)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9999,
                backgroundColor: isDark ? "rgba(0, 123, 255, 0.2)" : "rgba(0, 123, 255, 0.08)",
                gap: 4,
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="edit" size={16} color={colors.primary} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.primary,
                }}
              >
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 16, gap: 12 }}>
            <InfoRow
              icon="person"
              label="Contact Person"
              value={supplier.contact}
              colors={colors}
            />
            <InfoRow
              icon="phone"
              label="Phone Number"
              value={supplier.phone}
              colors={colors}
            />
            <InfoRow
              icon="email"
              label="Email Address"
              value={supplier.email}
              colors={colors}
            />
            <InfoRow
              icon="location-on"
              label="Physical Address"
              value={supplier.address}
              colors={colors}
            />
          </View>
        </View>

        {/* Categories card */}
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
            Supplied Product Categories
          </Text>

          <View style={{ gap: 10 }}>
            {supplier.categories.map((cat) => (
              <View
                key={cat.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9999,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: cat.bg,
                  }}
                >
                  <MaterialIcons name={cat.icon} size={22} color={cat.color} />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {cat.label}
                </Text>
              </View>
            ))}
            {supplier.categories.length === 0 && (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No categories assigned</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <MaterialIcons
        name={icon}
        size={20}
        color={colors.textSecondary}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: colors.text,
            marginTop: 2,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}


