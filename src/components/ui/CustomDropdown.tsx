// Custom Dropdown Component
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface CustomDropdownProps {
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: any;
}

export default function CustomDropdown({
  options,
  selectedValue,
  onSelect,
  placeholder = "Select an option",
  className,
  style,
}: CustomDropdownProps) {
  const [showModal, setShowModal] = useState(false);

  const handleSelect = (value: string) => {
    onSelect(value);
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        className={className || "mt-1 block w-full rounded-lg border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 py-2.5 pl-3 pr-10 flex-row items-center justify-between"}
        activeOpacity={0.7}
        style={[
          {
            borderWidth: 1,
            borderColor: "#D1D5DB",
          },
          style,
        ]}
      >
        <Text
          className="flex-1 text-base"
          style={{
            color: selectedValue === placeholder || !selectedValue ? "#94A3B8" : "#1E293B",
          }}
        >
          {selectedValue || placeholder}
        </Text>
        <MaterialIcons name="unfold-more" size={24} color="#64748B" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowModal(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <View className="bg-neutral-100 dark:bg-neutral-900 rounded-t-xl max-h-[50%]">
            <View className="p-4 border-b border-neutral-300 dark:border-neutral-800 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Select Option</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelect(option)}
                  className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-800"
                  activeOpacity={0.7}
                >
                  <Text className="text-base text-neutral-900 dark:text-neutral-100">{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

