'use client';

import { useState, useEffect } from 'react';
import { X, ArrowDown, RefreshCw, AlertCircle, CheckCircle, Shuffle } from 'lucide-react';
import { useWallet } from '@/services/blockchain/useWallet';
import { createDEXAggregator } from '@/services/trading/dexAggregator';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN_ID } from '@/config/chains';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Chain-specific token lists
const getTokensForChain = (chainId: number) => {
  const tokensByChain: Record<number, Array<{ symbol: string; name: string; decimals: number }>> = {
    1: [ // Ethereum
      { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { symbol: 'USDT', name: 'Tether', decimals: 6 },
      { symbol: 'DAI', name: 'Dai', decimals: 18 },
      { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
    ],
    137: [ // Polygon
      { symbol: 'MATIC', name: 'Polygon', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { symbol: 'USDT', name: 'Tether', decimals: 6 },
      { symbol: 'DAI', name: 'Dai', decimals: 18 },
    ],
    8453: [ // Base
      { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { symbol: 'DAI', name: 'Dai', decimals: 18 },
    ],
    42161: [ // Arbitrum
      { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { symbol: 'USDT', name: 'Tether', decimals: 6 },
      { symbol: 'DAI', name: 'Dai', decimals: 18 },
      { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
    ],
    10: [ // Optimism
      { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { symbol: 'USDT', name: 'Tether', decimals: 6 },
      { symbol: 'DAI', name: 'Dai', decimals: 18 },
    ],
    43114: [ // Avalanche
      { symbol: 'AVAX', name: 'Avalanche', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { symbol: 'USDT', name: 'Tether', decimals: 6 },
      { symbol: 'DAI', name: 'Dai', decimals: 18 },
    ],
    56: [ // BNB Chain
      { symbol: 'BNB', name: 'BNB', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', decimals: 18 },
      { symbol: 'USDT', name: 'Tether', decimals: 18 },
      { symbol: 'DAI', name: 'Dai', decimals: 18 },
    ],
    545: [ // Flow EVM Testnet
      { symbol: 'FLOW', name: 'Flow', decimals: 18 },
      { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    ],
  };

  return tokensByChain[chainId] || tokensByChain[1];
};

export default function TradeModal({ isOpen, onClose }: TradeModalProps) {
  const { address } = useWallet();
  const FLOW_CHAIN_ID = 545; // Flow EVM Testnet
  const [fromChain, setFromChain] = useState(DEFAULT_CHAIN_ID);
  // Default toChain to Flow EVM for cross-chain bridging
  const [toChain, setToChain] = useState(FLOW_CHAIN_ID);
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const isCrossChain = fromChain !== toChain;

  // Get chain-specific tokens
  const fromChainTokens = getTokensForChain(fromChain);
  const toChainTokens = getTokensForChain(toChain);

  // Reset tokens when chain changes if current token not available
  useEffect(() => {
    const fromTokenExists = fromChainTokens.some(t => t.symbol === fromToken);
    if (!fromTokenExists && fromChainTokens.length > 0) {
      setFromToken(fromChainTokens[0].symbol);
    }
  }, [fromChain, fromChainTokens, fromToken]);

  useEffect(() => {
    const toTokenExists = toChainTokens.some(t => t.symbol === toToken);
    if (!toTokenExists && toChainTokens.length > 0) {
      setToToken(toChainTokens[0].symbol);
    }
  }, [toChain, toChainTokens, toToken]);

  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && fromToken && toToken) {
      const timer = setTimeout(() => {
        fetchQuote();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setQuote(null);
    }
  }, [amount, fromToken, toToken, slippage, fromChain, toChain]);

  const fetchQuote = async () => {
    if (!amount || !fromToken || !toToken || !address) return;

    setIsLoadingQuote(true);
    setError(null);

    try {
      const dex = createDEXAggregator(fromChain);
      const quoteData = await dex.getSwapQuote(
        fromToken,
        toToken,
        amount,
        slippage,
        address
      );
      setQuote(quoteData);
    } catch (err) {
      console.error('Failed to fetch quote:', err);
      setQuote(null); // Clear quote on error

      // More helpful error message
      if (isCrossChain) {
        setError('No route available for this cross-chain swap. Try different chains, tokens, or a smaller amount.');
      } else {
        setError('Route not available. Please try a different token pair, adjust the amount, or select another chain.');
      }
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const executeSwap = async () => {
    if (!amount || !fromToken || !toToken || !address || !quote) return;

    setIsExecuting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain,
          toChain,
          fromToken,
          toToken,
          amount,
          slippage,
          address,
          simulate: false, // Set to true for testing without real execution
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Trade execution failed');
      }

      setSuccess(true);
      setTxHash(data.trade.txHash);

      // Reset form after 3 seconds
      setTimeout(() => {
        setAmount('');
        setQuote(null);
        setSuccess(false);
        setTxHash(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to execute swap:', err);
      const errorMessage = err instanceof Error ? err.message : 'Swap execution failed';

      // More helpful error messages
      if (errorMessage.includes('insufficient')) {
        setError('Insufficient balance. Please check your wallet balance and try a smaller amount.');
      } else if (errorMessage.includes('slippage')) {
        setError('Slippage too high. Try increasing your slippage tolerance or reducing the swap amount.');
      } else if (errorMessage.includes('route')) {
        setError('No swap route available. Please try different tokens or chains.');
      } else {
        setError('Transaction failed. Please check your wallet and try again.');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    const tempChain = fromChain;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromChain(toChain);
    setToChain(tempChain);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="relative bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
            <div>
              <h2 className="text-xl font-bold text-white">Swap Tokens</h2>
              {isCrossChain && (
                <div className="flex items-center gap-1 mt-1">
                  <Shuffle className="w-3 h-3 text-[#DD44B9]" />
                  <span className="text-xs text-[#DD44B9]">Cross-chain bridge enabled</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* From Chain & Token */}
            <div className="bg-[#161616] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">From</span>
                <span className="text-xs text-gray-500">Balance: --</span>
              </div>

              {/* Chain Selector */}
              <div className="mb-3">
                <select
                  value={fromChain}
                  onChange={(e) => setFromChain(Number(e.target.value))}
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#DD44B9]"
                >
                  {SUPPORTED_CHAINS.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} {chain.isTestnet ? '(Testnet)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Token & Amount */}
              <div className="flex items-center gap-3">
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DD44B9]"
                >
                  {fromChainTokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-transparent text-2xl text-white font-semibold focus:outline-none"
                  step="any"
                  min="0"
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwapTokens}
                className="p-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg hover:bg-[#2A2A2A] transition-colors"
              >
                <ArrowDown className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* To Chain & Token */}
            <div className="bg-[#161616] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">To</span>
                {quote && !isLoadingQuote && (
                  <span className="text-xs text-gray-500">
                    ≈ ${(parseFloat(quote.toAmount) * 1).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Chain Selector */}
              <div className="mb-3">
                <select
                  value={toChain}
                  onChange={(e) => setToChain(Number(e.target.value))}
                  className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#DD44B9]"
                >
                  {SUPPORTED_CHAINS.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name} {chain.isTestnet ? '(Testnet)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Token & Amount */}
              <div className="flex items-center gap-3">
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DD44B9]"
                >
                  {toChainTokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
                <div className="flex-1 text-2xl text-white font-semibold">
                  {isLoadingQuote ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
                  ) : quote ? (
                    parseFloat(quote.toAmount).toFixed(6)
                  ) : (
                    '0.0'
                  )}
                </div>
              </div>
            </div>

            {/* Quote Details */}
            {quote && !isLoadingQuote && (
              <div className="bg-[#161616] rounded-xl p-4 border border-[#2A2A2A] space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rate</span>
                  <span className="text-white">
                    1 {fromToken} ≈ {parseFloat(quote.price).toFixed(6)} {toToken}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Route</span>
                  <span className="text-white text-right">
                    {quote.protocols.length > 0 ? quote.protocols.join(' → ') : 'Li.Fi'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Est. Gas</span>
                  <span className="text-white">{quote.estimatedGas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Slippage</span>
                  <span className="text-white">{slippage}%</span>
                </div>
              </div>
            )}

            {/* Slippage Settings */}
            <div className="bg-[#161616] rounded-xl p-4 border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Max Slippage</span>
                <span className="text-sm text-white">{slippage}%</span>
              </div>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0, 3.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSlippage(val)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      slippage === val
                        ? 'bg-gradient-to-r from-[#DD44B9] to-[#00D9FF] text-white'
                        : 'bg-[#1E1E1E] text-gray-400 hover:bg-[#2A2A2A]'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && txHash && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-green-400 text-sm font-medium mb-1">
                    Swap executed successfully!
                  </p>
                  <p className="text-green-400/70 text-xs font-mono break-all">
                    {txHash}
                  </p>
                </div>
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={executeSwap}
              disabled={!quote || isExecuting || !address || isLoadingQuote || !!error}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                !quote || isExecuting || !address || isLoadingQuote || !!error
                  ? 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#DD44B9] to-[#00D9FF] text-white hover:opacity-90'
              }`}
            >
              {isExecuting ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Executing...
                </span>
              ) : !address ? (
                'Connect Wallet'
              ) : isLoadingQuote ? (
                'Getting Quote...'
              ) : error ? (
                'No Route Available'
              ) : !amount || parseFloat(amount) === 0 ? (
                'Enter Amount'
              ) : !quote ? (
                'Enter Amount'
              ) : (
                'Swap'
              )}
            </button>

            {/* Info */}
            <p className="text-center text-xs text-gray-500">
              {isCrossChain
                ? '🌉 Cross-chain swaps may take 10-30 minutes to complete'
                : '⚡ Best routes automatically selected for optimal pricing'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
