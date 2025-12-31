// Damaged Return Report Modal - EXACT match to Stitch design
import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import CustomDropdown from "./CustomDropdown";

interface DamagedReturnReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    severity: string;
    action: string;
    photos?: string[];
  }) => void;
  productName: string;
  quantity: number;
  reason: string;
}

export default function DamagedReturnReportModal({
  visible,
  onClose,
  onSubmit,
  productName,
  quantity,
  reason,
}: DamagedReturnReportModalProps) {
  const [severity, setSeverity] = useState<string>("");
  const [action, setAction] = useState<string>("");

  const severityOptions = ["Select severity", "Minor", "Moderate", "Severe"];
  const actionOptions = ["Select action", "Scrap", "Repairable", "Return to Vendor"];

  const handleSubmit = () => {
    if (severity && action && severity !== "Select severity" && action !== "Select action") {
      onSubmit({
        severity,
        action,
      });
      // Reset form
      setSeverity("");
      setAction("");
      onClose();
    }
  };

  const handleUploadPhoto = () => {
    // TODO: Implement photo upload functionality
    console.log("Upload photo pressed");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/30 justify-end">
        <View className="flex flex-col items-stretch overflow-hidden rounded-t-xl bg-neutral-100 dark:bg-neutral-900">
          {/* Drag Handle */}
          <TouchableOpacity
            onPress={onClose}
            className="flex h-5 w-full items-center justify-center pt-3"
            activeOpacity={0.7}
          >
            <View className="h-1 w-9 rounded-full bg-neutral-400 dark:bg-neutral-800" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-neutral-900 dark:text-neutral-100 font-heading tracking-tight text-2xl font-bold leading-tight px-6 text-left pb-4 pt-4">
            Damaged Return Report
          </Text>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="flex flex-col gap-4 px-6 py-4">
              {/* Product Information Card */}
              <View className="rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-800/50 p-4">
                <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-400">Product Name</Text>
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{productName}</Text>
                <View className="mt-3 flex gap-4 flex-row">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-400">Quantity</Text>
                    <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{quantity}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-400">Reason</Text>
                    <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{reason}</Text>
                  </View>
                </View>
              </View>

              {/* Severity of Damage */}
              <View>
                <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Severity of Damage
                </Text>
                <CustomDropdown
                  options={severityOptions}
                  selectedValue={severity || "Select severity"}
                  onSelect={(value) => setSeverity(value)}
                  placeholder="Select severity"
                />
              </View>

              {/* Action Needed */}
              <View>
                <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Action Needed</Text>
                <CustomDropdown
                  options={actionOptions}
                  selectedValue={action || "Select action"}
                  onSelect={(value) => setAction(value)}
                  placeholder="Select action"
                />
              </View>

              {/* Upload Additional Photos */}
              <View>
                <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Upload Additional Photos
                </Text>
                <TouchableOpacity
                  onPress={handleUploadPhoto}
                  className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-800 px-6 py-10"
                  activeOpacity={0.7}
                  style={{
                    borderStyle: "dashed",
                    borderWidth: 2,
                    borderColor: "#D1D5DB",
                  }}
                >
                  <View className="text-center items-center">
                    <MaterialIcons name="add-photo-alternate" size={48} color="#9CA3AF" />
                    <View className="mt-4 flex text-sm leading-6 text-neutral-800 dark:text-neutral-400 flex-row items-center">
                      <Text className="font-semibold text-primary">Upload a file</Text>
                      <Text className="pl-1">or drag and drop</Text>
                    </View>
                    <Text className="text-xs leading-5 text-neutral-800 dark:text-neutral-500 mt-1">
                      PNG, JPG, GIF up to 10MB
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View className="flex px-6 py-4 justify-center bg-neutral-100 dark:bg-neutral-900">
            <TouchableOpacity
              onPress={handleSubmit}
              className="flex min-w-[84px] max-w-[480px] items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-primary"
              activeOpacity={0.8}
              disabled={!severity || !action || severity === "Select severity" || action === "Select action"}
            >
              <Text className="text-white text-base font-bold leading-normal truncate">Create Damage Report</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View className="h-4 bg-neutral-100 dark:bg-neutral-900" />
        </View>
      </View>
    </Modal>
  );
}

