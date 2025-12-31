// Quick Add to Cart Modal Component - EXACT match to Stitch design (Bottom Sheet)
import React, { useState } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput, Image, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface Product {
  id: string;
  name: string;
  sku: string;
  imageUrl: string;
}

interface QuickAddToCartModalProps {
  visible: boolean;
  products?: Product[];
  onClose: () => void;
  onAddToCart?: (productId: string, quantity: number) => void;
}

export default function QuickAddToCartModal({
  visible,
  products = [],
  onClose,
  onAddToCart,
}: QuickAddToCartModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    products.length > 0 ? products[0].id : null
  );
  const [quantity, setQuantity] = useState(1);

  // Default products if none provided
  const defaultProducts: Product[] = [
    {
      id: "1",
      name: "Basic Tee",
      sku: "123-TSH",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDDIYTgo949QfzVhhB6uaPkc70-cSkl4bYuqDBXIrOzYMZP-Rmxd9TYtz9Ldy43taALCTfcf1Sy-zUZrVsvAOap8nWBpx_Vg_YxhHMObDW_STJVdX2xCQtoJvSToAVLqmZF5T8kDj1Wu4NvziIrUtZSg62LCPRv1DrmLNxFyAOT_56g6RUNTVdBbzTvXWsjy3IQSA7a0FukiczNibKq5h-Y6LimSBi1pEKgpQ3of-2gerkli-PG3gwzvu_bx5jcBvFuL_CI4d7zdlQx",
    },
    {
      id: "2",
      name: "Classic Mug",
      sku: "456-MUG",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD2euOgkPRk5BLKgCRCqOCCmLBgbZ_6Y61mL1qSDI8gpFScexHJqwqTEOE3VQvrE6w2BlpAI2-I0sBK__v3_7SRbyFTzKFm8SHv1w5eljVRB-rmms9WtzcyIhTKt4eW0RuqgcOQ7SSLQkJXWUdS0foDXNMBshuI4jurlpaom3QTy3huTFWtYMQiil_d142M0mEVn66m-8fSecYJrZ83u6oG_6xYwWWOfo4ejXx-ryMAyr6avjVgRcORl1ED2x8BakmbSyQsNErE8gah",
    },
    {
      id: "3",
      name: "Logo Cap",
      sku: "789-HAT",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBHj2wvbMMPAnL3SHdUlXa3U_c5pHJRe-xyJj4zHDuxvWedhsCNIuRuKWE20SPnu-lXNZqMtDL8TvxLeiYc8Qt28LCeG1_kqUi8293qm12hUB_8JRZ9S-vj2NcS4BlSPFaoQpCxsG14uy6XRh7Y48T-VPYSWLPkhHCFhSsCPAPY7tBlKPHDVb0C4BIKkGWH5xWkjJFpexxneC4iXUCYzz0yc55B90LiL2N8_kuyLyLyhhXtlwECpW9GgWLyu1Gpxf5OKfME1xIICSiI",
    },
  ];

  const displayProducts = products.length > 0 ? products : defaultProducts;

  const filteredProducts = displayProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    setQuantity(quantity + 1);
  };

  const handleAddToCart = () => {
    if (selectedProductId && onAddToCart) {
      onAddToCart(selectedProductId, quantity);
      // Reset state
      setQuantity(1);
      setSearchQuery("");
      onClose();
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="absolute inset-0 flex h-full w-full flex-col items-end justify-end bg-black/40">
        <View className="flex w-full max-w-lg flex-col items-stretch rounded-t-3xl bg-white dark:bg-[#1A1A1A]">
          {/* Drag Handle */}
          <TouchableOpacity
            onPress={onClose}
            className="flex h-5 w-full items-center justify-center pt-3"
            activeOpacity={0.7}
          >
            <View className="h-1 w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
          </TouchableOpacity>

          {/* Header */}
          <Text className="font-heading text-[#1A1A1A] dark:text-slate-100 text-xl font-bold leading-tight px-6 pt-5 text-center">
            Quick Add to Cart
          </Text>

          {/* Search Input */}
          <View className="flex max-w-[480px] flex-wrap items-end gap-4 px-6 py-4">
            <View className="flex flex-col min-w-40 flex-1">
              <View className="relative flex w-full flex-1 items-stretch rounded-xl">
                <TextInput
                  className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#1A1A1A] dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-14 placeholder:text-[#6B7280] p-[15px] pr-12 text-base font-normal leading-normal"
                  placeholder="Enter SKU or Product Name"
                  placeholderTextColor="#6B7280"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={{
                    borderWidth: 1,
                    borderColor: searchQuery ? "#007BFF" : "#E5E7EB",
                  }}
                />
                <View className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <MaterialIcons name="search" size={24} color="#6B7280" />
                </View>
              </View>
            </View>
          </View>

          {/* Product List */}
          <ScrollView className="flex flex-col gap-2 px-2" style={{ maxHeight: 300 }}>
            {filteredProducts.map((product) => {
              const isSelected = selectedProductId === product.id;
              return (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => handleProductSelect(product.id)}
                  className={`flex items-center gap-4 px-4 min-h-[72px] py-2 justify-between rounded-xl ${
                    isSelected
                      ? "bg-primary/10 dark:bg-primary/20 border border-primary/50"
                      : "bg-transparent"
                  }`}
                  activeOpacity={0.7}
                >
                  <View className="flex items-center gap-4 flex-row">
                    {/* Product Image */}
                    <View className="rounded-lg overflow-hidden" style={{ width: 56, height: 56 }}>
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Product Info */}
                    <View className="flex flex-col justify-center">
                      <Text
                        className="text-[#1A1A1A] dark:text-slate-100 text-base font-medium leading-normal"
                        numberOfLines={1}
                      >
                        {product.name}
                      </Text>
                      <Text
                        className="text-[#6B7280] dark:text-slate-400 text-sm font-normal leading-normal"
                        numberOfLines={2}
                      >
                        SKU: {product.sku}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Quantity Selector */}
          <View className="px-6 pt-6 pb-4">
            <View className="flex items-center justify-between flex-row">
              <Text className="text-[#1A1A1A] dark:text-slate-100 text-base font-medium leading-normal">
                Quantity
              </Text>
              <View className="flex items-center gap-2 flex-row">
                <TouchableOpacity
                  onPress={handleDecrement}
                  disabled={quantity <= 1}
                  className="flex size-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                  style={{ opacity: quantity <= 1 ? 0.5 : 1 }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="remove" size={20} color="#6B7280" />
                </TouchableOpacity>
                <TextInput
                  className="w-14 h-10 text-center text-[#1A1A1A] dark:text-slate-100 font-medium bg-transparent border-0"
                  value={quantity.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 1;
                    setQuantity(Math.max(1, num));
                  }}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  onPress={handleIncrement}
                  className="flex size-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add" size={20} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Add to Cart Button */}
          <View className="px-6 pt-4 pb-6">
            <TouchableOpacity
              onPress={handleAddToCart}
              disabled={!selectedProductId}
              className={`flex w-full items-center justify-center rounded-xl bg-primary h-14 ${
                !selectedProductId ? "opacity-50" : ""
              }`}
              activeOpacity={0.8}
            >
              <Text className="text-white font-display text-base font-bold leading-normal">
                Add to Cart
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

