// Chart Card Component - Container for charts
import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  const { colors, isDark } = useTheme();

  return (
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
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

