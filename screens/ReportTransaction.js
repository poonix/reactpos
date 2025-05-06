import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView,
  Modal
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from 'react-native-toast-message';
import { fetchReportTransactions, fetchTotalTransactionAmount } from '../services/reportService';
import { Ionicons } from '@expo/vector-icons';

const ReportTransactionScreen = ({ navigation }) => {
  const [filters, setFilters] = useState({
    transactionId: '',
    productName: '',
    userId: '',
    fromDate: null,
    toDate: null,
    paymentMethod: '', // Added payment method filter
  });

  const paymentMethods = [
    { value: '', label: 'All Methods' },
    { value: 'qris', label: 'QRIS' },
    { value: 'cash', label: 'Cash' },
  ];
  const [isFetching, setIsFetching] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isFromPickerVisible, setFromPickerVisible] = useState(false);
  const [isToPickerVisible, setToPickerVisible] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  

  const pageSize = 10;

  const showToast = (message) => {
    Toast.show({
      type: 'info',
      text1: message,
    });
  };

  const hasFilters = () => {
    return (
      filters.transactionId ||
      filters.productName ||
      filters.userId ||
      filters.fromDate ||
      filters.toDate ||
      filters.paymentMethod
    );
  };

  const validateDates = () => {
    if (filters.fromDate && filters.toDate) {
      if (filters.fromDate > filters.toDate) {
        showToast('"To Date" cannot be before "From Date"');
        return false;
      }
    }
    if ((filters.fromDate && !filters.toDate) || (!filters.fromDate && filters.toDate)) {
      showToast('Please fill both date fields');
      return false;
    }
    return true;
  };

  const loadMore = async () => {
    // Prevent loading more if:
    // 1. Already fetching
    // 2. No more data to load
    // 3. We've reached the total count
    if (isFetching || !hasMore || transactions.length >= totalCount) return;
    
    const nextPage = page + 1;
    
    setIsFetching(true);
    try {
      const { data: result } = await fetchReportTransactions({ ...filters, page: nextPage, pageSize });
      
      if (result.length === 0) {
        setHasMore(false);
      } else {
        setTransactions(prev => [...prev, ...result]);
        setPage(nextPage);
        setHasMore(transactions.length + result.length < totalCount);
      }
    } catch (error) {
      console.error(error);
      showToast('Error loading more data');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSearch = async () => {
    if (!hasFilters()) {
      showToast('Please apply at least one filter');
      return;
    }
    //console.log(transactions.length)
    setIsFetching(true);
    try {
      // Fetch transactions and total amount in parallel
      //const [transactionsResult, totalAmount] = await Promise.all([
        //fetchReportTransactions({ ...filters, page: 1, pageSize }),
        //fetchTotalTransactionAmount(filters)
      //]);

       // Fetch both data and total in parallel
    const [transactionsResult, filteredTotal] = await Promise.all([
      fetchReportTransactions({ ...filters, page: 1, pageSize }),
      fetchTotalTransactionAmount(filters)
    ]);

    setTransactions(transactionsResult.data);
    setTotalAmount(filteredTotal); // This now reflects filtered total
    setTotalCount(transactionsResult.totalCount);
    setHasMore(transactionsResult.data.length === pageSize);
    } catch (error) {
      console.error(error);
      showToast('Failed to fetch data');
    } finally {
      setIsFetching(false);
    }
  };

  const handleDateSelect = (field, date) => {
    const newFilters = { ...filters, [field]: date };
    setFilters(newFilters);
    field === 'fromDate' ? setFromPickerVisible(false) : setToPickerVisible(false);
  };

  const openTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalVisible(true);
  };

  const formatIndonesianDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('id-ID', options);
  };
  
  const calculateTotalQuantity = (transaction) => {
    return transaction.transaction_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  const totalItems = transactions.reduce((sum, trx) => 
    sum + (trx.transaction_items?.reduce((s, i) => s + i.quantity, 0) || 0), 0
  );  

  // Update renderItem to show payment method
  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity onPress={() => openTransactionDetails(item)}>
      <View style={styles.card}>
        <Text style={styles.cardText}>ID: {item.transaction_code}</Text>
        <Text style={styles.cardText}>Tanggal: {formatIndonesianDate(item.transaction_time)}</Text>
        <Text style={styles.cardText}>Metode: {item.payment_method}</Text>
        <Text style={styles.cardText}>Total Item: {calculateTotalQuantity(item)}</Text>
        <Text style={styles.cardText}>Total: Rp{item.final_amount?.toLocaleString('id-ID')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Laporan Transaksi</Text>
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        {/* Payment Method Filter */}
        <View style={styles.paymentMethodContainer}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.methodButton,
                filters.paymentMethod === method.value && styles.methodButtonActive
              ]}
              onPress={() => setFilters({ ...filters, paymentMethod: method.value })}
            >
              <Text style={[
                styles.methodButtonText,
                filters.paymentMethod === method.value && styles.methodButtonTextActive
              ]}>
                {method.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Other filters... */}
        <View style={styles.row}>
          <TextInput
            placeholder="ID Transaksi"
            style={styles.inputHalf}
            value={filters.transactionId}
            onChangeText={(text) => setFilters({ ...filters, transactionId: text })}
          />
          <TextInput
            placeholder="ID Pengguna"
            style={styles.inputHalf}
            value={filters.userId}
            onChangeText={(text) => setFilters({ ...filters, userId: text })}
          />
        </View>
        <TextInput
          placeholder="Nama Produk"
          style={styles.input}
          value={filters.productName}
          onChangeText={(text) => setFilters({ ...filters, productName: text })}
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.inputHalf}
            onPress={() => setFromPickerVisible(true)}
          >
            <Text>{filters.fromDate ? filters.fromDate.toLocaleDateString('id-ID') : 'Dari Tanggal'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inputHalf}
            onPress={() => setToPickerVisible(true)}
          >
            <Text>{filters.toDate ? filters.toDate.toLocaleDateString('id-ID') : 'Sampai Tanggal'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.searchBtn} 
          onPress={handleSearch}
          disabled={isFetching}
        >
          {isFetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchText}>Cari</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Transaction List */}
      <View style={styles.listContainer}>
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => item.id?.toString() + index}
          renderItem={renderTransactionItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetching ? (
              <ActivityIndicator size="small" color="#fc6b03" />
            ) : !hasMore && transactions.length > 0 ? (
              <View style={styles.noMoreDataContainer}>
                <Text style={styles.noMoreDataText}>No more data available</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isFetching && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {hasFilters() ? 'Tidak ada transaksi ditemukan' : 'Silakan terapkan filter untuk mencari transaksi'}
                </Text>
              </View>
            )
          }
        />
      </View>

      {/* Summary Bar */}
      {transactions.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Transaksi:</Text>
            <Text style={styles.summaryValue}>{totalCount}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Item:</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>
          <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Nilai:</Text>
          {isFetching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.summaryValue}>Rp{totalAmount.toLocaleString('id-ID')}</Text>
          )}
        </View>
        </View>
      )}

      {/* Transaction Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transaction Details</Text>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {selectedTransaction && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Transaction Code:</Text>
                <Text style={styles.detailValue}>{selectedTransaction.transaction_code}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedTransaction.transaction_time).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>User ID:</Text>
                <Text style={styles.detailValue}>{selectedTransaction.id_user}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Total Amount:</Text>
                <Text style={styles.detailValue}>
                  Rp{selectedTransaction.final_amount?.toLocaleString()}
                </Text>
              </View>

              <Text style={styles.itemsTitle}>Items:</Text>
              {selectedTransaction.transaction_items?.map((item, index) => (
                <View key={`${item.id}_${index}`} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>
                  {item.products?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemPrice}>Rp{item.products?.price?.toLocaleString('id-ID')}</Text>
                  <Text style={styles.itemTotal}>Rp{item.total_price?.toLocaleString('id-ID')}</Text>
                </View>
              </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={isFromPickerVisible}
        mode="date"
        onConfirm={(date) => handleDateSelect('fromDate', date)}
        onCancel={() => setFromPickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={isToPickerVisible}
        mode="date"
        onConfirm={(date) => handleDateSelect('toDate', date)}
        onCancel={() => setToPickerVisible(false)}
      />

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fc6b03',
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
    fontSize: 16,
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  searchBtn: {
    backgroundColor: '#fc6b03',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  searchText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Update card styles to accommodate new field
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 8,
    elevation: 2,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
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
    textAlign: 'center',
  },
  summaryBar: {
    backgroundColor: '#2c3e50',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom:40
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Add these new styles for the modal
  modalContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    marginTop: 16,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  detailValue: {
    fontSize: 16,
    marginTop: 4,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  itemContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 16,
    color: '#666',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
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
  noMoreDataContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMoreDataText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  // Add these new styles for payment method filter
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  methodButton: {
    flex: 1,
    padding: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#fc6b03',
  },
  methodButtonText: {
    color: '#333',
  },
  methodButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ReportTransactionScreen;