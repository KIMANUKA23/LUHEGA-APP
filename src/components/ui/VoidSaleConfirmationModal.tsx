// Void Sale Confirmation Modal Component - EXACT match to Stitch design
import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";

interface VoidSaleConfirmationModalProps {
  visible: boolean;
  saleId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VoidSaleConfirmationModal({
  visible,
  saleId,
  onConfirm,
  onCancel,
}: VoidSaleConfirmationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-black/40 px-4">
        <View className="w-full max-w-sm rounded-3xl bg-white p-6 text-center dark:bg-[#1C1B1F]">
          {/* Title */}
          <Text className="font-heading text-2xl font-bold text-[#1A1A1A] dark:text-slate-100">
            Confirm Void Sale?
          </Text>

          {/* Message */}
          <Text className="mt-4 text-base font-normal leading-relaxed text-[#49454F] dark:text-slate-300">
            Are you sure you want to void Sale #{saleId}? This will reverse all transactions.
          </Text>

          {/* Buttons */}
          <View className="mt-6 flex items-center justify-end gap-2 flex-row">
            <TouchableOpacity
              onPress={onCancel}
              className="flex h-10 items-center justify-center rounded-full bg-transparent px-6"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-bold text-secondary dark:text-slate-400">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="flex h-10 items-center justify-center rounded-full bg-error px-6"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-bold text-white">Void Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

