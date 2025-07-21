import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToken } from '../../contexts/TokenContext';
import { 
  XMarkIcon, 
  CreditCardIcon,
  PlusIcon,
  MinusIcon 
} from '@heroicons/react/24/outline';

interface TokenAllocationModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const TokenAllocationModal: React.FC<TokenAllocationModalProps> = ({ 
  user, 
  onClose, 
  onSuccess 
}) => {
  const { user: currentUser } = useAuth();
  const { allocateTokens, adjustTokens } = useToken();
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    type: 'allocate' as 'allocate' | 'adjust'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const amount = parseInt(formData.amount);
      if (isNaN(amount) || amount === 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (!formData.description.trim()) {
        setError('Please provide a description');
        return;
      }

      if (formData.type === 'allocate') {
        await allocateTokens(user.id, Math.abs(amount), formData.description);
      } else {
        // For adjustments, allow negative amounts
        await adjustTokens(user.id, amount, formData.description);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCardIcon className="h-5 w-5 mr-2" />
            Manage Tokens for {user.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Current Balance</div>
          <div className="text-xl font-bold text-gray-900">
            {user.tokens_remaining} tokens
          </div>
          <div className="text-xs text-gray-500">
            {user.tokens_consumed} consumed • {user.tokens_given} total allocated
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'allocate' })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === 'allocate'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <PlusIcon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Allocate</div>
                <div className="text-xs text-gray-500">Add tokens</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'adjust' })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  formData.type === 'adjust'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MinusIcon className="h-5 w-5 mx-auto mb-1" />
                <div className="text-sm font-medium">Adjust</div>
                <div className="text-xs text-gray-500">Add/Remove</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount {formData.type === 'adjust' && '(use negative for deduction)'}
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={formData.type === 'allocate' ? 'Enter tokens to add' : 'Enter amount (+/-)'}
              required
              min={formData.type === 'allocate' ? '1' : undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Reason for this token transaction..."
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 
               formData.type === 'allocate' ? 'Allocate Tokens' : 'Adjust Tokens'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TokenAllocationModal;