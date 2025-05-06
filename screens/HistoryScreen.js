import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  Pressable, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  RefreshControl
} from 'react-native';
import { supabase } from '../pos-backend/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedButtons } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTransactions } from '../hooks/useTransactions';

// Helper functions
const formatRupiah = (number) => `Rp ${number.toLocaleString('id-ID')}`;
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

export default function HistoryScreen({ navigation }) {
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionItems, setTransactionItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, count: 0 });
  const [userId, setUserId] = useState(null);

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserId(user.id); 
      return user;
    }
    return null;
  };


  const { transactions, loading, refresh } = useTransactions(userId);

  useEffect(() => {
    const fetchData = async () => {
      const user = await loadUser();
      if (user && user.id) {
        refresh(user.id);  // Refresh with user ID from AsyncStorage
      }
    };
    fetchData();
  }, []); 

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', refresh);
    return unsubscribe;
  }, [transactions, refresh]);

  useEffect(() => {
    if (transactions.length > 0) {
      applyFilter();
    }
  }, [transactions, filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    const user = await loadUser(); // Ensure user data is loaded here
    if (user?.id) {
      await refresh(user.id);  // Call refresh with correct user ID
    }
    setRefreshing(false);
  };

  const applyFilter = () => {
    const now = new Date();
    let filtered = [...transactions];

    switch (filter) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filtered = transactions.filter(t => {
          const tDate = new Date(t.transaction_time);
          return tDate >= today;
        });
        break;
      case 'week':
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        filtered = transactions.filter(t => {
          const tDate = new Date(t.transaction_time);
          return tDate >= startOfWeek;
        });
        break;
      case 'month':
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        filtered = transactions.filter(t => {
          const tDate = new Date(t.transaction_time);
          return tDate >= startOfMonth;
        });
        break;
      default:
        filtered = [...transactions];
    }

    setFilteredTransactions(filtered);
    calculateSummary(filtered);
  };

  const calculateSummary = (transactions) => {
    const total = transactions.reduce((sum, t) => sum + t.final_amount, 0);
    setSummary({
      total,
      count: transactions.length
    });
  };

  const handleCardPress = async (transaction) => {
    setSelectedTransaction(transaction);
    setModalVisible(true);
    setLoadingItems(true);

    try {
      // Correct query with table join
      const { data, error } = await supabase
        .from('transaction_items')
        .select(`
          *,
          product:product_id (name)
        `)
        .eq('transaction_id', transaction.id);
  
      if (error) throw error;
  
      // Transform the data to include the product name
      const itemsWithNames = data.map(item => ({
        ...item,
        name: item.product?.name || 'Unknown Product' // Use the joined product name
      }));
  
      setTransactionItems(itemsWithNames);
    } catch (error) {
      console.error('Error fetching items:', error.message);
    } finally {
      setLoadingItems(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleCardPress(item)}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.transactionCode}>#{item.transaction_code}</Text>
          <Text style={styles.transactionAmount}>{formatRupiah(item.final_amount)}</Text>
        </View>
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.detailText}>{formatDate(item.transaction_time)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="card" size={16} color="#666" />
            <Text style={styles.detailText}>{item.payment_method.toUpperCase()}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
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
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Filter Controls */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={filterOptions}
          style={styles.segmentedButtons}
          contentStyle={{ flexWrap: 'wrap' }} // <-- allow multiple lines
          theme={{ colors: { secondaryContainer: '#fc6b03' } }}
          labelStyle={{ flexShrink: 1, fontSize: 14 }} // <-- key part
        />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={styles.summaryValue}>{summary.count}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>{formatRupiah(summary.total)}</Text>
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
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
            <Ionicons name="receipt-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />

      {/* Transaction Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedTransaction && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Transaction Details</Text>
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Transaction Code:</Text>
                      <Text style={styles.infoValue}>{selectedTransaction.transaction_code}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date & Time:</Text>
                      <Text style={styles.infoValue}>{formatDate(selectedTransaction.transaction_time)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Payment Method:</Text>
                      <Text style={styles.infoValue}>{selectedTransaction.payment_method.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.sectionTitle}>Items Purchased</Text>
                  
                  {loadingItems ? (
                    <ActivityIndicator size="small" color="#fc6b03" style={styles.loadingIndicator} />
                  ) : transactionItems.length === 0 ? (
                    <Text style={styles.noItemsText}>No items found</Text>
                  ) : (
                    transactionItems.map((item) => (
                      <View key={item.id} style={styles.itemContainer}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemPrice}>{formatRupiah(item.price)}</Text>
                        </View>
                        <View style={styles.itemMeta}>
                          <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                          <Text style={styles.itemSubtotal}>{formatRupiah(item.price * item.quantity)}</Text>
                        </View>
                      </View>
                    ))
                  )}

                  <View style={styles.divider} />

                  <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Subtotal:</Text>
                      <Text style={styles.totalValue}>{formatRupiah(selectedTransaction.total_amount)}</Text>
                    </View>
                    {selectedTransaction.tax > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tax:</Text>
                        <Text style={styles.totalValue}>{formatRupiah(selectedTransaction.tax)}</Text>
                      </View>
                    )}
                    {selectedTransaction.discount_amount > 0 && (
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Discount:</Text>
                        <Text style={styles.totalValue}>-{formatRupiah(selectedTransaction.discount_amount)}</Text>
                      </View>
                    )}
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalLabel}>Total:</Text>
                      <Text style={styles.grandTotalValue}>{formatRupiah(selectedTransaction.final_amount)}</Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    marginBottom:40
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
    paddingTop: 50,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: '100%',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  segmentedButtons: {
    borderRadius: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 5,
    elevation: 2,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginVertical: 7,
    padding: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transactionCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fc6b03',
  },
  cardDetails: {
    marginTop: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  infoSection: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  noItemsText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  itemContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  itemName: {
    fontSize: 16,
    color: '#333',
    flex: 2,
  },
  itemPrice: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  totalSection: {
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    color: '#333',
  },
  grandTotalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fc6b03',
  },
});