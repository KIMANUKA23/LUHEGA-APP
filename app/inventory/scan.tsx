// Barcode Scanner Screen - Match to provided design
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  TextInput,
  Modal,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";

const { width, height } = Dimensions.get("window");
const SCANNER_SIZE = Math.min(width * 0.8, 320); // Square frame, max 320px

export default function BarcodeScanner() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { colors, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scanning line animation
    const animate = () => {
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    animate();
  }, []);

  const handleClose = () => {
    router.back();
  };

  const handleFlashlight = () => {
    setFlashlightOn(!flashlightOn);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return; // Prevent multiple scans
    const trimmedData = data.trim();
    if (!trimmedData) return;

    console.log('Barcode scanned:', trimmedData);
    setScanned(true);

    // Process the scanned barcode
    handleScanSuccess(trimmedData);

    // Reset after 3 seconds to allow scanning again
    setTimeout(() => {
      setScanned(false);
    }, 3000);
  };

  const handleManualEntry = () => {
    setShowManualEntry(true);
  };

  const handleSubmitManualBarcode = () => {
    if (manualBarcode.trim()) {
      if (params.returnTo) {
        // Return to the screen that opened the scanner with the barcode
        router.push({
          pathname: params.returnTo as any,
          params: { scannedBarcode: manualBarcode.trim() },
        });
      } else {
        router.back();
      }
    }
  };

  const handleScanSuccess = (barcode: string) => {
    console.log('Processing scan success for barcode:', barcode);
    console.log('Return to screen:', params.returnTo);

    // This would be called when a barcode is successfully scanned
    if (params.returnTo) {
      // Special handling for staff dashboard - use (tabs) path
      const targetPath = (params.returnTo === "/" || params.returnTo === "/(tabs)" || !params.returnTo)
        ? "/(tabs)"
        : params.returnTo;

      console.log('Navigating to targetPath:', targetPath);

      // Use push to ensure we land on the screen and trigger effects
      router.push({
        pathname: targetPath as any,
        params: { scannedBarcode: barcode, _t: Date.now() },
      });
    } else {
      console.log('No returnTo param, going back');
      router.back();
    }
  };

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCANNER_SIZE],
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#0F1115" }}>
      <ExpoStatusBar style="light" backgroundColor="#0F1115" />

      {/* Camera Background */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#1A1D24",
        }}
      />

      {/* Header */}
      <View
        style={{
          paddingTop: statusBarHeight + 24,
          paddingBottom: 24,
          paddingHorizontal: 24,
          flexDirection: "row",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={handleClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Camera Viewport */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        {/* Scan Frame */}
        <View
          style={{
            width: SCANNER_SIZE,
            height: SCANNER_SIZE,
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Corner Brackets */}
          {/* Top-left */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 48,
              height: 48,
              borderTopWidth: 4,
              borderLeftWidth: 4,
              borderColor: "#007AFF",
              borderTopLeftRadius: 24,
            }}
          />
          {/* Top-right */}
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 48,
              height: 48,
              borderTopWidth: 4,
              borderRightWidth: 4,
              borderColor: "#007AFF",
              borderTopRightRadius: 24,
            }}
          />
          {/* Bottom-left */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 48,
              height: 48,
              borderBottomWidth: 4,
              borderLeftWidth: 4,
              borderColor: "#007AFF",
              borderBottomLeftRadius: 24,
            }}
          />
          {/* Bottom-right */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 48,
              height: 48,
              borderBottomWidth: 4,
              borderRightWidth: 4,
              borderColor: "#007AFF",
              borderBottomRightRadius: 24,
            }}
          />

          {/* Camera View */}
          {!permission ? (
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
              >
                Requesting camera permission...
              </Text>
            </View>
          ) : !permission.granted ? (
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
            >
              <MaterialIcons name="camera-alt" size={48} color="rgba(255, 255, 255, 0.5)" />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginTop: 16,
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                Camera permission required
              </Text>
              <TouchableOpacity
                onPress={requestPermission}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: "#007AFF",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Grant Permission
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{
                barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "itf14"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              enableTorch={flashlightOn}
            />
          )}

          {/* Scanning Line Animation */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 16,
              right: 16,
              height: 2,
              backgroundColor: "#007AFF",
              transform: [{ translateY }],
              shadowColor: "#007AFF",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 10,
              elevation: 10,
            }}
          />
        </View>

        {/* Instruction Text */}
        <Text
          style={{
            marginTop: 48,
            fontSize: 16,
            fontWeight: "500",
            color: "rgba(255, 255, 255, 0.8)",
            textAlign: "center",
          }}
        >
          Align barcode within the frame to scan
        </Text>
      </View>

      {/* Bottom Controls */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 48,
          paddingTop: 24,
          zIndex: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 40,
          }}
        >
          {/* Flashlight Button */}
          <TouchableOpacity
            onPress={handleFlashlight}
            style={{ alignItems: "center", gap: 12 }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 9999,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name={flashlightOn ? "flashlight-on" : "flashlight-off"}
                size={24}
                color="rgba(255, 255, 255, 0.9)"
              />
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Flashlight
            </Text>
          </TouchableOpacity>

          {/* Manual Entry Button */}
          <TouchableOpacity
            onPress={handleManualEntry}
            style={{ alignItems: "center", gap: 12 }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 9999,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons
                name="edit"
                size={24}
                color="rgba(255, 255, 255, 0.9)"
              />
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "rgba(255, 255, 255, 0.9)",
              }}
            >
              Manual Entry
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Manual Entry Modal */}
      <Modal
        visible={showManualEntry}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowManualEntry(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 48,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  fontFamily: "Poppins_700Bold",
                }}
              >
                Enter Barcode Manually
              </Text>
              <TouchableOpacity
                onPress={() => setShowManualEntry(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                Barcode / SKU
              </Text>
              <TextInput
                style={{
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 16,
                  fontSize: 16,
                  color: colors.text,
                }}
                placeholder="Enter barcode or SKU..."
                placeholderTextColor={colors.textSecondary}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                autoFocus
                onSubmitEditing={handleSubmitManualBarcode}
              />
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowManualEntry(false)}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textSecondary }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitManualBarcode}
                style={{
                  flex: 1,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFFFFF" }}>
                  Use Barcode
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
