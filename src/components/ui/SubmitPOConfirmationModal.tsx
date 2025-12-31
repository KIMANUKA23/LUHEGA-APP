// Submit PO Confirmation Modal Component
import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";

interface SubmitPOConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  poNumber: string;
  supplierName: string;
}

export default function SubmitPOConfirmationModal({
  visible,
  onClose,
  onConfirm,
  poNumber,
  supplierName,
}: SubmitPOConfirmationModalProps) {
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
        className="flex min-h-screen w-full flex-col items-end justify-end bg-black/40"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-t-xl bg-surface p-6 dark:bg-background-dark"
          style={{
            maxWidth: 448,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            backgroundColor: "#FFFFFF",
            padding: 24,
          }}
        >
          <View className="flex flex-col items-center text-center">
            <Text className="font-display text-2xl font-semibold text-on-surface dark:text-background-light">
              Confirm Purchase Order?
            </Text>
            <Text className="mt-4 font-body text-base text-secondary-text dark:text-gray-400 text-center">
              Are you sure you want to submit PO #{poNumber} to {supplierName}?
            </Text>
            <View className="mt-8 flex w-full justify-end space-x-3 flex-row">
              <TouchableOpacity
                onPress={onClose}
                className="flex h-12 flex-1 items-center justify-center rounded-full px-6 text-base font-bold text-secondary dark:text-gray-300"
                style={{
                  height: 48,
                  borderRadius: 9999,
                  paddingHorizontal: 24,
                }}
                activeOpacity={0.7}
              >
                <Text className="text-base font-bold text-secondary dark:text-gray-300" style={{ color: "#6C757D", fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-6 text-base font-bold text-white shadow-sm"
                style={{
                  height: 48,
                  borderRadius: 9999,
                  backgroundColor: "#007BFF",
                  paddingHorizontal: 24,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.22,
                  shadowRadius: 2.22,
                  elevation: 3,
                }}
                activeOpacity={0.8}
              >
                <Text className="text-base font-bold text-white" style={{ fontWeight: "700" }}>
                  Submit PO
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

