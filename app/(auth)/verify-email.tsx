// Verify Your Email Screen - OTP with underlined inputs and countdown
import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(59);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [email] = useState("your_email@example.com"); // This would come from navigation params

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, "");
    if (digit.length > 1) {
      // If multiple digits pasted, distribute them
      const digits = digit.split("").slice(0, 6 - index);
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);
      // Focus the last filled input or next empty
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join("");
    if (code.length === 6) {
      // TODO: Implement OTP verification logic
      console.log("Verifying OTP:", code);
      router.replace("/admin/dashboard");
    }
  };

  const handleResendOTP = () => {
    if (resendTimer === 0) {
      // TODO: Implement resend OTP logic
      setResendTimer(59);
      console.log("Resending OTP");
    }
  };

  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F8F8" }}>
      <ExpoStatusBar style="dark" backgroundColor="#F8F8F8" />
      {/* Header with Back Button */}
      <View style={{ paddingTop: statusBarHeight + 16, paddingHorizontal: 16, paddingBottom: 8 }}>
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
          <MaterialIcons name="arrow-back" size={24} color="#1C1B1F" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#1C1B1F",
            lineHeight: 36,
            marginBottom: 8,
            textAlign: "left",
          }}
        >
          Verify Your Email
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "400",
            color: "#49454F",
            lineHeight: 24,
            marginBottom: 32,
            textAlign: "left",
          }}
        >
          Enter the 6-digit code sent to your email.
        </Text>

        {/* OTP Input Fields - Underlined style */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            paddingVertical: 12,
          }}
        >
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              style={{
                width: 40,
                height: 48,
                borderBottomWidth: 2,
                borderBottomColor: focusedIndex === index ? "#007BFF" : "#D1D5DB",
                backgroundColor: "transparent",
                textAlign: "center",
                fontSize: 24,
                fontWeight: "500",
                color: "#1C1B1F",
              }}
            />
          ))}
        </View>

        {/* Success Message */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <MaterialIcons name="check-circle" size={20} color="#10B981" />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: "#10B981",
              lineHeight: 20,
            }}
          >
            Code sent to {email}
          </Text>
        </View>

        {/* Resend OTP Timer */}
        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={resendTimer > 0}
          style={{
            alignItems: "center",
            marginBottom: 24,
            opacity: resendTimer > 0 ? 0.5 : 1,
          }}
          activeOpacity={0.7}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "400",
              color: "#49454F",
              lineHeight: 20,
            }}
          >
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
          </Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ flex: 1 }} />
      </ScrollView>

      {/* Verify Button - Fixed at bottom */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          paddingTop: 16,
          backgroundColor: "#F8F8F8",
        }}
      >
        <TouchableOpacity
          onPress={handleVerify}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 9999,
            backgroundColor: "#007BFF",
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#FFFFFF",
              lineHeight: 24,
            }}
          >
            Verify
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

