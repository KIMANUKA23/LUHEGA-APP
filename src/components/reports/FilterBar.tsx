// Filter Bar Component - Time period selector for reports
import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "../../context/ThemeContext";

type FilterOption = {
  id: string;
  label: string;
};

type FilterBarProps = {
  options?: FilterOption[];
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
};

const defaultOptions: FilterOption[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export function FilterBar({
  options = defaultOptions,
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  const { colors, isDark } = useTheme();

  return (
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
        {options.map((option) => {
          const isActive = activeFilter === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => onFilterChange(option.id)}
              style={{
                height: 38,
                paddingHorizontal: 20,
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: isActive ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isActive ? colors.primary : colors.border,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isActive ? 0.2 : 0,
                shadowRadius: 2,
                elevation: isActive ? 3 : 0,
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? "700" : "600",
                  color: isActive ? "#FFFFFF" : colors.textSecondary,
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

