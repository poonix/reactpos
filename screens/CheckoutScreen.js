import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform, 
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../pos-backend/supabase';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import 'react-native-get-random-values';

const CashPaymentModal = ({ 
  visible, 
  onClose, 
  total, 
  onConfirm, 
  onSkip,
  cashReceived,
  setCashReceived,
  changeAmount,
  setChangeAmount
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Cash Payment</Text>
        
        <Text style={styles.totalText}>Total: Rp {total.toLocaleString()}</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Amount Received"
          keyboardType="decimal-pad"
          value={cashReceived}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            setCashReceived(cleaned);
            const received = parseFloat(cleaned) || 0;
            setChangeAmount(received - total);
          }}
        />
        
        <Text style={styles.changeText}>
          Change: Rp {changeAmount > 0 ? changeAmount.toLocaleString() : '0'}
        </Text>
        
        {changeAmount < 0 && (
          <Text style={styles.warningText}>Insufficient amount!</Text>
        )}
        
        <TouchableOpacity
          style={[styles.modalButton, styles.exactButton]}
          onPress={() => {
            setCashReceived(total.toFixed(2));
            setChangeAmount(0);
          }}
        >
          <Text style={styles.buttonText}>Exact Amount</Text>
        </TouchableOpacity>
        
        <View style={styles.modalButtonContainer}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.skipButton]}
            onPress={onSkip}
          >
            <Text style={styles.buttonText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.modalButton, styles.confirmButton]}
            disabled={changeAmount < 0}
            onPress={() => onConfirm(cashReceived, changeAmount)}
          >
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default function CheckoutScreen({ navigation }) {
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    clearCart
  } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [taxRate, setTaxRate] = useState(0);
  const [isCashModalVisible, setIsCashModalVisible] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  useEffect(() => {
    const getUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserId(parsed.id);
      }
    };
    getUser();
    fetchTaxRate();
  }, []);

  const fetchTaxRate = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'tax_rate')
        .single();

      if (!error && data) {
        setTaxRate(parseFloat(data.value) || 0);
      }
    } catch (err) {
      console.error('Error fetching tax rate:', err);
    }
  };

  const handleCheckout = async (method, cashReceived = null, changeAmount = null) => {
    setLoading(true);
    
    let latitude = null;
    let longitude = null;
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      }
    } catch (err) {
      console.warn('Location error', err);
    }
    
    try {
      const transactionId = uuidv4();
      
      const transactionData = {
        id: transactionId,
        transaction_code: `TXN-${transactionId.slice(0, 8)}`,
        id_user: userId,
        payment_method: method,
        total_amount: subtotal,
        final_amount: total,
        tax: taxAmount,
        latitude,
        longitude,
        ...(method === 'cash' && {
          cash_received: parseFloat(cashReceived) || total,
          cash_change: Math.max(changeAmount || 0, 0)
        })
      };

      const { data, error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();
      
      if (transactionError) throw transactionError;

      const itemsToInsert = cartItems.map((item) => ({
        transaction_id: data.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemError } = await supabase
        .from('transaction_items')
        .insert(itemsToInsert);
      
      if (itemError) throw itemError;

      Alert.alert('Success', 'Transaction completed!', [
        { text: 'OK', onPress: () => {
          clearCart();
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        }}
      ]);
      
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setIsCashModalVisible(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      {item.image_url && (
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>Rp {item.price.toLocaleString()}</Text>
        
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={16} color="#fc6b03" />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color="#fc6b03" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.itemSubtotal}>
        <Text style={styles.subtotalText}>
          Rp {(item.price * item.quantity).toLocaleString()}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => removeFromCart(item.id)}
      >
        <Ionicons name="trash-bin" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity 
            style={styles.continueShopping}
            onPress={() => navigation.navigate('Main')}
          >
            <Text style={styles.continueText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
          
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>Rp {subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({taxRate}%)</Text>
              <Text style={styles.summaryValue}>Rp {taxAmount.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rp {total.toLocaleString()}</Text>
            </View>
          </View>
          
          <View style={styles.paymentButtons}>
          <TouchableOpacity 
                style={[styles.paymentButton, styles.cashButton]}
                onPress={() => setIsCashModalVisible(true)}
                disabled={loading} // Disable button when loading
              >
                {loading ? (
                  <ActivityIndicator color="#fff" /> // Show spinner when loading
                ) : (
                  <>
                    <Ionicons name="cash" size={20} color="#fff" />
                    <Text style={styles.paymentButtonText}>Pay with Cash</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.paymentButton, styles.qrisButton]}
                onPress={() => handleCheckout('qris')}
                disabled={loading} // Disable button when loading
              >
                {loading ? (
                  <ActivityIndicator color="#fff" /> // Show spinner when loading
                ) : (
                  <>
                    <Ionicons name="qr-code" size={20} color="#fff" />
                    <Text style={styles.paymentButtonText}>Pay with QRIS</Text>
                  </>
                )}
              </TouchableOpacity>
          </View>
        </>
      )}
{/* Loading Overlay */}
{loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      <CashPaymentModal
        visible={isCashModalVisible}
        onClose={() => setIsCashModalVisible(false)}
        total={total}
        onConfirm={(received, change) => handleCheckout('cash', received, change)}
        onSkip={() => handleCheckout('cash')}
        cashReceived={cashReceived}
        setCashReceived={setCashReceived}
        changeAmount={changeAmount}
        setChangeAmount={setChangeAmount}
      />
      
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ... (keep all your existing styles exactly as they were)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    marginBottom:40
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fc6b03',
    padding: 15,
    paddingTop: 50,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 25,
  },
  continueShopping: {
    backgroundColor: '#fc6b03',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    padding: 6,
    backgroundColor: '#fff8f2',
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  itemSubtotal: {
    marginLeft: 15,
  },
  subtotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fc6b03',
  },
  deleteButton: {
    marginLeft: 15,
    padding: 8,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fc6b03',
  },
  paymentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 20,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cashButton: {
    backgroundColor: '#4CAF50',
  },
  qrisButton: {
    backgroundColor: '#2196F3',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  exactButton: {
    backgroundColor: '#2196F3',
    marginBottom: 10,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  changeText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  warningText: {
    color: 'red',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
  },
  continueShopping: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fc6b03',
    borderRadius: 5,
  },
  continueText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex:10
  },
});