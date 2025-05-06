import { supabase } from '../pos-backend/supabase';
import * as ImagePicker from 'expo-image-picker';

// Fetch all products
export const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      product_name,
      price,
      stock,
      is_active,
      image,
      category_id,
      categories ( name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  // Map supaya category_name langsung dari relasi
  return data.map(product => ({
    ...product,
    name: product.categories?.name || 'Unknown'
  }));
};

// Create a new product
export const createProduct = async (product) => {
  const { data, error } = await supabase
    .from('products')
    .insert([product]);

  if (error) {
    console.error('Error creating product:', error);
    throw error;
  }

  return data;
};

// Update existing product
export const updateProduct = async (id, product) => {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id);

  if (error) {
    console.error('Error updating product:', error);
    throw error;
  }

  return data;
};

// Soft delete product (mark inactive instead of real delete)
export const deleteProduct = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    throw error;
  }

  return data;
};

// Upload image to Supabase Storage
export const uploadProductImage = async (imageUri) => {
  if (!imageUri) return null;

  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const fileExt = imageUri.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { data, error } = await supabase
      .storage
      .from('products') // nama bucket storage kamu
      .upload(`images/${fileName}`, blob);

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { publicURL } = supabase
      .storage
      .from('products')
      .getPublicUrl(data.path);

    return publicURL;
  } catch (error) {
    console.error('Upload image failed:', error);
    return null;
  }
};
