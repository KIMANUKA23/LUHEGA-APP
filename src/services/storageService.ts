import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';

/**
 * Robust image upload service for Supabase
 */

export async function pickImage() {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please grant gallery permissions to upload photos.');
            return null;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.6,
        });

        if (!result.canceled && result.assets[0]) {
            return result.assets[0].uri;
        }
    } catch (error) {
        console.error('Pick image error:', error);
        Alert.alert('Error', 'Failed to pick image');
    }
    return null;
}

export async function uploadImage(uri: string, bucket: string, folder: string): Promise<string | null> {
    try {
        // 1. Read file as base64 (most reliable on Android/iOS)
        const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
        const arrayBuffer = decode(base64);

        // 2. Generate file path
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        // 3. Upload to Supabase
        const { data, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, arrayBuffer, {
                contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);

            // Auto-create bucket if missing
            if (uploadError.message.includes('Bucket not found')) {
                await supabase.storage.createBucket(bucket, { public: true });
                // Retry once
                return uploadImage(uri, bucket, folder);
            }

            throw uploadError;
        }

        // 4. Get Public URL
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return publicUrl;

    } catch (error: any) {
        console.error('Image upload failed:', error);
        Alert.alert('Upload Failed', error.message || 'Unknown error during upload');
        return null;
    }
}
