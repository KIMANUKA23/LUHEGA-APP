// Report Incident Screen - match existing style
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as unauthorizedService from "../../src/services/unauthorizedService";
import { useAuth } from "../../src/context/AuthContext";
import * as inventoryService from "../../src/services/inventoryService";
import { useTheme } from "../../src/context/ThemeContext";

const incidentTypes = [
  { id: "fraudulent_return", label: "Fraudulent Return", icon: "undo" },
  { id: "missing_stock", label: "Missing Stock", icon: "remove-circle" },
  { id: "wrong_delivery", label: "Wrong Delivery", icon: "local-shipping" },
  { id: "suspicious_movement", label: "Suspicious Movement", icon: "warning" },
  { id: "other", label: "Other", icon: "more-horiz" },
];

export default function ReportIncidentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  const [permission, requestPermission] = useCameraPermissions();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [partName, setPartName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchingPart, setSearchingPart] = useState(false);
  const [partId, setPartId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);

  const searchPart = async () => {
    if (!partName.trim()) {
      setPartId(null);
      return;
    }

    setSearchingPart(true);
    try {
      // Try to find by SKU first
      let product = await inventoryService.getProductBySku(partName.trim());

      // If not found by SKU, try to find by name
      if (!product) {
        const products = await inventoryService.getProducts();
        product = products.find(p =>
          p.name.toLowerCase().includes(partName.toLowerCase().trim())
        ) || null;
      }

      if (product) {
        setPartId(product.part_id);
      } else {
        setPartId(null);
        // Silent fail on auto-search to avoid annoying alerts while typing
      }
    } catch (error) {
      console.log("Error searching part:", error);
      setPartId(null);
    } finally {
      setSearchingPart(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only search if not recently scanned (avoids double search if scan triggers it)
      if (partName.length > 2) {
        searchPart();
      }
    }, 800);
    return () => clearTimeout(timeoutId);
  }, [partName]);

  const handleScan = async () => {
    if (!permission) return;

    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Permission Required", "Camera permission is needed to scan barcodes.");
        return;
      }
    }

    setScanned(false);
    setShowScanner(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setShowScanner(false);

    const sku = data.trim();
    setPartName(sku);

    // Immediate lookup for scanned item
    setSearchingPart(true);
    try {
      const product = await inventoryService.getProductBySku(sku);
      if (product) {
        setPartId(product.part_id);
        setPartName(product.name);
        Alert.alert("Product Found", `Linked to: ${product.name}`);
      } else {
        Alert.alert("Not Found", `No product found with SKU: ${sku}`, [
          { text: "Use as Name", onPress: () => setPartId(null) }
        ]);
        setPartId(null);
      }
    } catch (err) {
      console.log("Scan lookup error:", err);
      setPartId(null);
    } finally {
      setSearchingPart(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert("Required Field", "Please select an incident type");
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert("Required Fields", "Please fill in both title and description");
      return;
    }

    setSubmitting(true);
    try {
      const fullDescription = `Type: ${selectedType}\nTitle: ${title}\n\n${description}`;

      await unauthorizedService.createUnauthorizedSpare({
        part_id: partId,
        reported_by: user?.id || null,
        description: fullDescription,
        photo_url: null, // TODO: Add photo upload functionality
      });

      Alert.alert(
        "Success",
        "Incident report submitted successfully. Admin will review it.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.log("Error submitting report:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to submit report. Please try again."
      );
    } finally {
      setSubmitting(false);
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
          paddingTop: statusBarHeight + 8,
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
          <MaterialIcons name="close" size={24} color={colors.text} />
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
          Report Incident
        </Text>

        <View style={{ width: 40 }} />
        {submitting && (
          <ActivityIndicator size="small" color={colors.primary} style={{ position: "absolute", right: 16 }} />
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning Banner */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            padding: 12,
            backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.1)",
            borderRadius: 12,
            gap: 12,
          }}
        >
          <MaterialIcons name="warning" size={20} color={colors.error} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.error, lineHeight: 18 }}>
            Report unauthorized spares, suspicious activities, or discrepancies.
            This will be reviewed by admin.
          </Text>
        </View>

        {/* Incident Type */}
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
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Incident Type *
          </Text>
          <View style={{ gap: 8 }}>
            {incidentTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                onPress={() => setSelectedType(type.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: selectedType === type.id
                    ? (isDark ? "rgba(59, 130, 246, 0.2)" : "rgba(0, 123, 255, 0.1)")
                    : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedType === type.id ? colors.primary : colors.border,
                  gap: 12,
                }}
                activeOpacity={0.8}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9999,
                    backgroundColor: selectedType === type.id
                      ? (isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(0, 123, 255, 0.15)")
                      : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons
                    name={type.icon as any}
                    size={20}
                    color={selectedType === type.id ? colors.primary : colors.textSecondary}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: selectedType === type.id ? "600" : "500",
                    color: selectedType === type.id ? colors.primary : colors.text,
                  }}
                >
                  {type.label}
                </Text>
                {selectedType === type.id && (
                  <MaterialIcons name="check-circle" size={20} color={colors.primary} style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Details */}
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
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 16,
              fontFamily: "Poppins_700Bold",
            }}
          >
            Incident Details
          </Text>

          {/* Title */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 8 }}>
              Title *
            </Text>
            <TextInput
              style={{
                height: 54,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                fontSize: 15,
                color: colors.text,
              }}
              placeholder="Brief title for the incident"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Part Name with Scan */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 8 }}>
              Related Part (Optional)
            </Text>
            <View style={{ position: "relative" }}>
              <MaterialIcons
                name="inventory-2"
                size={20}
                color={colors.textSecondary}
                style={{ position: "absolute", left: 14, top: 17, zIndex: 1 }}
              />
              <TextInput
                style={{
                  height: 54,
                  borderRadius: 12,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: partId ? colors.success : colors.border,
                  paddingLeft: 44,
                  paddingRight: 50,
                  fontSize: 15,
                  color: colors.text,
                }}
                placeholder="Enter part name or scan SKU"
                placeholderTextColor={colors.textSecondary}
                value={partName}
                onChangeText={setPartName}
              />

              <TouchableOpacity
                onPress={handleScan}
                style={{
                  position: "absolute",
                  right: 8,
                  top: 7,
                  padding: 8,
                }}
              >
                <MaterialIcons name="qr-code-scanner" size={24} color={colors.primary} />
              </TouchableOpacity>

              {searchingPart && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={{ position: "absolute", right: 50, top: 17 }}
                />
              )}
              {partId && !searchingPart && (
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={colors.success}
                  style={{ position: "absolute", right: 14, top: 17 }}
                />
              )}
            </View>
          </View>

          {/* Description */}
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 8 }}>
              Description *
            </Text>
            <TextInput
              style={{
                height: 120,
                borderRadius: 12,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                fontSize: 15,
                color: colors.text,
                textAlignVertical: "top",
              }}
              placeholder="Describe what happened in detail..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
            />
          </View>
        </View>

        {/* Photo Upload Placeholder */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: colors.border,
            borderStyle: "dashed",
            padding: 24,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add-a-photo" size={32} color={colors.textSecondary} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginTop: 8 }}>
            Add Photo Evidence
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
            Optional but recommended
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !selectedType || !title.trim() || !description.trim()}
          style={{
            height: 56,
            borderRadius: 12,
            backgroundColor: submitting || !selectedType || !title.trim() || !description.trim() ? colors.border : colors.error,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: colors.error,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="report" size={22} color="#FFFFFF" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
                Submit Report
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
            }}
          />

          {/* Close Button */}
          <TouchableOpacity
            onPress={() => setShowScanner(false)}
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              padding: 10,
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 20,
            }}
          >
            <MaterialIcons name="close" size={30} color="#FFF" />
          </TouchableOpacity>

          {/* Overlay Frame */}
          <View style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: "center", alignItems: "center"
          }}>
            <View style={{
              width: 250, height: 250,
              borderWidth: 2, borderColor: "#00FF00",
              backgroundColor: "transparent"
            }} />
            <Text style={{ color: "#FFF", marginTop: 20, fontSize: 16, fontWeight: "bold" }}>
              Align barcode within frame
            </Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}
