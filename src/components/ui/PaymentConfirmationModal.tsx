// Payment Confirmation Modal Component - EXACT match to Stitch design
import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { formatTZS } from "@/utils/currency";

interface PaymentConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  customerName: string;
  saleId: string;
  amountPaid: number; // in TZS
  remainingBalance: number; // in TZS
}

export default function PaymentConfirmationModal({
  visible,
  onClose,
  onConfirm,
  customerName,
  saleId,
  amountPaid,
  remainingBalance,
}: PaymentConfirmationModalProps) {
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
        className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10 flex items-end justify-center"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          justifyContent: "flex-end",
        }}
      >
        <View
          className="bg-background-light dark:bg-background-dark w-full max-w-sm rounded-t-xl p-6 flex flex-col gap-6"
          style={{
            backgroundColor: "#F5F7F8",
            width: "100%",
            maxWidth: 384,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            padding: 24,
          }}
        >
          {/* Title */}
          <Text className="text-2xl font-heading font-bold text-center text-[#0c141d] dark:text-gray-100" style={{ fontWeight: "700", fontSize: 24 }}>
            Confirm Payment?
          </Text>

          {/* Confirmation Message */}
          <Text className="text-center text-base text-gray-600 dark:text-gray-300" style={{ fontSize: 16, color: "#4B5563", textAlign: "center" }}>
            Are you sure you want to record {formatTZS(amountPaid)} payment for {customerName} for Sale #{saleId}?
          </Text>

          {/* Payment Details */}
          <View className="flex flex-col gap-4">
            <View className="flex justify-between items-center text-sm flex-row">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Amount Paid</Text>
              <Text className="font-bold text-[#0c141d] dark:text-gray-100 text-sm" style={{ fontWeight: "700", fontSize: 14 }}>
                {formatTZS(amountPaid)}
              </Text>
            </View>
            <View className="border-t border-gray-200 dark:border-gray-700" style={{ height: 1, backgroundColor: "#E5E7EB" }} />
            <View className="flex justify-between items-center text-sm flex-row">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Remaining Balance After Payment</Text>
              <Text className="font-bold text-[#0c141d] dark:text-gray-100 text-sm" style={{ fontWeight: "700", fontSize: 14 }}>
                {formatTZS(remainingBalance)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex gap-4 w-full flex-row">
            <TouchableOpacity
              onPress={onClose}
              className="w-full bg-secondary/20 dark:bg-secondary/30 text-secondary dark:text-gray-200 font-bold h-12 rounded-full text-base flex items-center justify-center"
              style={{
                flex: 1,
                backgroundColor: "rgba(108, 117, 125, 0.2)",
                height: 48,
                borderRadius: 9999,
              }}
              activeOpacity={0.7}
            >
              <Text className="text-secondary dark:text-gray-200 font-bold text-base" style={{ fontWeight: "700", fontSize: 16, color: "#6C757D" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="w-full bg-primary text-white font-bold h-12 rounded-full text-base flex items-center justify-center"
              style={{
                flex: 1,
                backgroundColor: "#007BFF",
                height: 48,
                borderRadius: 9999,
              }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-base" style={{ fontWeight: "700", fontSize: 16 }}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

