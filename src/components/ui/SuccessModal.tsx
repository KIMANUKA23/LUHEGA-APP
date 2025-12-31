// Success Modal Component - EXACT match to Stitch design
import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
}

export default function SuccessModal({
  visible,
  title,
  message,
  primaryButtonText = "View Receipt",
  secondaryButtonText = "Done",
  onPrimaryPress,
  onSecondaryPress,
}: SuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className="relative flex h-auto min-h-screen w-full flex-col items-center justify-center p-4"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <View
          className="flex w-full max-w-md flex-col items-center justify-center rounded-xl bg-surface-light dark:bg-surface-dark p-6 text-center shadow-lg"
          style={{
            maxWidth: 448,
            backgroundColor: "#ffffff",
            borderRadius: 12,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          {/* Icon */}
          <View
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/20"
            style={{
              width: 80,
              height: 80,
              backgroundColor: "rgba(16, 185, 129, 0.2)",
              marginBottom: 24,
            }}
          >
            <MaterialIcons name="check-circle" size={48} color="#10B981" />
          </View>

          {/* Headline */}
          <Text
            className="font-display text-2xl font-bold leading-tight tracking-tight text-on-surface-light dark:text-on-surface-dark text-center"
            style={{
              fontSize: 24,
              color: "#1a1c1a",
              marginBottom: 8,
            }}
          >
            {title}
          </Text>

          {/* Body Text */}
          <Text
            className="mt-2 text-base font-normal leading-normal text-on-surface-light/80 dark:text-on-surface-dark/80 text-center"
            style={{
              color: "rgba(26, 28, 26, 0.8)",
              marginTop: 8,
            }}
          >
            {message}
          </Text>

          {/* Button Group */}
          <View className="mt-8 flex w-full flex-col gap-3" style={{ marginTop: 32, gap: 12 }}>
            {onPrimaryPress && (
              <TouchableOpacity
                onPress={onPrimaryPress}
                className="flex h-12 min-w-[84px] items-center justify-center overflow-hidden rounded-full px-6"
                style={{
                  backgroundColor: "#dce1ff",
                  height: 48,
                }}
                activeOpacity={0.8}
              >
                <Text
                  className="text-sm font-medium tracking-wide"
                  style={{ color: "#001a40" }}
                >
                  {primaryButtonText}
                </Text>
              </TouchableOpacity>
            )}

            {onSecondaryPress && (
              <TouchableOpacity
                onPress={onSecondaryPress}
                className="flex h-12 min-w-[84px] items-center justify-center overflow-hidden rounded-full px-6"
                style={{
                  backgroundColor: "#e0e2ec",
                  height: 48,
                }}
                activeOpacity={0.8}
              >
                <Text
                  className="text-sm font-medium tracking-wide"
                  style={{ color: "#191c2c" }}
                >
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

