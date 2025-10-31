'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, TrendingUp, Clock, AlertCircle, Network } from 'lucide-react';
import { getLiFiService, getChainId } from '@/services/lifi/lifiService';
import type { LiFiQuote, LiFiChain, LiFiToken } from '@/services/lifi/lifiService';
import { ethers } from 'ethers';
import { useWallet } from '@/services/blockchain/useWallet';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwap: (swapData: {
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    amount: string;
    quote: LiFiQuote;
  }) => Promise<void>;
  userAddress: string;
}

export default function SwapModal({ isOpen, onClose, onSwap, userAddress }: SwapModalProps) {
  const { chainId, switchToFlowEvmMainnet } = useWallet();
  const [fromChain, setFromChain] = useState('');
  const [toChain, setToChain] = useState('');
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [amount, setAmount] = useState('');

  const [chains, setChains] = useState<LiFiChain[]>([]);
  const [fromTokens, setFromTokens] = useState<LiFiToken[]>([]);
  const [toTokens, setToTokens] = useState<LiFiToken[]>([]);

  const [quote, setQuote] = useState<LiFiQuote | null>(null);
  const [isLoadingChains, setIsLoadingChains] = useState(false);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is on Flow Mainnet (747)
  const isOnFlowMainnet = chainId === 747;

  // Load supported chains on mount
  useEffect(() => {
    if (isOpen) {
      loadChains();
    }
  }, [isOpen]);

  // Load tokens when chains change
  useEffect(() => {
    if (fromChain && chains.length > 0) {
      loadTokens(fromChain, 'from');
    }
  }, [fromChain, chains]);

  useEffect(() => {
    if (toChain && chains.length > 0) {
      loadTokens(toChain, 'to');
    }
  }, [toChain, chains]);

  const loadChains = async () => {
    setIsLoadingChains(true);
    setError(null);
    try {
      const lifiService = getLiFiService();
      const chainsData = await lifiService.getChains();
      // Filter for mainnet chains only
      const mainnetChains = chainsData.filter(chain => chain.mainnet);
      setChains(mainnetChains);

      // Set Flow EVM Mainnet (747) as default
      const flowChain = mainnetChains.find(chain => chain.id === 747);

      if (flowChain) {
        console.log('✅ Found Flow EVM Mainnet in supported chains:', flowChain);
        setFromChain(flowChain.key);
        // For toChain, try to find Ethereum or another popular chain
        const ethChain = mainnetChains.find(chain => chain.id === 1);
        if (ethChain) {
          setToChain(ethChain.key);
        } else if (mainnetChains.length > 1) {
          setToChain(mainnetChains[1].key);
        }
      } else {
        console.warn('⚠️ Flow EVM Mainnet (747) not found in supported chains');
        console.log('Available chains:', mainnetChains.map(c => ({ id: c.id, name: c.name, key: c.key })));

        // Try to find any Flow-related chain
        const anyFlowChain = mainnetChains.find(chain =>
          chain.name.toLowerCase().includes('flow') ||
          chain.key.toLowerCase().includes('flow')
        );

        if (anyFlowChain) {
          console.log('Found alternative Flow chain:', anyFlowChain);
          setFromChain(anyFlowChain.key);
        } else {
          // Fallback to Ethereum or first available chain
          const ethChain = mainnetChains.find(chain => chain.id === 1);
          if (ethChain) {
            setFromChain(ethChain.key);
          } else if (mainnetChains.length > 0) {
            setFromChain(mainnetChains[0].key);
          }
        }

        // Set toChain
        if (mainnetChains.length > 1) {
          setToChain(mainnetChains[1].key);
        }
      }
    } catch (err) {
      console.error('Error loading chains:', err);
      setError('Failed to load chains. Please try again.');
    } finally {
      setIsLoadingChains(false);
    }
  };

  const loadTokens = async (chainKey: string, type: 'from' | 'to') => {
    try {
      const lifiService = getLiFiService();

      // Find the chain object to get the actual chain ID
      const chain = chains.find(c => c.key === chainKey);
      if (!chain) {
        console.error('Chain not found for key:', chainKey);
        return;
      }

      const tokens = await lifiService.getTokens(chain.id);

      // Filter tokens with prices
      const tokensWithPrices = tokens.filter(token => token.priceUSD && parseFloat(token.priceUSD) > 0);

      // Prioritize native token (FLOW, ETH, MATIC, etc.) and popular tokens
      const sortedTokens = tokensWithPrices.sort((a, b) => {
        // Check if token is native (address is zero address or native token symbol)
        const isANative = a.address === '0x0000000000000000000000000000000000000000' ||
                          a.symbol.toLowerCase() === 'flow' ||
                          a.symbol.toLowerCase() === 'eth' ||
                          a.symbol.toLowerCase() === 'matic' ||
                          a.symbol.toLowerCase() === 'bnb' ||
                          a.symbol.toLowerCase() === 'avax';
        const isBNative = b.address === '0x0000000000000000000000000000000000000000' ||
                          b.symbol.toLowerCase() === 'flow' ||
                          b.symbol.toLowerCase() === 'eth' ||
                          b.symbol.toLowerCase() === 'matic' ||
                          b.symbol.toLowerCase() === 'bnb' ||
                          b.symbol.toLowerCase() === 'avax';

        if (isANative && !isBNative) return -1;
        if (!isANative && isBNative) return 1;

        // Sort by price USD descending (higher market cap tokens first)
        return parseFloat(b.priceUSD || '0') - parseFloat(a.priceUSD || '0');
      });

      const popularTokens = sortedTokens.slice(0, 20);

      if (type === 'from') {
        setFromTokens(popularTokens);
        // Try to find FLOW token first, otherwise use first token
        const flowToken = popularTokens.find(t =>
          t.symbol.toLowerCase() === 'flow' ||
          t.address === '0x0000000000000000000000000000000000000000'
        );
        if (flowToken) {
          setFromToken(flowToken.address);
        } else if (popularTokens.length > 0) {
          setFromToken(popularTokens[0].address);
        }
      } else {
        setToTokens(popularTokens);
        // Try to find FLOW token first, otherwise use first token
        const flowToken = popularTokens.find(t =>
          t.symbol.toLowerCase() === 'flow' ||
          t.address === '0x0000000000000000000000000000000000000000'
        );
        if (flowToken) {
          setToToken(flowToken.address);
        } else if (popularTokens.length > 0) {
          setToToken(popularTokens[0].address);
        }
      }
    } catch (err) {
      console.error(`Error loading ${type} tokens:`, err);
    }
  };

  const handleGetQuote = async () => {
    if (!fromChain || !toChain || !fromToken || !toToken || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsLoadingQuote(true);
    setError(null);
    setQuote(null);

    try {
      const lifiService = getLiFiService();

      // Find the chain objects to get the actual chain IDs
      const fromChainObj = chains.find(c => c.key === fromChain);
      const toChainObj = chains.find(c => c.key === toChain);

      if (!fromChainObj || !toChainObj) {
        throw new Error('Invalid chain selection');
      }

      // Find token decimals
      const fromTokenData = fromTokens.find(t => t.address === fromToken);
      const decimals = fromTokenData?.decimals || 18;

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, decimals).toString();

      const quoteData = await lifiService.getQuote({
        fromChain: fromChainObj.id.toString(),
        toChain: toChainObj.id.toString(),
        fromToken,
        toToken,
        fromAmount: amountWei,
        fromAddress: userAddress,
      });

      setQuote(quoteData);
    } catch (err: any) {
      console.error('Error getting quote:', err);

      // Parse LiFi error messages
      let errorMessage = 'Failed to get quote. Please check your inputs and try again.';

      if (err.response?.data) {
        const data = err.response.data;

        // Check for no available quotes
        if (data.code === 1002 || data.message?.includes('No available quotes')) {
          errorMessage = '⚠️ **No Routes Available**\n\n';

          // Check for amount too high errors
          const amountTooHighErrors = data.errors?.failed?.some((f: any) =>
            f.subpaths && Object.values(f.subpaths).some((sp: any) =>
              sp.some((e: any) => e.code === 'AMOUNT_TOO_HIGH')
            )
          );

          if (amountTooHighErrors) {
            errorMessage += 'The amount is too large for available bridges. Try a smaller amount (e.g., 1-10 tokens).';
          } else if (data.errors?.filteredOut?.length > 0) {
            const reasons = data.errors.filteredOut.map((f: any) => f.reason).join('\n• ');
            errorMessage += `Routes filtered out:\n• ${reasons}`;
          } else {
            errorMessage += data.message || 'No bridge routes available for this transfer.';
          }

          errorMessage += '\n\n💡 **Suggestions:**\n• Try a smaller amount\n• Select different tokens\n• Check if both networks support the token';
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quote) {
      setError('Please get a quote first');
      return;
    }

    setIsSwapping(true);
    setError(null);

    try {
      // Get chain names for display
      const fromChainObj = chains.find(c => c.key === fromChain);
      const toChainObj = chains.find(c => c.key === toChain);

      await onSwap({
        fromChain: fromChainObj?.name || fromChain,
        toChain: toChainObj?.name || toChain,
        fromToken: fromTokenData?.symbol || fromToken,
        toToken: toTokenData?.symbol || toToken,
        amount,
        quote,
      });

      // Reset form
      handleClose();
    } catch (error) {
      console.error('Error executing swap:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute swap');
    } finally {
      setIsSwapping(false);
    }
  };

  const handleClose = () => {
    if (!isSwapping) {
      setFromChain('');
      setToChain('');
      setFromToken('');
      setToToken('');
      setAmount('');
      setQuote(null);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const fromTokenData = fromTokens.find(t => t.address === fromToken);
  const toTokenData = toTokens.find(t => t.address === toToken);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-[#1A1A1A] border-b border-[#2A2A2A] px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Cross-Chain Bridge</h2>
            <p className="text-xs text-gray-400 mt-1">Bridge tokens across blockchains</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSwapping}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit} className="p-3 space-y-3">
          {/* Mainnet Warning */}
          {!isOnFlowMainnet && (
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <Network className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-400 mb-1">
                  Mainnet Required for DeFi Services
                </p>
                <p className="text-sm text-yellow-300/80 mb-3">
                  Cross-chain bridging is only available on Flow EVM Mainnet. Please switch to Flow Mainnet (Chain ID: 747) to use DeFi services.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsSwitchingNetwork(true);
                      setError(null);
                      await switchToFlowEvmMainnet();
                    } catch (err) {
                      console.error('Failed to switch network:', err);
                      setError(err instanceof Error ? err.message : 'Failed to switch network');
                    } finally {
                      setIsSwitchingNetwork(false);
                    }
                  }}
                  disabled={isSwitchingNetwork}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSwitchingNetwork ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    'Switch to Flow Mainnet'
                  )}
                </button>
              </div>
            </div>
          )}

          {isLoadingChains ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#DD44B9]" />
            </div>
          ) : !isOnFlowMainnet ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-400 text-center">
                Please switch to Flow Mainnet to continue
              </p>
            </div>
          ) : (
            <>
              {/* From Section */}
              <div className="space-y-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400 font-medium">From</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* From Chain */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Network</label>
                    <select
                      value={fromChain}
                      onChange={(e) => setFromChain(e.target.value)}
                      disabled={isSwapping}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
                    >
                      {chains.map((chain) => (
                        <option key={chain.id} value={chain.key}>
                          {chain.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* From Token */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Token</label>
                    <select
                      value={fromToken}
                      onChange={(e) => setFromToken(e.target.value)}
                      disabled={isSwapping || fromTokens.length === 0}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
                    >
                      {fromTokens.map((token) => (
                        <option key={token.address} value={token.address}>
                          {token.symbol} - ${parseFloat(token.priceUSD || '0').toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Amount</label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isSwapping}
                    placeholder="0.0"
                    className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
                  />
                  {fromTokenData && amount && (
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ ${(parseFloat(amount) * parseFloat(fromTokenData.priceUSD || '0')).toFixed(2)} USD
                    </p>
                  )}
                  <p className="text-xs text-yellow-400/60 mt-2">
                    💡 Tip: Start with smaller amounts (1-10 tokens) for better bridge availability
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="bg-[#DD44B9] rounded-full p-2">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* To Section */}
              <div className="space-y-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div className="text-sm text-gray-400 font-medium">To</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* To Chain */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Network</label>
                    <select
                      value={toChain}
                      onChange={(e) => setToChain(e.target.value)}
                      disabled={isSwapping}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
                    >
                      {chains.map((chain) => (
                        <option key={chain.id} value={chain.key}>
                          {chain.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Token */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Token</label>
                    <select
                      value={toToken}
                      onChange={(e) => setToToken(e.target.value)}
                      disabled={isSwapping || toTokens.length === 0}
                      className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DD44B9] transition-colors disabled:opacity-50"
                    >
                      {toTokens.map((token) => (
                        <option key={token.address} value={token.address}>
                          {token.symbol} - ${parseFloat(token.priceUSD || '0').toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Get Quote Button */}
              {!quote && (
                <button
                  type="button"
                  onClick={handleGetQuote}
                  disabled={isLoadingQuote || !fromChain || !toChain || !fromToken || !toToken || !amount || !isOnFlowMainnet}
                  className="w-full px-6 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoadingQuote ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Getting Quote...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      Get Quote
                    </>
                  )}
                </button>
              )}

              {/* Quote Display */}
              {quote && (
                <div className="space-y-2 p-3 bg-gradient-to-r from-[#DD44B9]/10 to-[#00D9FF]/10 border border-[#DD44B9]/30 rounded-lg">
                  <div className="flex items-center gap-2 text-[#DD44B9] font-semibold">
                    <TrendingUp className="w-5 h-5" />
                    <span>Quote Summary</span>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">You'll receive</span>
                      <span className="text-white font-medium">
                        ~{ethers.formatUnits(quote.estimate.toAmount, toTokenData?.decimals || 18)} {toTokenData?.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Minimum received</span>
                      <span className="text-white">
                        {ethers.formatUnits(quote.estimate.toAmountMin, toTokenData?.decimals || 18)} {toTokenData?.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bridge</span>
                      <span className="text-white">{quote.tool}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Est. time</span>
                      <span className="text-white flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        ~{Math.ceil(quote.estimate.executionDuration / 60)} min
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
          </form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-[#2A2A2A] px-4 py-3 bg-[#1A1A1A]">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSwapping}
              className="flex-1 px-6 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSwapping || !quote || isLoadingChains || !isOnFlowMainnet}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#DD44B9] to-[#00D9FF] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSwapping ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Bridging...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  Execute Bridge
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
