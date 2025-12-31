// Theme Context for Dark/Light Mode
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "auto";

type ThemeContextType = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  colors: {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    error: string;
    success: string;
    warning: string;
  };
};

const lightColors = {
  background: "#F8F9FA",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#E0E2E6",
  primary: "#007BFF",
  error: "#DC2626",
  success: "#16A34A",
  warning: "#D97706",
};

const darkColors = {
  background: "#0F172A",
  surface: "#1E293B",
  card: "#1E293B",
  text: "#F9FAFB",
  textSecondary: "#9CA3AF",
  border: "#374151",
  primary: "#3B82F6",
  error: "#EF4444",
  success: "#22C55E",
  warning: "#F59E0B",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@luhega_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        // Ensure we only set valid theme modes and handle null/undefined
        if (saved && (saved === "light" || saved === "dark" || saved === "auto")) {
          setModeState(saved as ThemeMode);
        } else {
          // Default to auto if no valid saved value
          setModeState("auto");
        }
      } catch (error) {
        console.log("Error loading theme:", error);
        // Default to auto on error
        setModeState("auto");
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Determine if dark mode should be active
  const isDark = mode === "dark" || (mode === "auto" && systemColorScheme === "dark");

  const setMode = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
      setModeState(newMode);
    } catch (error) {
      console.log("Error saving theme:", error);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  // Don't render children until theme is loaded to avoid flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

