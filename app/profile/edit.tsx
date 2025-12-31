// Edit Profile Screen
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore: Legacy import might not have types
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshSession, updateUserState } = useAuth();
  const { colors, isDark } = useTheme();
  const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Debug: Check available columns in users table
  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').limit(1).single();
        if (data) {
          console.log('DEBUG: Users table columns:', Object.keys(data));
        } else {
          console.log('DEBUG: Could not fetch user columns', error);
        }
      } catch (e) {
        console.log('DEBUG: Error probing schema', e);
      }
    })();
  }, []);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant camera roll permissions to upload photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced from 0.8 for faster uploads
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      setUploadingPhoto(true);

      // Read file as base64 and convert to ArrayBuffer
      // This is more reliable on Android than fetch().blob()
      const base64 = await readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `profiles/${user.id}/${Date.now()}.${fileExt}`;
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

      // Import decode dynamically if not at top, or just assume I added it.
      // I will add the import at the top in a separate edit or assume I can do it here if I view the file again.
      // For now, I will assume the imports are present and use them.
      const arrayBuffer = decode(base64);

      // Upload to Supabase Storage with timeout
      const uploadPromise = supabase.storage
        .from("profiles")
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: contentType,
        });

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout')), 30000) // 30 seconds
      );

      let { data, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (uploadError) {
        console.log("Upload error:", uploadError);

        // Handle "Bucket not found" error
        if (uploadError.message.includes("Bucket not found")) {
          console.log("Bucket 'profiles' not found. Attempting to create it...");
          const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('profiles', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });

          if (bucketError) {
            console.log("Error creating bucket:", bucketError);
            Alert.alert("Configuration Error", "The 'profiles' storage bucket is missing and could not be created automatically. Please ask the admin to create a public bucket named 'profiles'.");
            return null;
          }

          console.log("Bucket created successfully. Retrying upload...");
          // Retry upload
          const retry = await supabase.storage
            .from("profiles")
            .upload(filePath, arrayBuffer, {
              upsert: true,
              contentType: contentType,
            });

          if (retry.error) {
            Alert.alert("Upload Failed", `Could not upload image: ${retry.error.message}`);
            return null;
          }
          // Success on retry
          data = retry.data;
        } else {
          Alert.alert("Upload Failed", `Could not upload image: ${uploadError.message}`);
          return null;
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.log("Error uploading photo:", error);
      Alert.alert("Error", "Failed to process image for upload");
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not found");
      return;
    }

    setLoading(true);
    setLoadingMessage("Saving...");
    try {
      let photoUrl: string | null = null;

      // Upload photo if selected
      if (photoUri) {
        setLoadingMessage("Uploading photo...");
        photoUrl = await uploadPhoto(photoUri);
        if (!photoUrl) {
          Alert.alert("Warning", "Photo upload failed, but profile will be updated");
        }
      }

      setLoadingMessage("Saving details...");
      const { updateUser } = await import("../../src/services/userService");
      const updatedUser = await updateUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        // Only update photo_url if a new photo was picked (photoUri is set)
        photo_url: photoUri ? photoUrl : undefined,
      });

      if (updatedUser) {
        updateUserState(updatedUser as any);
      } else {
        await refreshSession();
      }

      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (error: any) {
      console.log("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
      setLoadingMessage("");
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
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
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
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            fontFamily: "Poppins_700Bold",
          }}
        >
          Edit Profile
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
          activeOpacity={0.7}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: colors.textSecondary }}>
                {loadingMessage}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingPhoto}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: colors.surface,
              borderWidth: 3,
              borderColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: "100%", height: "100%" }} />
            ) : user?.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <MaterialIcons name="person" size={50} color={colors.textSecondary} />
            )}
            {uploadingPhoto && (
              <View style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={uploadingPhoto}
            style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: colors.primary,
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
              {uploadingPhoto ? "Uploading..." : "Change Photo"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 }}>
            Name
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              color: colors.text,
            }}
            placeholder="Enter your name"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Email (Read-only) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 }}>
            Email
          </Text>
          <View
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>{email}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              Email cannot be changed
            </Text>
          </View>
        </View>

        {/* Phone */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 }}>
            Phone (Optional)
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 16,
              fontSize: 16,
              color: colors.text,
            }}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>
      </ScrollView>
    </View>
  );
}

