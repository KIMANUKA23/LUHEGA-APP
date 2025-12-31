// Send Feedback Screen
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import * as feedbackService from "../../src/services/feedbackService";

const feedbackTypes = [
  { id: "bug", label: "Report a Bug", icon: "bug-report", color: "#DC2626" },
  { id: "feature", label: "Feature Request", icon: "lightbulb", color: "#007BFF" },
  { id: "improvement", label: "Improvement", icon: "trending-up", color: "#16A34A" },
  { id: "other", label: "Other", icon: "chat", color: "#6B7280" },
];

export default function SendFeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [selectedType, setSelectedType] = useState<"bug" | "feature" | "improvement" | "other">("bug");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Required Fields", "Please fill in both subject and message");
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.createFeedback({
        user_id: user?.id || null,
        type: selectedType,
        subject: subject.trim(),
        message: message.trim(),
        userName: user?.name,
        userEmail: user?.email,
      });

      Alert.alert(
        "Thank You!",
        "Your feedback has been submitted to Vertex Software. We'll review it and get back to you at mathiasgavument@gmail.com if needed.",
        [
          {
            text: "OK",
            onPress: () => {
              setSubject("");
              setMessage("");
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.log("Error submitting feedback:", error);
      Alert.alert("Error", error.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
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
          Send Feedback
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Box */}
        <View style={{
          marginBottom: 24,
          padding: 16,
          backgroundColor: isDark ? 'rgba(0, 123, 255, 0.1)' : 'rgba(0, 123, 255, 0.05)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(0, 123, 255, 0.2)' : 'rgba(0, 123, 255, 0.1)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialIcons name="business" size={20} color={colors.primary} />
            <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: '700', color: colors.text }}>
              Vertex Software
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 }}>
            Your feedback helps our development team improve the app experience for everyone.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="email" size={16} color={colors.textSecondary} />
            <Text style={{ marginLeft: 6, fontSize: 13, color: colors.textSecondary }}>
              mathiasgavument@gmail.com
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 12,
          }}
        >
          Feedback Type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          {feedbackTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setSelectedType(type.id as any)}
              style={{
                flex: 1,
                minWidth: "45%",
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderRadius: 12,
                backgroundColor: selectedType === type.id
                  ? (isDark ? `${type.color}30` : `${type.color}15`)
                  : colors.card,
                borderWidth: 2,
                borderColor: selectedType === type.id ? type.color : colors.border,
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={type.icon as any}
                size={20}
                color={selectedType === type.id ? type.color : colors.textSecondary}
              />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 13,
                  fontWeight: "600",
                  color: selectedType === type.id ? type.color : colors.text,
                }}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Subject
        </Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Brief description of your feedback"
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            fontSize: 15,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 24,
          }}
        />

        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Message
        </Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Describe your feedback in detail..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            fontSize: 15,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 160,
            marginBottom: 24,
          }}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !subject.trim() || !message.trim()}
          style={{
            backgroundColor: submitting || !subject.trim() || !message.trim()
              ? colors.border
              : colors.primary,
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : null}
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#FFFFFF",
            }}
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

