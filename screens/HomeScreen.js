import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  TextInput,
  ScrollView,
  Image,
  RefreshControl
} from 'react-native';
import { supabase } from '../pos-backend/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../contexts/CartContext';
import { getSetting } from '../services/settingsService'; // sesuaikan path kalau beda
import { useIsFocused } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopName, setShopName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const isFocused = useIsFocused(); // 👈 Tambahkan ini

  const { addToCart, getTotalItems } = useCart();

  useEffect(() => {
    if (isFocused) {
      fetchAllData();
    }
    
  }, [isFocused]);

  const fetchAllData = async () => {
    setLoadingProducts(true);
    await Promise.all([
      fetchShopName(),
      fetchCategories(),
      fetchProducts(),
    ]);
    setLoadingProducts(false);
  };

  const fetchShopName = async () => {
    const name = await getSetting('shop_name');
    if (name) setShopName(name);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data);
      setFilteredProducts(data);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error.message);
    } else {
      const categoriesWithAll = [{ id: 'all', name: 'All' }, ...(data || [])];
      setCategories(categoriesWithAll);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(text, selectedCategory);
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    applyFilters(searchQuery, categoryId);
  };

  const applyFilters = (searchText, categoryId) => {
    let filtered = products;

    if (categoryId !== 'all') {
      filtered = filtered.filter(p => p.category_id === categoryId);
    }

    if (searchText.trim() !== '') {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        addToCart(item);
        navigation.navigate('Checkout');
      }}
      style={[
        styles.productCard,
        viewMode === 'grid' ? styles.gridItem : styles.listItem,
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={item.image_url ? { uri: item.image_url } : require('../assets/default-product.jpg')}
          style={styles.productImage}
          resizeMode="cover"
        />
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          Rp {item.price.toLocaleString('id-ID')}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCart(item)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loadingProducts) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fc6b03" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {shopName || 'Loading...'}
        </Text>
        <TouchableOpacity
          style={styles.cartContainer}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Ionicons name="cart" size={24} color="#fff" />
          {getTotalItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
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

      {/* Filter & ViewMode Toggle */}
      <View style={styles.FilterContainer1}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterChip,
                selectedCategory === cat.id && styles.activeFilterChip,
              ]}
              onPress={() => handleCategoryFilter(cat.id)}
            >
              <Text style={[
                styles.filterText,
                selectedCategory === cat.id && styles.activeFilterText,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* View Toggle Button */}
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'list' : 'grid'}
            size={24}
            color="#fc6b03"
          />
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        key={viewMode} // biar forced re-render kalau mode berubah
        keyExtractor={(item) => item.id.toString()}
        numColumns={viewMode === 'grid' ? 2 : 1}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#fc6b03']}
            tintColor="#fc6b03"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fc6b03',
    padding: 15,
    paddingTop: 60, // for status bar
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fc6b03',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    margin: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 15,
    paddingBottom: 5,
    height:40
  },
  FilterContainer1: {
    flexDirection: 'row', // ini supaya filter dan toggle sejajar
    alignItems: 'center', // biar vertikal rata tengah
    paddingHorizontal: 10,
    marginBottom: 10,
  },  
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activeFilterChip: {
    backgroundColor: '#fc6b03',
    borderColor: '#fc6b03',
  },
  filterText: {
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
  },
  viewToggle: {
    alignSelf: 'flex-end',
    marginRight: 15,
    marginBottom: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3, // for Android shadow
    position: 'relative',
  },
  gridItem: {
    width: '46%',
  },
  listItem: {
    width: '96%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    padding: 8,
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
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fc6b03',
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    alignSelf: 'center',
    marginVertical: 20,
    padding: 10,
  },
  logoutText: {
    color: 'red',
    fontSize: 16,
  },
});