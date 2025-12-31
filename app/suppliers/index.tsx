import React, { useMemo, useState, useEffect } from "react";
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
import { useTheme } from "../../src/context/ThemeContext";
import { getSuppliers, type Supplier as ServiceSupplier } from "@/services/supplierService";

type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email?: string;
};

export default function SuppliersListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [query, setQuery] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch suppliers when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSuppliers();
    }, [])
  );

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const serviceSuppliers = await getSuppliers();
      // Convert service supplier format to UI format
      const convertedSuppliers: Supplier[] = serviceSuppliers.map(s => ({
        id: s.supplier_id,
        name: s.name,
        contact: s.contact_name || "N/A",
        phone: s.phone || "N/A",
        email: s.email || undefined,
      }));
      setSuppliers(convertedSuppliers);
    } catch (error) {
      console.log('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(query.toLowerCase()) ||
        supplier.contact.toLowerCase().includes(query.toLowerCase()) ||
        (supplier.phone && supplier.phone.toLowerCase().includes(query.toLowerCase()))
    );
  }, [query, suppliers]);

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
          Suppliers
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Search */}
        <View style={{ position: "relative" }}>
          <MaterialIcons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={{
              position: "absolute",
              left: 16,
              top: 17,
              zIndex: 1,
            }}
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
            placeholder="Search suppliers..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Loading State */}
        {loading && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading suppliers...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && filteredSuppliers.length === 0 && suppliers.length === 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="business" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No suppliers found
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: "center" }}>
              Add your first supplier to get started
            </Text>
          </View>
        )}

        {/* No Search Results */}
        {!loading && filteredSuppliers.length === 0 && suppliers.length > 0 && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <MaterialIcons name="search-off" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No suppliers match your search
            </Text>
          </View>
        )}

        {/* Supplier cards */}
        {!loading && filteredSuppliers.map((supplier) => (
          <TouchableOpacity
            key={supplier.id}
            onPress={() => router.push(`/suppliers/${supplier.id}`)}
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
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.text,
                fontFamily: "Poppins_700Bold",
              }}
            >
              {supplier.name}
            </Text>
            <View style={{ marginTop: 12, gap: 8 }}>
              {supplier.contact && supplier.contact !== "N/A" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="person" size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize: 14, color: colors.text }}>{supplier.contact}</Text>
                </View>
              )}
              {supplier.phone && supplier.phone !== "N/A" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="phone" size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize: 14, color: colors.text }}>{supplier.phone}</Text>
                </View>
              )}
              {supplier.email && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialIcons name="email" size={18} color={colors.textSecondary} />
                  <Text style={{ fontSize: 14, color: colors.text }}>{supplier.email}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        onPress={() => router.push("/suppliers/new")}
        style={{
          position: "absolute",
          right: 20,
          bottom: 90,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 5,
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}


