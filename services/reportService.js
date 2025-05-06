import { supabase } from '../pos-backend/supabase';

export const fetchReportTransactions = async (filters = {}, page = 1, limit = 10) => {

  let countQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
      
  const {
    transactionId = '',
    productName = '',
    userId = null,
    fromDate = null,
    toDate = null,
    paymentMethod = ''
  } = filters;

  try {
    let query = supabase
      .from('transactions')
      .select(`
        id,
        transaction_code,
        transaction_time,
        payment_method,
        final_amount,
        id_user,
        transaction_items(
          product_id,
          quantity,
          total_price,
          products(
            id,
            name,
            sku,
            price
          )
        )
      `, { count: 'exact' }) // Add count to get total records
      .order('transaction_time', { ascending: false })
      //.range((page - 1) * limit, page * limit - 1);

    // Apply filters only if they have valid values
    if (fromDate) {
      query = query.gte('transaction_time', new Date(fromDate).toISOString());
      countQuery = countQuery.gte('transaction_time', new Date(fromDate).toISOString());
    }

    if (toDate) {
      query = query.lte('transaction_time', new Date(toDate).toISOString());
      countQuery = countQuery.gte('transaction_time', new Date(toDate).toISOString());
    }

    if (transactionId && transactionId.trim() !== '') {
      query = query.ilike('transaction_code', `%${transactionId.trim()}%`);
    }

    if (userId !== null && userId !== '' && userId !== undefined) {
      countQuery = countQuery.eq('id_user', userId);
      query = query.eq('id_user', userId);
    }

    if (paymentMethod && paymentMethod.trim() !== '') {
      countQuery = countQuery.ilike('payment_method', paymentMethod.trim());
      query = query.ilike('payment_method', paymentMethod.trim());
    }

    /*
    if (productName && productName.trim() !== '') {
      countQuery = countQuery.contains('transaction_items.products.name', productName);
      query = query.ilike('transaction_items.products.name', productName.trim());
    }*/
    
    //const { data, error, count } = await query; // Get count from response
    const [{ count }, { data, error }] = await Promise.all([
      countQuery,
      query
    ]);
    if (error) throw error;
   
     
    // Post-filtering for productName
    let filteredData = data;
    if (productName && productName.trim() !== '') {
      countQuery = countQuery.contains('transaction_items.products.name', productName);
      filteredData = data.filter(trx =>
        trx.transaction_items?.some(item =>
          item.products?.name?.toLowerCase().includes(productName.toLowerCase())
        )
      );
    }
     
     const transformedData = filteredData.map(transaction => ({
      ...transaction,
      product_names: transaction.transaction_items
        ?.map(item => item.products?.name)
        .filter(Boolean)
        .join(', ') || 'No products'
    }));
    
    
    return {
      data: transformedData,
      totalCount: transformedData.length // This is the accurate total count of ALL matching records
    };
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const fetchTotalTransactionAmount = async (filters = {}) => {
  const {
    transactionId = '',
    productName = '',
    userId = null,
    fromDate = null,
    toDate = null,
    paymentMethod = ''
  } = filters;

  try {
    let query = supabase
      .from('transactions')
      .select(`
        id,
        final_amount,
        payment_method,
        final_amount,
        id_user,
        transaction_items!inner(
          products!inner(name)
        )
      `);

    if (fromDate) {
      query = query.gte('transaction_time', new Date(fromDate).toISOString());
    }

    if (toDate) {
      query = query.lte('transaction_time', new Date(toDate).toISOString());
    }

    if (transactionId && transactionId.trim() !== '') {
      query = query.ilike('transaction_code', `%${transactionId.trim()}%`);
    }

    if (userId !== null && userId !== '' && userId !== undefined) {
      query = query.eq('id_user', userId);
    }

    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }

    if (productName) {
      query = query.ilike('transaction_items.products.name', `%${productName.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filteredData = data;
    if (productName && productName.trim() !== '') {
      filteredData = data.filter(trx =>
        trx.transaction_items?.some(item =>
          item.products?.name?.toLowerCase().includes(productName.toLowerCase())
        )
      );
    }

    return data.reduce((sum, trx) => sum + (Number(trx.final_amount) || 0), 0);
  } catch (error) {
    console.error('Error calculating total:', error);
    throw error;
  }
};