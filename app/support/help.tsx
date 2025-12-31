// Help Center Screen
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";

const faqs = [
  {
    id: "1",
    question: "How do I create a new sale?",
    answer: "Go to the Sales tab and tap the '+' button. Select products, add them to cart, and complete the payment.",
  },
  {
    id: "2",
    question: "How do I manage inventory?",
    answer: "Navigate to Inventory tab. You can view all products, add new ones, edit existing items, and check stock levels.",
  },
  {
    id: "3",
    question: "What is a debit sale?",
    answer: "A debit sale allows customers to pay later. Admin must approve these sales before they're finalized.",
  },
  {
    id: "4",
    question: "How do I record a debt payment?",
    answer: "Go to Debts tab, find the customer, and tap 'Record Payment'. Enter the amount and payment method.",
  },
  {
    id: "5",
    question: "How do I process a return?",
    answer: "Navigate to Returns tab, tap 'New Return', scan or enter sale ID, select items and reason, then submit.",
  },
  {
    id: "6",
    question: "How do I create a purchase order?",
    answer: "Go to Purchase Orders tab, tap '+', select supplier, add items with quantities, and submit for approval.",
  },
];

export default function HelpCenterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: statusBarHeight + 8,
          paddingBottom: 12,
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Help Center
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 8,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Frequently Asked Questions
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>
          Find answers to common questions about using LUHEGA
        </Text>

        {faqs.map((faq) => (
          <TouchableOpacity
            key={faq.id}
            onPress={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.2 : 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
            activeOpacity={0.8}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: "600",
                  color: colors.text,
                  marginRight: 12,
                }}
              >
                {faq.question}
              </Text>
              <MaterialIcons
                name={expandedId === faq.id ? "expand-less" : "expand-more"}
                size={24}
                color={colors.textSecondary}
              />
            </View>
            {expandedId === faq.id && (
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginTop: 12,
                  lineHeight: 20,
                }}
              >
                {faq.answer}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <View
          style={{
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#EFF6FF",
            borderRadius: 12,
            padding: 16,
            marginTop: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialIcons name="support-agent" size={24} color={colors.primary} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginLeft: 8,
              }}
            >
              Need More Help?
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
            If you can't find what you're looking for, please contact your administrator or send feedback through the app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

