// Share Modal Component - EXACT match to Stitch design (Bottom Sheet)
import React from "react";
import { View, Text, Modal, TouchableOpacity, Image, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface ShareOption {
  id: string;
  name: string;
  icon: string;
}

interface ShareModalProps {
  visible: boolean;
  fileName?: string;
  fileSize?: string;
  onClose: () => void;
  onShare?: (option: string) => void;
}

export default function ShareModal({
  visible,
  fileName = "Sale_Receipt_0524.pdf",
  fileSize = "128 KB",
  onClose,
  onShare,
}: ShareModalProps) {
  const shareOptions: ShareOption[] = [
    { id: "whatsapp", name: "WhatsApp", icon: "chat" },
    { id: "messages", name: "Messages", icon: "message" },
    { id: "email", name: "Email", icon: "email" },
    { id: "airdrop", name: "AirDrop", icon: "near-me" },
    { id: "messenger", name: "Messenger", icon: "chat-bubble" },
    { id: "slack", name: "Slack", icon: "forum" },
    { id: "telegram", name: "Telegram", icon: "send" },
    { id: "more", name: "More", icon: "more-horiz" },
  ];

  const handleShareOption = (option: ShareOption) => {
    if (onShare) {
      onShare(option.id);
    }
  };

  const handleShareReceipt = () => {
    // TODO: Implement share receipt logic
    if (onShare) {
      onShare("default");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: "#ffffff",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            paddingBottom: 24,
          }}
        >
          {/* Handle */}
          <View className="flex h-5 w-full items-center justify-center pt-3">
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#E2E8F0",
              }}
            />
          </View>

          {/* Top App Bar */}
          <View className="flex items-center p-4 pb-2 flex-row">
            <View className="flex size-12 shrink-0 items-center justify-start" style={{ width: 48 }} />
            <Text className="flex-1 text-center font-heading text-lg font-semibold leading-tight text-text-primary-light dark:text-text-primary-dark">
              Share Receipt
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="flex w-12 items-center justify-end"
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          <View className="px-4 pb-6">
            {/* Receipt Preview */}
            <View
              className="w-full grow rounded-lg border border-slate-200 dark:border-slate-700 bg-background-light dark:bg-background-dark p-4"
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                backgroundColor: "#F0F2F5",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <View className="w-full flex flex-row">
                <View className="flex-1">
                  <View className="flex items-center gap-3 flex-row">
                    <View
                      className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary"
                      style={{
                        width: 48,
                        height: 48,
                        backgroundColor: "rgba(74, 144, 226, 0.2)",
                        borderRadius: 8,
                      }}
                    >
                      <MaterialIcons name="receipt-long" size={32} color="#4A90E2" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
                        {fileName}
                      </Text>
                      <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        PDF Document - {fileSize}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Section Header */}
            <Text className="px-4 py-4 text-center font-heading text-sm font-semibold leading-normal tracking-[0.015em] text-text-secondary-light dark:text-text-secondary-dark">
              Share via
            </Text>

            {/* Sharing Options Grid */}
            <View className="grid grid-cols-4 gap-4" style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {shareOptions.map((option) => (
                <View key={option.id} className="flex flex-col items-center gap-2" style={{ width: "25%" }}>
                  <TouchableOpacity
                    onPress={() => handleShareOption(option)}
                    className="flex h-14 w-14 items-center justify-center rounded-xl bg-background-light dark:bg-surface-dark"
                    style={{
                      width: 56,
                      height: 56,
                      backgroundColor: "#F0F2F5",
                      borderRadius: 12,
                    }}
                    activeOpacity={0.7}
                  >
                    {option.id === "more" ? (
                      <MaterialIcons name="more-horiz" size={24} color="#666666" />
                    ) : (
                      <MaterialIcons name={option.icon as any} size={24} color="#4A90E2" />
                    )}
                  </TouchableOpacity>
                  <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {option.name}
                  </Text>
                </View>
              ))}
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handleShareReceipt}
              className="mt-6 flex w-full items-center justify-center overflow-hidden rounded-lg bg-primary py-3"
              style={{
                backgroundColor: "#4A90E2",
                paddingVertical: 12,
                marginTop: 24,
              }}
              activeOpacity={0.8}
            >
              <Text className="text-base font-bold leading-normal text-white">Share Receipt</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

