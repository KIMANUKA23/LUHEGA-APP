// Submit Return Confirmation Modal - EXACT match to Stitch design
import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";

interface SubmitReturnConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saleId: string;
}

export default function SubmitReturnConfirmationModal({
  visible,
  onClose,
  onConfirm,
  saleId,
}: SubmitReturnConfirmationModalProps) {
  const handleSubmit = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gray-900/30 p-4">
        <View className="w-full max-w-sm rounded-xl bg-neutral-100 dark:bg-neutral-900 p-6 flex flex-col gap-4 shadow-lg">
          <Text className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Confirm Return?
          </Text>
          <Text className="text-base text-neutral-800 dark:text-neutral-300">
            Are you sure you want to submit this return request for Sale #{saleId}?
          </Text>

          <View className="mt-4 flex w-full flex-row-reverse items-center gap-3">
            <TouchableOpacity
              onPress={handleSubmit}
              className="flex-1 items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-primary"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold leading-normal truncate">Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-secondary"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold leading-normal truncate">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

