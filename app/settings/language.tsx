// Language Settings Screen
import React, { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";
import { useLanguage } from "../../src/context/LanguageContext";
import { Alert } from "react-native";

const languages = [
  { id: "en" as const, label: "English", nativeName: "English", flag: "🇬🇧" },
  { id: "sw" as const, label: "Swahili", nativeName: "Kiswahili", flag: "🇹🇿" },
];

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const handleLanguageChange = async (langId: "en" | "sw") => {
    await setLanguage(langId);
    Alert.alert(
      t("common.success"),
      langId === "en" 
        ? "Language changed to English. Some content may require app restart."
        : "Lugha imebadilishwa kuwa Kiswahili. Baadhi ya maudhui yanaweza kuhitaji kuanzisha upya programu."
    );
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
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          {t("settings.language")}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 16,
          }}
        >
          {t("language.select")}
        </Text>

        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.id}
            onPress={() => handleLanguageChange(lang.id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 2,
              borderColor: language === lang.id ? colors.primary : "transparent",
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 32, marginRight: 12 }}>{lang.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 2,
                  }}
                >
                  {lang.label}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  {lang.nativeName}
                </Text>
              </View>
            </View>
            {language === lang.id && (
              <MaterialIcons name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <View
          style={{
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#EFF6FF",
            borderRadius: 12,
            padding: 16,
            marginTop: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
                marginLeft: 8,
              }}
            >
              Note
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
            Language changes will take effect immediately. Some content may still appear in English if translations are not yet available.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

