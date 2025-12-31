// Return Quantity Modal - EXACT match to Stitch design
import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput, Keyboard } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface ReturnQuantityModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  productName: string;
  maxReturnable: number;
  initialQuantity?: number;
}

export default function ReturnQuantityModal({
  visible,
  onClose,
  onConfirm,
  productName,
  maxReturnable,
  initialQuantity = 1,
}: ReturnQuantityModalProps) {
  const [quantity, setQuantity] = useState<number>(initialQuantity);

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxReturnable) {
      setQuantity(quantity + 1);
    }
  };

  const handleConfirm = () => {
    onConfirm(quantity);
    onClose();
  };

  const handleQuantityChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1 && num <= maxReturnable) {
      setQuantity(num);
    } else if (text === "") {
      setQuantity(1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1"
        />
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
          <Text className="text-neutral-900 dark:text-neutral-100 font-heading tracking-tight text-2xl font-bold leading-tight px-6 text-left pb-1 pt-4">
            Return Quantity
          </Text>

          {/* Product Name */}
          <Text className="text-neutral-800 dark:text-neutral-300 text-base font-normal leading-normal pb-4 pt-1 px-6 font-heading font-semibold">
            {productName}
          </Text>

          {/* Divider */}
          <View className="h-px bg-neutral-300 dark:bg-neutral-800 mx-6" />

          {/* Quantity Selector */}
          <View className="flex items-center gap-4 bg-neutral-100 dark:bg-neutral-900 px-6 min-h-14 justify-between py-6 flex-row">
            <View className="flex-1">
              <Text className="text-neutral-900 dark:text-neutral-100 text-base font-medium leading-normal">
                Quantity to Return
              </Text>
              <Text className="text-neutral-800 dark:text-neutral-400 text-sm font-normal leading-normal">
                Max. returnable: {maxReturnable}
              </Text>
            </View>

            <View className="shrink-0">
              <View className="flex items-center gap-3 text-neutral-900 dark:text-neutral-100 flex-row">
                {/* Decrease Button */}
                <TouchableOpacity
                  onPress={handleDecrease}
                  disabled={quantity <= 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 ${
                    quantity <= 1 ? "opacity-50" : ""
                  }`}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="remove"
                    size={24}
                    color={quantity <= 1 ? "#9CA3AF" : "#007BFF"}
                  />
                </TouchableOpacity>

                {/* Quantity Input */}
                <TextInput
                  value={quantity.toString()}
                  onChangeText={handleQuantityChange}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  style={{
                    width: 40,
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: "500",
                    color: "#1F2937",
                    padding: 0,
                    backgroundColor: "transparent",
                  }}
                />

                {/* Increase Button */}
                <TouchableOpacity
                  onPress={handleIncrease}
                  disabled={quantity >= maxReturnable}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    quantity >= maxReturnable ? "opacity-50" : "bg-primary/20 dark:bg-primary/30"
                  }`}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="add"
                    size={24}
                    color={quantity >= maxReturnable ? "#9CA3AF" : "#007BFF"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-neutral-300 dark:bg-neutral-800" />

          {/* Confirm Button */}
          <View className="flex px-6 py-4 justify-center bg-neutral-100 dark:bg-neutral-900">
            <TouchableOpacity
              onPress={handleConfirm}
              className="flex min-w-[84px] max-w-[480px] items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-primary"
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold leading-normal truncate">
                Confirm Quantity
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View className="h-4 bg-neutral-100 dark:bg-neutral-900" />
        </View>
      </View>
    </Modal>
  );
}

