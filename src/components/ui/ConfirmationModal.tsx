// Confirmation Modal Component - EXACT match to Stitch design
import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "delete" | "warning" | "info";
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "delete",
}: ConfirmationModalProps) {
  const getIconAndColors = () => {
    switch (type) {
      case "delete":
        return {
          icon: "delete",
          iconBg: "#F9DEDC",
          iconColor: "#410E0B",
          buttonBg: "#EF4444",
          buttonText: "#FFFFFF",
        };
      case "warning":
        return {
          icon: "warning",
          iconBg: "#FFF3CD",
          iconColor: "#856404",
          buttonBg: "#FFC107",
          buttonText: "#000000",
        };
      case "info":
        return {
          icon: "info",
          iconBg: "#D1ECF1",
          iconColor: "#0C5460",
          buttonBg: "#007BFF",
          buttonText: "#FFFFFF",
        };
      default:
        return {
          icon: "delete",
          iconBg: "#F9DEDC",
          iconColor: "#410E0B",
          buttonBg: "#EF4444",
          buttonText: "#FFFFFF",
        };
    }
  };

  const { icon, iconBg, iconColor, buttonBg, buttonText } = getIconAndColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="absolute inset-0 z-10 flex items-center justify-center bg-scrim p-4">
        <View className="flex w-full max-w-sm flex-col rounded-xl bg-surface-light px-6 pb-6 pt-6">
          <View className="mb-4 flex flex-col items-start space-y-4">
            <View
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: iconBg }}
            >
              <MaterialIcons name={icon as any} size={24} color={iconColor} />
            </View>
            <Text className="font-display text-2xl font-normal leading-tight text-on-surface-light">
              {title}
            </Text>
          </View>
          <Text className="mb-6 font-body text-sm leading-normal text-on-surface-variant-light">
            {message}
          </Text>
          <View className="flex w-full items-center justify-end space-x-2 flex-row">
            <TouchableOpacity
              onPress={onCancel}
              className="flex h-10 items-center justify-center rounded-full px-6"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium tracking-wide text-secondary">{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="flex h-10 items-center justify-center rounded-full px-6"
              style={{ backgroundColor: buttonBg }}
              activeOpacity={0.8}
            >
              <Text className="text-sm font-medium tracking-wide" style={{ color: buttonText }}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

