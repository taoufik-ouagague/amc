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
      // For now, just show success message since we don't have the RPC function set up yet
      // This will be implemented once the database is properly configured
      console.log('Token allocation would happen here:', { userId, amount, description });
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
      // For now, just show success message since we don't have the RPC function set up yet
      // This will be implemented once the database is properly configured
      console.log('Token adjustment would happen here:', { userId, amount, description });
    } catch (error) {
      console.error('Error adjusting tokens:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getUserTransactionHistory = async (userId: string): Promise<TokenTransaction[]> => {
    try {
      // For now, return empty array since we don't have the RPC function set up yet
      // This will be implemented once the database is properly configured
      return [];
    } catch (error) {
      console.error('Error fetching user transaction history:', error);
      return [];
    }
  };

  const refreshTransactions = async () => {
    setIsLoading(true);
    try {
      // For now, return empty array since we don't have token_transactions table set up yet
      // This will be implemented once the database is properly configured
      setTransactions([]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
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