import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons for eye icon
import { supabase } from '../pos-backend/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCart } from '../contexts/CartContext';
import Modal from 'react-native-modal'; // Import react-native-modal

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false); // State for toggling password visibility
  const [isModalVisible, setModalVisible] = useState(false); // Modal state
  const [welcomeMessage, setWelcomeMessage] = useState(''); // Message to show in modal
  const { setUser } = useCart();

  const handleLogin = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      console.log(error)
      Alert.alert('Login failed', 'Invalid username or user not found');
    } else if (data.password_hash !== password) {
      Alert.alert('Login failed', 'Incorrect password');
    } else {
      // Success login
      setWelcomeMessage(`Welcome, ${data.username}`); // Set the success message
      setModalVisible(true); // Show the modal
      setUser(data.id);
      await AsyncStorage.setItem('user', JSON.stringify(data)); // Save user to local storage
      setTimeout(() => {
        navigation.replace('Main'); // Navigate to main screen after modal is shown for a while
      }, 2000); // 2-second delay to show the welcome modal
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>POS Login</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={(text) => setUsername(text)}
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          style={styles.input}
          value={password}
          onChangeText={(text) => setPassword(text)}
          secureTextEntry={!passwordVisible}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
          <Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Custom styled login button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>

      {/* Welcome Modal */}
      <Modal 
        isVisible={isModalVisible}
        onBackdropPress={() => setModalVisible(false)} // Close modal on outside click
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropColor="rgba(0, 0, 0, 0.7)"
        backdropOpacity={0.8}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.welcomeText}>{welcomeMessage}</Text>
          <TouchableOpacity 
            style={styles.modalButton} 
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Proceed</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#8F0D13' // Set background color to #8F0D13
  },
  title: { 
    fontSize: 28, 
    textAlign: 'center', 
    marginBottom: 30, 
    color: '#fff' // White color for title
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff', // White background for inputs
  },
  passwordContainer: {
    position: 'relative',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 15,
    zIndex: 1
  },
  loginButton: {
    backgroundColor: '#fc6b03', // Bright orange color for the button
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff', // White text
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Modal styles
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
    elevation: 5,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#fc6b03', // Bright orange color for button
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
