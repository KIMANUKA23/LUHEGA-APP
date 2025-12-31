// Remove Item Modal Component - EXACT match to Stitch design
import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";

interface RemoveItemModalProps {
  visible: boolean;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RemoveItemModal({
  visible,
  itemName,
  onConfirm,
  onCancel,
}: RemoveItemModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="absolute inset-0 flex min-h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark p-4 overflow-hidden">
        {/* Scrim/Overlay */}
        <View className="absolute inset-0 bg-black/40" />

        {/* Modal */}
        <View className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1C1E]">
          {/* Content */}
          <View className="flex flex-col items-center p-6 text-center">
            <Text className="font-heading text-2xl font-semibold text-[#1F2937] dark:text-slate-100">
              Remove Item?
            </Text>
            <Text className="mt-4 text-base font-normal leading-normal text-[#1F2937] dark:text-slate-300">
              Are you sure you want to remove '{itemName}' from the cart?
            </Text>
          </View>

          {/* Buttons */}
          <View className="flex items-center justify-end gap-2 px-6 pb-6 pt-2 flex-row">
            <TouchableOpacity
              onPress={onCancel}
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full px-6 py-2"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium tracking-wide text-[#6C757D] dark:text-slate-400">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full bg-[#EF4444] px-6 py-2"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-medium tracking-wide text-white">Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

