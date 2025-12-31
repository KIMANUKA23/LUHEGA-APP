// Adjust Quantity Modal Component - EXACT match to Stitch design (Bottom Sheet)
import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface AdjustQuantityModalProps {
  visible: boolean;
  productName: string;
  currentQuantity: number;
  minQuantity?: number;
  maxQuantity?: number;
  onClose: () => void;
  onUpdate: (quantity: number) => void;
}

export default function AdjustQuantityModal({
  visible,
  productName,
  currentQuantity,
  minQuantity = 1,
  maxQuantity = 999,
  onClose,
  onUpdate,
}: AdjustQuantityModalProps) {
  const [quantity, setQuantity] = useState(currentQuantity);

  // Update quantity when currentQuantity prop changes
  useEffect(() => {
    setQuantity(currentQuantity);
  }, [currentQuantity]);

  const handleDecrement = () => {
    if (quantity > minQuantity) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleUpdate = () => {
    if (quantity >= minQuantity && quantity <= maxQuantity) {
      onUpdate(quantity);
      onClose();
    }
  };

  const handleQuantityChange = (text: string) => {
    const num = parseInt(text) || minQuantity;
    const clampedValue = Math.max(minQuantity, Math.min(maxQuantity, num));
    setQuantity(clampedValue);
  };

  const isDecrementDisabled = quantity <= minQuantity;
  const isIncrementDisabled = quantity >= maxQuantity;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="absolute inset-0 flex h-full w-full flex-col items-end justify-end bg-black/40">
        <View className="flex w-full max-w-md flex-col justify-end">
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
              Adjust Quantity
            </Text>

            {/* Product Name */}
            <Text className="text-neutral-800 dark:text-neutral-300 text-base font-normal leading-normal pb-4 pt-1 px-6 font-heading font-semibold">
              {productName}
            </Text>

            {/* Divider */}
            <View className="h-px bg-neutral-300 dark:bg-neutral-800 mx-6" />

            {/* Quantity Selector */}
            <View className="flex items-center gap-4 bg-neutral-100 dark:bg-neutral-900 px-6 min-h-14 justify-between py-6 flex-row">
              <View className="flex items-center gap-4 flex-row">
                {/* Inventory Icon */}
                <View className="text-neutral-900 dark:text-neutral-100 flex items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-800 shrink-0" style={{ width: 40, height: 40 }}>
                  <MaterialIcons name="inventory-2" size={24} color="#1f2937" />
                </View>
                <Text className="text-neutral-900 dark:text-neutral-100 text-base font-medium leading-normal flex-1">
                  Quantity
                </Text>
              </View>

              {/* Quantity Controls */}
              <View className="shrink-0">
                <View className="flex items-center gap-3 text-neutral-900 dark:text-neutral-100 flex-row">
                  <TouchableOpacity
                    onPress={handleDecrement}
                    disabled={isDecrementDisabled}
                    className={`text-base font-medium leading-normal flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 ${
                      isDecrementDisabled ? "opacity-50" : ""
                    }`}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="remove"
                      size={24}
                      color={isDecrementDisabled ? "#9CA3AF" : "#007bff"}
                    />
                  </TouchableOpacity>

                  <TextInput
                    className="text-lg font-medium leading-normal w-10 p-0 text-center bg-transparent text-neutral-900 dark:text-neutral-100"
                    value={quantity.toString()}
                    onChangeText={handleQuantityChange}
                    keyboardType="numeric"
                    selectTextOnFocus
                    style={{
                      fontSize: 18,
                      fontWeight: "500",
                      textAlign: "center",
                      color: "#1f2937",
                    }}
                  />

                  <TouchableOpacity
                    onPress={handleIncrement}
                    disabled={isIncrementDisabled}
                    className={`text-base font-medium leading-normal flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/30 ${
                      isIncrementDisabled ? "opacity-50" : ""
                    }`}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="add"
                      size={24}
                      color={isIncrementDisabled ? "#9CA3AF" : "#007bff"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View className="h-px bg-neutral-300 dark:bg-neutral-800" />

            {/* Update Button */}
            <View className="flex px-6 py-4 justify-center bg-neutral-100 dark:bg-neutral-900">
              <TouchableOpacity
                onPress={handleUpdate}
                className="flex min-w-[84px] max-w-[480px] items-center justify-center overflow-hidden rounded-xl h-12 px-5 flex-1 bg-primary"
                activeOpacity={0.8}
              >
                <Text className="text-white text-base font-bold leading-normal truncate">
                  Update Quantity
                </Text>
              </TouchableOpacity>
            </View>

            {/* Safe area padding */}
            <View className="h-4 bg-neutral-100 dark:bg-neutral-900" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

