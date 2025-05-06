// contexts/CartContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [userCarts, setUserCarts] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  // Load carts from storage on initial render
  useEffect(() => {
    const loadCarts = async () => {
      try {
        const savedCarts = await AsyncStorage.getItem('userCarts');
        if (savedCarts) {
          setUserCarts(JSON.parse(savedCarts));
        }
      } catch (error) {
        console.error('Failed to load carts:', error);
      }
    };
    loadCarts();
  }, []);

  // Save carts to storage whenever they change
  useEffect(() => {
    const saveCarts = async () => {
      try {
        await AsyncStorage.setItem('userCarts', JSON.stringify(userCarts));
      } catch (error) {
        console.error('Failed to save carts:', error);
      }
    };
    saveCarts();
  }, [userCarts]);

  // Set current user when login occurs
  const setUser = (userId) => {
    setCurrentUserId(userId);
    // Initialize empty cart if user doesn't have one
    if (userId && !userCarts[userId]) {
      setUserCarts(prev => ({
        ...prev,
        [userId]: []
      }));
    }
  };

  // Clear current user when logout occurs
  const clearUser = () => {
    setCurrentUserId(null);
  };

  // Get current user's cart
  const getCurrentCart = () => {
    return currentUserId ? userCarts[currentUserId] || [] : [];
  };

  // Cart operations
  const addToCart = (product) => {
    if (!currentUserId) return;
    
    setUserCarts(prev => {
      const userCart = prev[currentUserId] || [];
      const existing = userCart.find(item => item.id === product.id);
      
      const updatedCart = existing
        ? userCart.map(item =>
            item.id === product.id 
              ? { ...item, quantity: item.quantity + 1 } 
              : item
          )
        : [...userCart, { ...product, quantity: 1 }];
      
      return {
        ...prev,
        [currentUserId]: updatedCart
      };
    });
  };

  const removeFromCart = (productId) => {
    if (!currentUserId) return;
    
    setUserCarts(prev => ({
      ...prev,
      [currentUserId]: (prev[currentUserId] || []).filter(item => item.id !== productId)
    }));
  };

  const clearCart = () => {
    if (!currentUserId) return;
    
    setUserCarts(prev => ({
      ...prev,
      [currentUserId]: []
    }));
  };

  const updateQuantity = (productId, quantity) => {
    if (!currentUserId) return;
    
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setUserCarts(prev => ({
      ...prev,
      [currentUserId]: (prev[currentUserId] || []).map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    }));
  };

  const getTotalItems = () => {
    const cart = getCurrentCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    const cart = getCurrentCart();
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems: getCurrentCart(),
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        setUser,
        clearUser
      }}
    >
      {children}
    </CartContext.Provider>
  );
};