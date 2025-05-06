import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../pos-backend/supabase';

export default function ImageUploader({ onUploaded }) {
  const [localUri, setLocalUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImageAndUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        alert("Permission to access media library is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.cancelled) {
        return;
      }

      const uri = result.assets[0].uri;
      setLocalUri(uri);
      setUploading(true);
      

      // Upload process
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileName = `products/${Date.now()}.jpg`;
      const { data: { user } } = await supabase.auth.getUser();
      console.log(user); // Harus ada ID user, bukan null

      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, base64, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.error('Upload Error:', error);
        alert('Upload failed: ' + error.message);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = await supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        onUploaded(publicUrlData.publicUrl);  // Kirim URL ke parent
      }

    } catch (err) {
      console.error('Image Upload Error:', err);
      alert('Unexpected error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImageAndUpload} style={styles.imagePicker}>
        {uploading ? (
          <ActivityIndicator size="small" color="#fc6b03" />
        ) : localUri ? (
          <Image source={{ uri: localUri }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>Pick an image</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 10 },
  imagePicker: { width: 150, height: 150, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  image: { width: 150, height: 150, borderRadius: 10 },
  placeholderText: { color: '#888' },
});
