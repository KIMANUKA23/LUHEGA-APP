// KPI Card Component - Reusable metric card for reports
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

type KPICardProps = {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  onPress?: () => void;
};

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconColor = "#007BFF",
  iconBgColor = "rgba(0, 123, 255, 0.1)",
  onPress,
}: KPICardProps) {
  const { colors, isDark } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      style={{
        flex: 1,
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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "500" }}>{title}</Text>
        {icon && (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: iconBgColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name={icon} size={20} color={iconColor} />
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: colors.text,
          marginTop: 8,
          fontFamily: "Poppins_700Bold",
        }}
      >
        {value}
      </Text>
      {(subtitle || trend) && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
          {trend && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: trend.isPositive
                  ? (isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)")
                  : (isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)"),
              }}
            >
              <MaterialIcons
                name={trend.isPositive ? "trending-up" : "trending-down"}
                size={14}
                color={trend.isPositive ? colors.success : colors.error}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: trend.isPositive ? colors.success : colors.error,
                  marginLeft: 2,
                }}
              >
                {trend.isPositive ? "+" : ""}{trend.value}%
              </Text>
            </View>
          )}
          {subtitle && (
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text>
          )}
        </View>
      )}
    </Wrapper>
  );
}

