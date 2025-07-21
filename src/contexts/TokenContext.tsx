import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface TokenTransaction {
  id: string;
  user_id: string;
  transaction_type: 'allocated' | 'consumed' | 'refunded' | 'adjusted' | 'expired';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  reference_type?: string;
  created_by_name?: string;
  created_at: string;
}

interface TokenContextType {
  transactions: TokenTransaction[];
  isLoading: boolean;
  allocateTokens: (userId: string, amount: number, description: string) => Promise<void>;
  adjustTokens: (userId: string, amount: number, description: string) => Promise<void>;
  getUserTransactionHistory: (userId: string) => Promise<TokenTransaction[]>;
  refreshTransactions: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};

export const TokenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { getUserById } = useAuth();

  const allocateTokens = async (userId: string, amount: number, description: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('create_token_transaction', {
        p_user_id: userId,
        p_transaction_type: 'allocated',
        p_amount: amount,
        p_description: description
      });

      if (error) throw error;
      await refreshTransactions();
    } catch (error) {
      console.error('Error allocating tokens:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const adjustTokens = async (userId: string, amount: number, description: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('create_token_transaction', {
        p_user_id: userId,
        p_transaction_type: 'adjusted',
        p_amount: amount,
        p_description: description
      });

      if (error) throw error;
      await refreshTransactions();
    } catch (error) {
      console.error('Error adjusting tokens:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getUserTransactionHistory = async (userId: string): Promise<TokenTransaction[]> => {
    try {
      const { data, error } = await supabase.rpc('get_user_token_history', {
        p_user_id: userId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user transaction history:', error);
      return [];
    }
  };

  const refreshTransactions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('token_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data?.map(transaction => ({
        ...transaction,
        created_by_name: getUserById(transaction.created_by)?.name || 'System'
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshTransactions();
  }, []);

  return (
    <TokenContext.Provider value={{
      transactions,
      isLoading,
      allocateTokens,
      adjustTokens,
      getUserTransactionHistory,
      refreshTransactions
    }}>
      {children}
    </TokenContext.Provider>
  );
};