// Expo App Configuration
// This file loads environment variables and makes them available via expo-constants
require('dotenv').config();

module.exports = {
  expo: {
    name: "luhega-app",
    slug: "luhega-app-v1",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    scheme: "luhega-app",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.luhega.app",
      infoPlist: {
        NSCameraUsageDescription: "This app uses the camera to scan barcodes for inventory management."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.luhega.app",
      edgeToEdgeEnabled: true,
      permissions: [
        "CAMERA"
      ]
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to scan barcodes."
        }
      ]
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // These will be available via Constants.expoConfig.extra
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jfrydmnmbelwxbdsuepo.supabase.co',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnlkbW5tYmVsd3hiZHN1ZXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTQ4OTIsImV4cCI6MjA3OTAzMDg5Mn0.2WMQX3dXZveRj2rEvHFpw0QlHq0O1GveWiUWD5Iiy9k',
    }
  }
};

