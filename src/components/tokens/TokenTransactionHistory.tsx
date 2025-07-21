import React, { useState, useEffect } from 'react';
import { useToken, TokenTransaction } from '../../contexts/TokenContext';
import { 
  XMarkIcon, 
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CreditCardIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface TokenTransactionHistoryProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

const TokenTransactionHistory: React.FC<TokenTransactionHistoryProps> = ({ 
  userId, 
  userName, 
  onClose 
}) => {
  const { getUserTransactionHistory } = useToken();
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const history = await getUserTransactionHistory(userId);
      setTransactions(history);
    } catch (error) {
      console.error('Error loading transaction history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'allocated':
        return <ArrowUpIcon className="h-5 w-5 text-green-600" />;
      case 'consumed':
        return <ArrowDownIcon className="h-5 w-5 text-red-600" />;
      case 'refunded':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600" />;
      case 'adjusted':
        return <AdjustmentsHorizontalIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (type === 'consumed') return 'text-red-600';
    if (type === 'refunded' || type === 'allocated') return 'text-green-600';
    if (type === 'adjusted') return amount > 0 ? 'text-green-600' : 'text-red-600';
    return 'text-gray-600';
  };

  const getTransactionBgColor = (type: string) => {
    switch (type) {
      case 'allocated': return 'bg-green-50 border-green-200';
      case 'consumed': return 'bg-red-50 border-red-200';
      case 'refunded': return 'bg-blue-50 border-blue-200';
      case 'adjusted': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.transaction_type === filter;
  });

  const formatAmount = (amount: number) => {
    return amount > 0 ? `+${amount}` : amount.toString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Token History - {userName}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'allocated', 'consumed', 'refunded', 'adjusted'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === filterType
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {filterType !== 'all' && (
                  <span className="ml-1 text-xs">
                    ({transactions.filter(t => t.transaction_type === filterType).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading transactions...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions found</p>
              <p className="text-sm mt-1">
                {filter === 'all' ? 'No token transactions yet' : `No ${filter} transactions`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`p-4 rounded-lg border ${getTransactionBgColor(transaction.transaction_type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-white rounded-full border">
                        {getTransactionIcon(transaction.transaction_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-900 capitalize">
                            {transaction.transaction_type.replace('_', ' ')}
                          </p>
                          <div className="text-right">
                            <span className={`text-lg font-bold ${getTransactionColor(transaction.transaction_type, transaction.amount)}`}>
                              {formatAmount(transaction.amount)} tokens
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {transaction.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center space-x-4">
                            <span>
                              {new Date(transaction.created_at).toLocaleDateString()} at{' '}
                              {new Date(transaction.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {transaction.created_by_name && (
                              <span>by {transaction.created_by_name}</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div>Balance: {transaction.balance_after} tokens</div>
                            {transaction.reference_type && (
                              <div className="text-xs text-gray-400">
                                Ref: {transaction.reference_type}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {!isLoading && filteredTransactions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Total Transactions</div>
                <div className="text-lg font-bold text-gray-900">{filteredTransactions.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Allocated</div>
                <div className="text-lg font-bold text-green-600">
                  +{filteredTransactions
                    .filter(t => t.transaction_type === 'allocated')
                    .reduce((sum, t) => sum + t.amount, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Consumed</div>
                <div className="text-lg font-bold text-red-600">
                  {filteredTransactions
                    .filter(t => t.transaction_type === 'consumed')
                    .reduce((sum, t) => sum + t.amount, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Current Balance</div>
                <div className="text-lg font-bold text-blue-600">
                  {filteredTransactions.length > 0 ? filteredTransactions[0].balance_after : 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenTransactionHistory;