'use client';

import { useState } from 'react';
import { X, Coins, Loader2 } from 'lucide-react';
import { getERC20Service } from '@/services/erc20/erc20Service';

interface CreateTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tokenAddress: string, txHash: string, tokenDetails: { name: string; symbol: string; totalSupply: number; decimals: number }) => void;
  initialData?: {
    tokenName?: string;
    tokenSymbol?: string;
    totalSupply?: number;
    decimals?: number;
  };
}

export default function CreateTokenModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CreateTokenModalProps) {
  const [formData, setFormData] = useState({
    tokenName: initialData?.tokenName || '',
    tokenSymbol: initialData?.tokenSymbol || '',
    totalSupply: initialData?.totalSupply || 1000000,
    decimals: initialData?.decimals || 18,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      // Validate inputs
      if (!formData.tokenName.trim()) {
        throw new Error('Please enter a token name');
      }

      if (!formData.tokenSymbol.trim()) {
        throw new Error('Please enter a token symbol');
      }

      if (formData.totalSupply <= 0) {
        throw new Error('Total supply must be greater than 0');
      }

      if (formData.decimals < 0 || formData.decimals > 18) {
        throw new Error('Decimals must be between 0 and 18');
      }

      const erc20Service = getERC20Service();

      const result = await erc20Service.createToken({
        name: formData.tokenName,
        symbol: formData.tokenSymbol.toUpperCase(),
        initialSupply: formData.totalSupply,
        decimals: formData.decimals,
      });

      onSuccess(result.tokenAddress, result.txHash, {
        name: formData.tokenName,
        symbol: formData.tokenSymbol.toUpperCase(),
        totalSupply: formData.totalSupply,
        decimals: formData.decimals,
      });
      onClose();
    } catch (err: any) {
      console.error('Error creating token:', err);
      setError(err.message || 'Failed to create token');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full my-8 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">Create ERC20 Token</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isCreating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
          {/* Token Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tokenName}
              onChange={(e) => handleChange('tokenName', e.target.value)}
              placeholder="e.g., My Token"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              required
              disabled={isCreating}
            />
          </div>

          {/* Token Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Symbol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tokenSymbol}
              onChange={(e) => handleChange('tokenSymbol', e.target.value.toUpperCase())}
              placeholder="e.g., MTK"
              maxLength={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 uppercase"
              required
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500 mt-1">
              A short identifier for your token (e.g., BTC, ETH)
            </p>
          </div>

          {/* Total Supply */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Supply <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.totalSupply}
              onChange={(e) => handleChange('totalSupply', Number(e.target.value))}
              placeholder="1000000"
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              required
              disabled={isCreating}
            />
            <p className="text-xs text-gray-500 mt-1">
              Total number of tokens to create (before decimals)
            </p>
          </div>

          {/* Decimals */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decimals
            </label>
            <select
              value={formData.decimals}
              onChange={(e) => handleChange('decimals', Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              disabled={isCreating}
            >
              {[0, 6, 8, 9, 12, 18].map((decimals) => (
                <option key={decimals} value={decimals}>
                  {decimals} {decimals === 18 ? '(Standard)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Number of decimal places (18 is standard for most tokens)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">Token Details</h3>
            <div className="space-y-1 text-xs text-purple-800">
              <p>
                <strong>Name:</strong> {formData.tokenName || 'Not set'}
              </p>
              <p>
                <strong>Symbol:</strong> {formData.tokenSymbol.toUpperCase() || 'Not set'}
              </p>
              <p>
                <strong>Total Supply:</strong>{' '}
                {formData.totalSupply.toLocaleString()} {formData.tokenSymbol.toUpperCase() || 'tokens'}
              </p>
              <p>
                <strong>Actual Supply:</strong>{' '}
                {(formData.totalSupply * Math.pow(10, formData.decimals)).toLocaleString()} (with{' '}
                {formData.decimals} decimals)
              </p>
            </div>
          </div>
          </form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Creating a token will deploy a new smart contract on the blockchain.
              Make sure all details are correct as they cannot be changed after deployment. You will be the
              owner of this token and can mint additional tokens or transfer ownership later.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Token...
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  Create Token
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
