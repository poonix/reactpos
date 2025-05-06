import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useCart } from '../contexts/CartContext';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(product); // ✅ Add to cart first
    navigation.navigate('Checkout'); // ✅ Then go to checkout
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.price}>Rp {product.price.toLocaleString()}</Text>
      <Button
        title="Add to Cart & Go to Checkout"
        onPress={handleAddToCart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  name: { fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
  price: { fontSize: 20, color: '#333', marginBottom: 20 },
});
