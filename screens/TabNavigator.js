import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import CheckoutScreen from './CheckoutScreen';
import HistoryScreen from './HistoryScreen';
import { useCart } from '../contexts/CartContext';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { cartItems } = useCart();

  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{
          tabBarBadge: cartItems.length > 0 ? cartItems.length : undefined,
        }}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
