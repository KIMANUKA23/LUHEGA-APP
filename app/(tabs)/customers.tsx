// Customers List Screen - match existing style
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
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { formatTZS } from "../../src/utils/currency";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import * as customerService from "../../src/services/customerService";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalPurchases: number;
  outstandingDebt: number;
  lastVisit: string;
  createdAt?: string; // Add optional property if needed by service but not used in UI logic extensively
};

// Format last visit date
function formatLastVisit(dateString: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const filters = [
  { id: "all", label: "All" },
  { id: "with-debt", label: "With Debt" },
  { id: "no-debt", label: "No Debt" },
];

export default function CustomersScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/(auth)/login-choice");
    }
  }, [isAuthenticated, authLoading, router]);

  const loadCustomers = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const customerData = await customerService.getAllCustomers();
      const mappedCustomers: Customer[] = customerData.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalPurchases: c.totalPurchases,
        outstandingDebt: c.outstandingDebt,
        lastVisit: formatLastVisit(c.lastVisit),
      }));
      setCustomers(mappedCustomers);
    } catch (error) {
      console.log("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadCustomers();
    }
  }, [isAuthenticated, authLoading]);

  // Refresh customers when screen is focused - MUST be before early returns
  useFocusEffect(
    React.useCallback(() => {
      if (!isAuthenticated || authLoading) return;
      loadCustomers();
    }, [isAuthenticated, authLoading])
  );

  // Filter customers - MUST be before early returns
  const filteredCustomers = useMemo(() => {
    if (!isAuthenticated) return [];
    let result = customers;

    // Apply search filter
    if (query) {
      result = result.filter(
        (customer) =>
          customer.name.toLowerCase().includes(query.toLowerCase()) ||
          (customer.phone && customer.phone.includes(query)) ||
          (customer.email && customer.email.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Apply status filter
    if (activeFilter === "with-debt") {
      result = result.filter((c) => c.outstandingDebt > 0);
    } else if (activeFilter === "no-debt") {
      result = result.filter((c) => c.outstandingDebt === 0);
    }

    return result;
  }, [isAuthenticated, query, activeFilter, customers]);

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading customers...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.card} translucent={true} />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top, StatusBar.currentHeight || 0) + 32,
          paddingBottom: 24,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Customers
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 4,
          }}
        >
          {customers.length} total customers
        </Text>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, marginTop: 16 }}>
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
            placeholder="Search customers..."
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            alignItems: 'center',
            gap: 8,
            height: '100%'
          }}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={{
                  height: 38,
                  paddingHorizontal: 20,
                  borderRadius: 9999,
                  backgroundColor: isActive
                    ? (isDark ? "rgba(37, 99, 235, 0.2)" : "rgba(0, 123, 255, 0.16)")
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? "700" : "600",
                    color: isActive ? colors.primary : colors.textSecondary,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Customers List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 + insets.bottom, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredCustomers.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 60,
            }}
          >
            <MaterialIcons name="person-search" size={64} color={colors.border} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.textSecondary,
                marginTop: 16,
              }}
            >
              No customers found
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <TouchableOpacity
              key={customer.id}
              onPress={() => router.push(`/customers/${customer.id}`)}
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: customer.outstandingDebt > 0
                  ? (isDark ? "rgba(245, 158, 11, 0.5)" : "rgba(245, 158, 11, 0.5)")
                  : colors.border,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.05,
                shadowRadius: 10,
                elevation: 3,
              }}
              activeOpacity={0.8}
            >
              {/* Customer Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {/* Avatar */}
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 9999,
                      backgroundColor: customer.outstandingDebt > 0
                        ? "rgba(245, 158, 11, 0.1)"
                        : (isDark ? "rgba(37, 99, 235, 0.1)" : "rgba(0, 123, 255, 0.1)"),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color: customer.outstandingDebt > 0 ? colors.warning : colors.primary,
                      }}
                    >
                      {customer.name.split(" ").map((n) => n[0]).join("")}
                    </Text>
                  </View>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: colors.text,
                          fontFamily: "Poppins_700Bold",
                        }}
                      >
                        {customer.name}
                      </Text>
                      {/* Status Badge */}
                      {customer.outstandingDebt > 0 && (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 12,
                            backgroundColor: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.16)",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: colors.warning,
                            }}
                          >
                            DEBT
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                      {customer.phone || "No phone"}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </View>

              {/* Stats Row */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  gap: 16,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Total Purchases</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                      marginTop: 2,
                    }}
                  >
                    {formatTZS(customer.totalPurchases)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Outstanding</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: customer.outstandingDebt > 0 ? colors.warning : colors.success,
                      marginTop: 2,
                    }}
                  >
                    {customer.outstandingDebt > 0
                      ? formatTZS(customer.outstandingDebt)
                      : "No debt"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Last Visit</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                      marginTop: 2,
                    }}
                  >
                    {customer.lastVisit}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
