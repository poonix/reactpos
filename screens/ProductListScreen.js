import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../pos-backend/supabase';
import { useIsFocused } from '@react-navigation/native';

export default function ProductManagementScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const isFocused = useIsFocused(); // 👈 Tambahkan ini


  useEffect(() => {
    if (isFocused) {
      fetchProducts();
      fetchCategories();
    }
    
  }, [isFocused]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err.message);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().then(() => setRefreshing(false));
  }, []);

  const handleEdit = (product) => {
    navigation.navigate('ProductForm', { product });
  };

  const confirmDelete = (product) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(product.id) }
      ]
    );
  };

  const handleDelete = async (productId) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);
  
      if (error) throw error;
  
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err.message);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);

    let filtered = products;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    if (text.trim() !== '') {
      filtered = filtered.filter((item) => 
        item.name.toLowerCase().includes(text.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);

    let filtered = products;

    if (categoryId !== 'all') {
      filtered = filtered.filter(p => p.category_id === categoryId);
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter((item) => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const renderItem = ({ item }) => {
    const productImage = item.image
      ? { uri: item.image }
      : require('../assets/default-product.jpg');

    return (
      <TouchableOpacity 
        style={styles.cardContainer}
        onPress={() => navigation.navigate('ProductForm', { product: item })}
      >
        <Image
          source={productImage}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>Rp {item.price.toLocaleString('id-ID')}</Text>
          <Text style={[styles.productStatus, { color: item.is_active ? 'green' : 'red' }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => confirmDelete(item)}
        >
          <Ionicons name="trash-outline" size={24} color="red" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Management</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProductForm')}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#777" style={{ marginRight: 5 }} />
          <TextInput
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={{ flex: 1 }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#777" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === 'all' && styles.activeFilterChip
            ]}
            onPress={() => handleCategoryFilter('all')}
          >
            <Text style={[
              styles.filterText,
              selectedCategory === 'all' && styles.activeFilterText
            ]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                selectedCategory === cat.id && styles.activeFilterChip
              ]}
              onPress={() => handleCategoryFilter(cat.id)}
            >
              <Text style={[
                styles.filterText,
                selectedCategory === cat.id && styles.activeFilterText
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fc6b03']} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No products found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    backgroundColor: '#fc6b03',
    padding: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  searchFilterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterChip: {
    backgroundColor: '#fc6b03',
  },
  filterText: {
    color: '#555',
    fontSize: 14,
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginVertical: 6,
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  productPrice: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  productStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16, color: '#666' },
});
