// Notifications Screen - match existing style
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as notificationService from "../../src/services/notificationService";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

type NotificationType = "low_stock" | "debt_overdue" | "sale" | "order" | "system" | "return";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRoute?: string;
};

// Format timestamp to relative time
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const filters = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "low_stock", label: "Stock" },
  { id: "return", label: "Returns" },
  { id: "debt_overdue", label: "Debts" },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const dbNotifications = await notificationService.getNotifications(user?.id || null, isAdmin);

      // Map database notifications to UI format
      const mappedNotifications: Notification[] = dbNotifications.map(n => {
        // Parse type and create title/message
        let type: NotificationType = "system";
        let title = "Notification";
        let actionRoute: string | undefined;

        // Handle specific types
        if (n.type === "return_request") {
          type = "return";
          title = "New Return Request";
          actionRoute = "/returns/list";
        } else if (n.type === "return_approved") {
          type = "return";
          title = "Return Approved";
          actionRoute = "/returns/list";
        } else if (n.type === "return_rejected") {
          type = "return";
          title = "Return Rejected";
          actionRoute = "/returns/list";
        } else if (n.type.includes("stock") || n.type.includes("low")) {
          type = "low_stock";
          title = "Low Stock Alert";
          actionRoute = "/inventory";
        } else if (n.type.includes("debt") || n.type.includes("overdue")) {
          type = "debt_overdue";
          title = "Payment Overdue";
          actionRoute = "/debts";
        } else if (n.type.includes("sale")) {
          type = "sale";
          title = "New Sale";
          actionRoute = "/sales/history";
        } else if (n.type.includes("order") || n.type.includes("purchase")) {
          type = "order";
          title = "Purchase Order";
          actionRoute = "/purchase-orders";
        } else {
          type = "system";
          title = "System Notification";
        }

        return {
          id: n.notification_id,
          type,
          title,
          message: n.message,
          timestamp: formatTimestamp(n.created_at),
          read: n.status === "read",
          actionRoute,
        };
      });

      setNotifications(mappedNotifications);
    } catch (error) {
      console.log("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id, isAdmin]);

  // Refresh notifications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [user?.id, isAdmin])
  );

  const handleMarkAllRead = async () => {
    await notificationService.markAllNotificationsAsRead(user?.id || null, isAdmin);
    loadNotifications();
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;
    if (activeFilter === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === activeFilter);
  }, [activeFilter, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading notifications...</Text>
      </View>
    );
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "low_stock": return { icon: "inventory", color: colors.warning, bg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)" };
      case "debt_overdue": return { icon: "account-balance-wallet", color: colors.error, bg: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)" };
      case "sale": return { icon: "point-of-sale", color: colors.success, bg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)" };
      case "order": return { icon: "local-shipping", color: colors.primary, bg: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(0, 123, 255, 0.15)" };
      case "return": return { icon: "assignment-return", color: colors.primary, bg: isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)" };
      case "system": return { icon: "settings", color: colors.textSecondary, bg: isDark ? "rgba(107, 114, 128, 0.2)" : "rgba(107, 114, 128, 0.15)" };
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
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          backgroundColor: colors.background,
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

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.text,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {unreadCount} unread
            </Text>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="done-all" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              Alert.alert(
                "Clear All",
                "Are you sure you want to permanently delete all notifications?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        setLoading(true);
                        await notificationService.deleteAllNotifications(user?.id || null, isAdmin);
                        await loadNotifications();
                      } catch (error) {
                        console.log("Error clearing notifications:", error);
                        Alert.alert("Error", "Failed to clear notifications");
                      } finally {
                        setLoading(false);
                      }
                    }
                  }
                ]
              );
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-sweep" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={{ height: 52, backgroundColor: colors.background }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 10,
            alignItems: "center",
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
                  justifyContent: "center",
                  borderRadius: 20,
                  backgroundColor: isActive
                    ? (isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(0, 123, 255, 0.16)")
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.15 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 3 : 0,
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? "700" : "600",
                    color: isActive ? colors.primary : colors.text,
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 40) }}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotifications.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <MaterialIcons name="notifications-off" size={64} color={colors.border} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary, marginTop: 16 }}>
              No notifications
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
              You're all caught up!
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => {
            const iconStyle = getNotificationIcon(notification.type);
            return (
              <TouchableOpacity
                key={notification.id}
                onPress={async () => {
                  // Mark as read if unread
                  if (!notification.read) {
                    try {
                      await notificationService.markNotificationAsRead(notification.id);
                      // Reload notifications to update UI
                      loadNotifications();
                    } catch (error) {
                      console.log("Error marking notification as read:", error);
                    }
                  }
                  // Navigate if action route exists
                  if (notification.actionRoute) {
                    router.push(notification.actionRoute);
                  }
                }}
                style={{
                  flexDirection: "row",
                  padding: 16,
                  backgroundColor: notification.read
                    ? colors.card
                    : (isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(0, 123, 255, 0.06)"),
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
                activeOpacity={0.7}
              >
                {/* Unread indicator */}
                {!notification.read && (
                  <View
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                      marginTop: -4,
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Icon */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: iconStyle.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialIcons name={iconStyle.icon as any} size={24} color={iconStyle.color} />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: notification.read ? "500" : "700",
                      color: colors.text,
                    }}
                  >
                    {notification.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: notification.read ? colors.textSecondary : colors.text,
                      marginTop: 2,
                      lineHeight: 20,
                      fontWeight: notification.read ? "400" : "500",
                    }}
                    numberOfLines={2}
                  >
                    {notification.message}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: notification.read ? "400" : "600" }}>
                    {notification.timestamp}
                  </Text>
                </View>

                {notification.actionRoute && (
                  <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} style={{ alignSelf: "center" }} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}


