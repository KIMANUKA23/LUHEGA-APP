// Approve/Reject Return Modal - EXACT match to Stitch design
import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput } from "react-native";

interface ApproveRejectReturnModalProps {
  visible: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (rejectionReason: string) => void;
  returnId: string;
  itemName: string;
  quantity: number;
  reason: string;
}

export default function ApproveRejectReturnModal({
  visible,
  onClose,
  onApprove,
  onReject,
  returnId,
  itemName,
  quantity,
  reason,
}: ApproveRejectReturnModalProps) {
  const [rejectionReason, setRejectionReason] = useState<string>("");

  const handleApprove = () => {
    onApprove();
    setRejectionReason("");
    onClose();
  };

  const handleReject = () => {
    onReject(rejectionReason);
    setRejectionReason("");
    onClose();
  };

  const handleCancel = () => {
    setRejectionReason("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="relative flex min-h-screen w-full flex-col items-center justify-center bg-black/30 p-4">
        <View className="w-full max-w-md overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-900 shadow-lg">
          {/* Content */}
          <View className="p-6">
            <Text className="text-neutral-900 dark:text-neutral-100 font-heading text-2xl font-bold leading-tight tracking-tight text-center">
              Approve/Reject Return?
            </Text>
            <Text className="mt-2 text-center text-sm font-medium text-neutral-800 dark:text-neutral-300">
              Return ID: #{returnId}
            </Text>

            {/* Request Summary */}
            <View className="mt-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-800/50 p-4">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Request Summary</Text>
              <View className="mt-2 space-y-1">
                <View className="flex justify-between items-center flex-row">
                  <Text className="text-sm text-neutral-800 dark:text-neutral-300">Item:</Text>
                  <Text className="text-sm text-neutral-800 dark:text-neutral-300">{itemName}</Text>
                </View>
                <View className="flex justify-between items-center flex-row">
                  <Text className="text-sm text-neutral-800 dark:text-neutral-300">Quantity:</Text>
                  <Text className="text-sm text-neutral-800 dark:text-neutral-300">{quantity}</Text>
                </View>
                <View className="flex justify-between items-center flex-row">
                  <Text className="text-sm text-neutral-800 dark:text-neutral-300">Reason:</Text>
                  <Text className="text-sm text-neutral-800 dark:text-neutral-300 flex-1 text-right ml-2" numberOfLines={2}>
                    {reason}
                  </Text>
                </View>
              </View>
            </View>

            {/* Rejection Reason Input */}
            <View className="mt-4">
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Reason for Rejection (if rejecting)
              </Text>
              <TextInput
                placeholder="e.g., Item has been used"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={3}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                style={{
                  marginTop: 4,
                  width: "100%",
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  backgroundColor: "#FFFFFF",
                  padding: 8,
                  fontSize: 14,
                  color: "#1F2937",
                  textAlignVertical: "top",
                  minHeight: 72, // 3 rows
                }}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex flex-col gap-3 bg-neutral-200/50 dark:bg-neutral-900/50 p-4">
            <TouchableOpacity
              onPress={handleApprove}
              className="flex min-w-[84px] items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-success"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold leading-normal truncate">Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleReject}
              className="flex min-w-[84px] items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-error"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold leading-normal truncate">Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCancel}
              className="flex min-w-[84px] items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-secondary"
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

