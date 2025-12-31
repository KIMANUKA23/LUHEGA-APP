// Language Context for English/Kiswahili
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "en" | "sw";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.back": "Back",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    // Profile
    "profile.title": "Profile",
    "profile.edit": "Edit Profile",
    "profile.changePassword": "Change Password",
    // Settings
    "settings.language": "Language",
    "settings.appearance": "Appearance",
    "settings.receipts": "Receipt Settings",
    // Feedback
    "feedback.title": "Send Feedback",
    "feedback.subject": "Subject",
    "feedback.message": "Message",
    "feedback.submit": "Submit Feedback",
    // Language
    "language.english": "English",
    "language.kiswahili": "Kiswahili",
    "language.select": "Select your preferred language",
  },
  sw: {
    // Common
    "common.save": "Hifadhi",
    "common.cancel": "Ghairi",
    "common.delete": "Futa",
    "common.edit": "Hariri",
    "common.back": "Rudi",
    "common.loading": "Inapakia...",
    "common.error": "Hitilafu",
    "common.success": "Imefanikiwa",
    // Profile
    "profile.title": "Wasifu",
    "profile.edit": "Hariri Wasifu",
    "profile.changePassword": "Badilisha Nenosiri",
    // Settings
    "settings.language": "Lugha",
    "settings.appearance": "Muonekano",
    "settings.receipts": "Mipangilio ya Risiti",
    // Feedback
    "feedback.title": "Tuma Maoni",
    "feedback.subject": "Somo",
    "feedback.message": "Ujumbe",
    "feedback.submit": "Tuma Maoni",
    // Language
    "language.english": "Kiingereza",
    "language.kiswahili": "Kiswahili",
    "language.select": "Chagua lugha unayopendelea",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "@luhega_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved language preference
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === "en" || saved === "sw")) {
          setLanguageState(saved as Language);
        } else {
          setLanguageState("en"); // Default to English
        }
      } catch (error) {
        console.log("Error loading language:", error);
        setLanguageState("en");
      } finally {
        setIsLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (newLanguage: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      setLanguageState(newLanguage);
    } catch (error) {
      console.log("Error saving language:", error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Don't render children until language is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

