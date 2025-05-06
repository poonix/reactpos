import { useState, useCallback } from 'react';
import { supabase } from '../pos-backend/supabase';

export function useTransactions(userId) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return; // 👈 Wait until userId exists

    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id_user', userId)
      .order('transaction_time', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error.message);
    } else {
      setTransactions(data);
    }

    setLoading(false);
  }, [userId]);

  return { transactions, loading, refresh };
}
