import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Switch, ScrollView, Alert, KeyboardAvoidingView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DropDownPicker from 'react-native-dropdown-picker';
import { supabase } from '../pos-backend/supabase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import ImageUploader from '../components/ImageUploader';


export default function ProductFormScreen( ) {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = route.params || {};
  const productId = product?.id;
  const [productName, setProductName] = useState(product?.name || '');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [imageUri, setImageUri] = useState(null);      // buat preview dari local
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null); // buat hasil upload
  const [status, setStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('id, name');
    if (error) console.error(error.message);
    else {
      const formatted = data.map(cat => ({ label: cat.name, value: cat.id }));
      setCategories(formatted);
    }
  };

  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error) console.error(error.message);
    else {
      setProductName(data.name);
      setPrice(data.price.toString());
      setStock(data.stock_quantity?.toString() || '');
      setCategoryId(data.category_id);
      setUploadedImageUrl(data.image);
      setStatus(data.is_active);
    }
    setLoading(false);
  };

  const uploadImage = async (uri) => {
    try {
      // Fetch the image file and get its Blob
      const response = await fetch(uri);
      const blob = await response.blob();
  
      // Create a unique filename
      const fileName = `products/${Date.now()}.jpg`;
  
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true, // biar kalau file sama, dia replace
        });
  
      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message);
      }
  
      // Get the public URL
      const { data: publicUrlData } = await supabase.storage
        .from('products')
        .getPublicUrl(fileName);
  
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }
  
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Upload Image Error:', err);
      throw err;
    }
  };
  

  const handleSave = async () => {
    if (!productName || !price || !categoryId) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = uploadedImageUrl;

      if (imageUri && !uploadedImageUrl) {
        // kalau baru pilih image tapi belum upload
        finalImageUrl = await uploadImage(imageUri);
        setUploadedImageUrl(finalImageUrl);
      }

      const payload = {
        name: productName,
        price: parseFloat(price),
        stock_quantity: parseInt(stock),
        category_id: categoryId,
        is_active: status,
        image : finalImageUrl
      };

      let result;
      if (productId) {
        result = await supabase.from('products').update(payload).eq('id', productId);
      } else {
        result = await supabase.from('products').insert(payload);
      }

      if (result.error) throw result.error;

      Toast.show({ type: 'success', text1: 'Success', text2: productId ? 'Product updated!' : 'Product added!' });
      navigation.goBack();
    } catch (error) {
      console.error(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) {
              console.error(error.message);
              Alert.alert('Error', error.message);
            } else {
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Product deleted successfully!' });
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fc6b03" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{productId ? 'Edit Product' : 'Add Product'}</Text>
        <View style={{ width: 28 }} />
      </View>
      <KeyboardAvoidingView style={{ flex:1 }} behavior='padding'>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput value={productName} onChangeText={setProductName} style={styles.input} placeholder="Enter product name" />

        <Text style={styles.label}>Price *</Text>
        <TextInput value={price} onChangeText={setPrice} style={styles.input} placeholder="Enter price" keyboardType="numeric" />

        <Text style={styles.label}>Stock *</Text>
        <TextInput value={stock} onChangeText={setStock} style={styles.input} placeholder="Enter stock" keyboardType="numeric" />

        <Text style={styles.label}>Category *</Text>
        <View style={{ zIndex:1000,marginBottom: 20 }}>
        <DropDownPicker
          open={dropdownOpen}
          value={categoryId}
          items={categories}
          setOpen={setDropdownOpen}
          setValue={setCategoryId}
          setItems={setCategories}
          placeholder="Select a category"
        />
        </View>

        <Text style={styles.label}>Image</Text>
        <ImageUploader onUploaded={(url) => setUploadedImageUrl(url)} />

        <View style={styles.statusContainer}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.switchContainer}>
            <Text style={{ color: status ? 'green' : 'red', marginRight: 10 }}>
              {status ? 'Active' : 'Inactive'}
            </Text>
            <Switch value={status} onValueChange={setStatus} />
          </View>
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>{productId ? 'Update Product' : 'Add Product'}</Text>
        </TouchableOpacity>

        {/* Delete button muncul kalau edit */}
        {productId && (
          <TouchableOpacity onPress={handleDelete} style={[styles.saveButton, { backgroundColor: 'red', marginTop: 10 }]}>
            <Text style={styles.saveButtonText}>Delete Product</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#fc6b03',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 50,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  form: { padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, marginBottom: 10 },
  uploadButton: { backgroundColor: '#fc6b03', padding: 10, borderRadius: 8, alignItems: 'center', width: '48%' },
  uploadButtonText: { color: '#fff', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#fc6b03', padding: 15, borderRadius: 8, marginTop: 20 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  switchContainer: { flexDirection: 'row', alignItems: 'center' },
  imagee: {
    backgroundColor: '#eee', 
    padding: 20, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center'}
});
