// Root Layout - Entry point for Expo Router with Google Fonts
import "../global.css";
import { Stack, useRouter } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Poppins_700Bold } from "@expo-google-fonts/poppins";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../src/context/AppContext";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { LuhegaLogo } from "../src/components/ui/LuhegaLogo";
import { LanguageProvider } from "../src/context/LanguageContext";
import { initOfflineDB } from "../src/lib/database";
import NetInfo from "@react-native-community/netinfo";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors if splash screen is already hidden
});

function NavigationContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [lastAuthStatus, setLastAuthStatus] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading) {
      setIsReady(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!isReady) return;

    // Detect auth status change
    // Detect auth status change
    if (isAuthenticated !== lastAuthStatus) {
      if (!isAuthenticated) {
        console.log("🔒 Not authenticated; routing to login.");
        // We use router.dismissAll() to clear stack if possible, then replace
        if (router.canDismiss()) {
          router.dismissAll();
        }
        router.replace("/(auth)/login-choice");
      } else if (isAuthenticated && user) {
        console.log("🔓 Authenticated as", user.role, "; routing to dashboard.");
        if (user.role === 'admin') {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/(tabs)");
        }
      }
      setLastAuthStatus(isAuthenticated);
    }
  }, [isAuthenticated, user, isReady, lastAuthStatus]);

  if (loading && !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <LuhegaLogo size={80} />
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen
        name="notifications/index"
        options={{ presentation: 'card' }}
      />
    </Stack>
  );
}

function RootLayoutContent({ fontsLoaded, fontError }: { fontsLoaded: boolean; fontError: Error | null }) {
  const [resourcesReady, setResourcesReady] = useState(false);
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);
  const { loading: authLoading } = useAuth();

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initialize = async () => {
      try {
        await initOfflineDB();
        console.log("✅ Database initialized");

        if (!mounted) return;

        NetInfo.fetch()
          .then(state => {
            if (mounted) {
              console.log(state.isConnected ? "🌐 Online" : "📴 Offline");
            }
          })
          .catch(err => console.log("Network check error:", err));

        unsubscribe = NetInfo.addEventListener(state => {
          if (mounted) {
            console.log(state.isConnected ? "🌐 Online" : "📴 Offline");
          }
        });
        setResourcesReady(true); // Signal that critical resources are loaded
      } catch (error) {
        console.log("❌ App init error:", error);
        // Even on error, we should probably let the app proceed or show error screen
        setResourcesReady(true);
      }
    };

    initialize().catch(err => console.log("Initialization error:", err));

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Hide native splash once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Keep native splash visible until fonts are loaded or error occurs
  }

  if (fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#DC2626' }}>Font Loading Error</Text>
      </View>
    );
  }

  // Show Loading Screen until the animation "burst" happens
  // The LoadingScreen component itself handles the logic of waiting for 'isReady' (resourcesReady)

  if (!splashAnimationFinished) {
    return (
      <LoadingScreen
        isReady={resourcesReady && !authLoading}
        onFinish={() => setSplashAnimationFinished(true)}
      />
    );
  }

  return (
    <LanguageProvider>
      <AppProvider>
        <NavigationContent />
      </AppProvider>
    </LanguageProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_700Bold,
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutContent fontsLoaded={fontsLoaded} fontError={fontError} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
