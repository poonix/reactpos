// utils/checkPrinterStatus.js
import { BluetoothManager } from 'react-native-bluetooth-escpos-printer';

export async function checkPrinterStatus() {
  try {
    const isConnected = await BluetoothManager.isConnected();
    return isConnected; // true = connected, false = not connected
  } catch (error) {
    console.error('Check printer status error:', error.message);
    return false;
  }
}
