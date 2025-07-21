import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBooking } from '../../contexts/BookingContext';
import { useMachine } from '../../contexts/MachineContext';
import { useToken } from '../../contexts/TokenContext';
import { 
  CreditCardIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ClockIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const TokenManagement: React.FC = () => {
  const { user } = useAuth();
  const { bookings } = useBooking();
  const { machines, machineTypes } = useMachine();
  const { getUserTransactionHistory } = useToken();
  const [recentTransactions, setRecentTransactions] = React.useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = React.useState(true);

  React.useEffect(() => {
    if (user) {
      loadRecentTransactions();
    }
  }, [user]);

  const loadRecentTransactions = async () => {
    if (!user) return;
    
    setIsLoadingTransactions(true);
    try {
      const transactions = await getUserTransactionHistory(user.id);
      setRecentTransactions(transactions.slice(0, 10)); // Show last 10 transactions
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const userBookings = bookings.filter(booking => booking.user_id === user?.id);

  // Calculate actual token usage from approved bookings
  const actualTokensConsumed = userBookings
    .filter(booking => booking.status === 'approved')
    .reduce((sum, booking) => sum + booking.tokens_consumed, 0);
  
  const actualTokensRemaining = user ? user.tokens_given - actualTokensConsumed : 0;
  const tokenUsagePercentage = user ? (actualTokensConsumed / user.tokens_given) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Token Management</h1>
        
        {/* Token Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Tokens</p>
                <p className="text-2xl sm:text-3xl font-bold">{user?.tokens_given || 0}</p>
              </div>
              <div className="p-3 bg-blue-400 rounded-lg">
                <CreditCardIcon className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Remaining</p>
                <p className="text-2xl sm:text-3xl font-bold">{actualTokensRemaining}</p>
              </div>
              <div className="p-3 bg-green-400 rounded-lg">
                <ArrowUpIcon className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Consumed</p>
                <p className="text-2xl sm:text-3xl font-bold">{actualTokensConsumed}</p>
              </div>
              <div className="p-3 bg-red-400 rounded-lg">
                <ArrowDownIcon className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Usage Chart */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Usage Progress</span>
              <span className="text-sm font-medium text-gray-900">
                {actualTokensConsumed} / {user?.tokens_given} ({tokenUsagePercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  tokenUsagePercentage > 80 ? 'bg-red-500' : 
                  tokenUsagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(tokenUsagePercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>{user?.tokens_given}</span>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <BanknotesIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {isLoadingTransactions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading transactions...</p>
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No token transactions yet</p>
                <p className="text-sm mt-1">Start booking machines to see your token usage</p>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-full ${
                      transaction.transaction_type === 'consumed' ? 'bg-red-100' : 
                      transaction.transaction_type === 'allocated' ? 'bg-green-100' :
                      transaction.transaction_type === 'refunded' ? 'bg-blue-100' : 'bg-yellow-100'
                    }`}>
                      {transaction.transaction_type === 'consumed' ? (
                        <ArrowDownIcon className="h-5 w-5 text-red-600" />
                      ) : transaction.transaction_type === 'allocated' ? (
                        <ArrowUpIcon className="h-5 w-5 text-green-600" />
                      ) : transaction.transaction_type === 'refunded' ? (
                        <ArrowUpIcon className="h-5 w-5 text-blue-600" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {new Date(transaction.created_at).toLocaleDateString()} • 
                        {transaction.created_by_name && ` by ${transaction.created_by_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`font-medium ${
                      transaction.transaction_type === 'consumed' ? 'text-red-600' : 
                      transaction.transaction_type === 'allocated' ? 'text-green-600' :
                      transaction.transaction_type === 'refunded' ? 'text-blue-600' : 'text-yellow-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} tokens
                    </span>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Balance: {transaction.balance_after}
                    </p>
                  </div>
                </div>
              ))
            )}
            {recentTransactions.length >= 10 && (
              <div className="text-center pt-4">
                <p className="text-sm text-gray-500">
                  Showing recent 10 transactions. Contact admin for complete history.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenManagement;