import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BluetoothManager, BluetoothEscposPrinter } from 'react-native-bluetooth-escpos-printer';

export default function PrinterSettingScreen() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const scanDevices = async () => {
    setLoading(true);
    try {
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        await BluetoothManager.enableBluetooth();
      }
      const paired = await BluetoothManager.scanDevices();
      if (paired && paired.paired) {
        setDevices(paired.paired);
      }
    } catch (error) {
      console.error('Scan error:', error.message);
    }
    setLoading(false);
  };

  const selectPrinter = async (device) => {
    try {
      await BluetoothManager.connect(device.address);
      await AsyncStorage.setItem('printer_address', device.address);
      Alert.alert('Printer connected', device.name);
    } catch (error) {
      Alert.alert('Connection Failed', error.message);
    }
  };

  useEffect(() => {
    scanDevices();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => selectPrinter(item)} style={styles.deviceItem}>
      <Text>{item.name || 'Unknown'}</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>{item.address}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={scanDevices} style={styles.scanButton}>
        <Text style={styles.scanButtonText}>Scan Bluetooth</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator size="large" /> : (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.address}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  scanButton: { backgroundColor: '#fc6b03', padding: 10, borderRadius: 8, marginBottom: 20 },
  scanButtonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  deviceItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
