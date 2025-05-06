import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function CustomDrawer(props) {
  const [username, setUsername] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const insets = useSafeAreaInsets(); // 👈 Add this


  useEffect(() => {
    const fetchUsername = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUsername(user.username);
      }
    };
    fetchUsername();
    checkImageExists();
  }, []);

  const checkImageExists = async () => {
    try {
      const uri = await AsyncStorage.getItem('profileImage');
      if (uri && (await FileSystem.getInfoAsync(uri)).exists) {
        setProfileImage(uri);
      }
    } catch (error) {
      console.log('No saved image found');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user'); // clear login session
    props.navigation.replace('Login'); // go back to login
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ backgroundColor: '#fff' }}>
        {/* Profile */}
        <View style={styles.profileContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profilePic} />
          ) : (
            <Ionicons name="person-circle" size={100} color="#fc6b03" />
          )}
          <Text style={styles.profileName}>{username}</Text>
        </View>

        {/* Menu Items */}
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 15 }}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View style={[styles.logoutSection, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="#fc6b03" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    padding: 20,
    alignItems: 'center',
  },
  profilePic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    color: '#fc6b03',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutSection: {
    padding: 20,
    paddingBottom: 40, // Add extra space manually
    borderTopWidth: 1,
    borderColor: '#fc6b03',
    backgroundColor: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    marginLeft: 5,
    color: '#fc6b03',
    fontWeight: '600',
  },
  
});
