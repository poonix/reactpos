// App.js

// ✅ Required for Supabase and URL support in React Native
import 'react-native-url-polyfill/auto';

// ✅ Node.js polyfills for Buffer and process
import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = Buffer;
global.process = process;

// ✅ Optional: Polyfill setImmediate (some libraries still expect it)
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CartProvider } from './contexts/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import SplashScreen from './components/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProductListScreen from './screens/ProductListScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ReportScreen from './screens/ReportTransaction';
import AuditLogScreen from './screens/AuditLogScreen';
import SettingScreen from './screens/SettingScreen';
import CustomDrawer from './components/CustomDrawer';
import ProductFormScreen from './screens/ProductFormScreen';
import ReportTransaction from './screens/ReportTransaction';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: '#fc6b03',
        drawerActiveTintColor: '#fff',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: { marginLeft: -20, paddingLeft: 10, fontSize: 16 },
      }}
    >
      <Drawer.Screen name="Point of Sales" component={HomeScreen} />
      <Drawer.Screen name="Product Management" component={ProductListScreen} />
      <Drawer.Screen name="User Profile" component={UserProfileScreen} />
      <Drawer.Screen name="Setting" component={SettingScreen} />
      <Drawer.Screen name="History Transaction" component={HistoryScreen} />
      <Drawer.Screen name="Report" component={ReportTransaction} />
      {/*<Drawer.Screen name="Audit Log" component={AuditLogScreen} />*/}
    </Drawer.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem('session_token');
        setIsLoggedIn(!!token);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setTimeout(() => setIsLoading(false), 2000);
      }
    };

    checkSession();
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={isLoggedIn ? "Main" : "Login"} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={DrawerNavigator} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="ProductForm" component={ProductFormScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
};
