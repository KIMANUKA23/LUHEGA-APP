// Contact Supplier Modal Component
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Linking, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import CustomDropdown from "./CustomDropdown";

interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface ContactSupplierModalProps {
  visible: boolean;
  onClose: () => void;
  suppliers?: Supplier[];
}

export default function ContactSupplierModal({
  visible,
  onClose,
  suppliers = [],
}: ContactSupplierModalProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Default suppliers if none provided
  const defaultSuppliers: Supplier[] = [
    {
      id: "1",
      name: "AutoParts Inc.",
      phone: "(123) 456-7890",
      email: "contact@autopartsco.com",
    },
    {
      id: "2",
      name: "Global Spares Ltd.",
      phone: "(234) 567-8901",
      email: "info@globalspares.com",
    },
  ];

  const supplierList = suppliers.length > 0 ? suppliers : defaultSuppliers;
  const supplierOptions = ["Search or select a supplier", ...supplierList.map((s) => s.name)];

  const handleSupplierSelect = (value: string) => {
    if (value && value !== "Search or select a supplier") {
      const supplier = supplierList.find((s) => s.name === value);
      setSelectedSupplier(supplier || null);
    } else {
      setSelectedSupplier(null);
    }
  };

  const handleCall = () => {
    if (!selectedSupplier) {
      Alert.alert("No Supplier", "Please select a supplier first");
      return;
    }
    const phoneNumber = selectedSupplier.phone.replace(/[^\d+]/g, "");
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert("Error", "Unable to make phone call");
    });
  };

  const handleEmail = () => {
    if (!selectedSupplier) {
      Alert.alert("No Supplier", "Please select a supplier first");
      return;
    }
    Linking.openURL(`mailto:${selectedSupplier.email}`).catch(() => {
      Alert.alert("Error", "Unable to open email client");
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/50 justify-end"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-background-light dark:bg-background-dark rounded-t-3xl rounded-b-3xl shadow-lg flex flex-col"
          style={{
            maxWidth: 448,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            backgroundColor: "#F8FAFC",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          {/* Handle */}
          <View className="py-3 flex justify-center">
            <View
              className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"
              style={{
                width: 40,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#D1D5DB",
              }}
            />
          </View>

          {/* Content */}
          <View className="p-6 pt-2">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Contact Supplier
            </Text>
            <View className="space-y-6">
              {/* Supplier Select */}
              <View>
                <Text className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Supplier
                </Text>
                <View className="relative">
                  <CustomDropdown
                    options={supplierOptions}
                    selectedValue={selectedSupplier?.name || "Search or select a supplier"}
                    onSelect={handleSupplierSelect}
                    placeholder="Search or select a supplier"
                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 py-3 pl-4 pr-10 rounded-xl"
                    style={{
                      height: 48,
                      borderWidth: 1,
                      borderColor: "#D1D5DB",
                      backgroundColor: "#FFFFFF",
                      borderRadius: 12,
                      paddingLeft: 16,
                      paddingRight: 40,
                    }}
                  />
                </View>
              </View>

              {/* Contact Options */}
              <View className="grid grid-cols-2 gap-4 flex-row">
                {/* Call Option */}
                <View className="text-center flex-1">
                  <TouchableOpacity
                    onPress={handleCall}
                    className="flex flex-col items-center justify-center h-24 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-xl"
                    style={{
                      height: 96,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 12,
                      backgroundColor: "#FFFFFF",
                    }}
                    activeOpacity={0.7}
                    disabled={!selectedSupplier}
                  >
                    <MaterialIcons name="call" size={36} color="#3B82F6" />
                  </TouchableOpacity>
                  {selectedSupplier && (
                    <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300 text-center">
                      {selectedSupplier.phone}
                    </Text>
                  )}
                </View>

                {/* Email Option */}
                <View className="text-center flex-1">
                  <TouchableOpacity
                    onPress={handleEmail}
                    className="flex flex-col items-center justify-center h-24 bg-white dark:bg-slate-700 border border-gray-200 dark:border-gray-600 rounded-xl"
                    style={{
                      height: 96,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 12,
                      backgroundColor: "#FFFFFF",
                    }}
                    activeOpacity={0.7}
                    disabled={!selectedSupplier}
                  >
                    <MaterialIcons name="mail" size={36} color="#3B82F6" />
                  </TouchableOpacity>
                  {selectedSupplier && (
                    <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300 truncate text-center" numberOfLines={1}>
                      {selectedSupplier.email}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

