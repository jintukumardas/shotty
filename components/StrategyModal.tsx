'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, Loader2, Check, AlertCircle } from 'lucide-react';
import { useWallet } from '@/services/blockchain/useWallet';

interface StrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (strategy: any) => void;
}

interface SuggestedStrategy {
  name: string;
  type: string;
  description: string;
  tokens: string[];
  riskLevel: string;
  expectedAPY: string;
  parameters: any;
  reason: string;
}

export default function StrategyModal({ isOpen, onClose, onSuccess }: StrategyModalProps) {
  const { address } = useWallet();
  const [step, setStep] = useState<'suggestions' | 'configure' | 'confirm'>('suggestions');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<SuggestedStrategy | null>(null);
  const [config, setConfig] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && step === 'suggestions') {
      loadSuggestions();
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/strategies/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          portfolio: null,
          marketConditions: 'Normal',
          riskProfile: 'Medium',
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(`Rate limit exceeded. Try again at ${new Date(data.resetAt).toLocaleTimeString()}`);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load strategy suggestions');
      }

      const data = await response.json();

      if (data.success && data.strategies) {
        setSuggestions(data.strategies);
      } else {
        setError('No strategies available');
      }
    } catch (err) {
      console.error('Failed to load suggestions:', err);
      setError('Failed to load strategy suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStrategy = (strategy: SuggestedStrategy) => {
    setSelectedStrategy(strategy);
    setConfig(strategy.parameters || {});
    setStep('configure');
  };

  const handleCreateStrategy = async () => {
    if (!selectedStrategy) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/strategies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          strategy: {
            name: selectedStrategy.name,
            type: selectedStrategy.type,
            config,
          },
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(`Rate limit exceeded. Try again at ${new Date(data.resetAt).toLocaleTimeString()}`);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to create strategy');
      }

      const data = await response.json();

      if (data.success) {
        onSuccess?.(data.strategy);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create strategy:', err);
      setError('Failed to create strategy');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-[#DD44B9]/20 to-[#FC519F]/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#DD44B9]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Trading Strategy</h2>
              <p className="text-sm text-gray-500">AI-powered strategy recommendations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-red-400 font-medium">Error</div>
                <div className="text-red-400/80 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Step 1: Suggestions */}
          {step === 'suggestions' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#DD44B9] animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Recommended Strategies</h3>
                    <button
                      type="button"
                      onClick={loadSuggestions}
                      className="px-3 py-1.5 text-sm bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-gray-300 transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      New Suggestions
                    </button>
                  </div>

                  {suggestions.map((strategy, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => handleSelectStrategy(strategy)}
                      className="w-full text-left p-4 bg-[#161616]/50 hover:bg-[#161616] border border-[#2A2A2A]/50 hover:border-[#DD44B9]/50 rounded-xl transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-white font-semibold mb-1">{strategy.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-[#DD44B9]/20 text-[#DD44B9] text-xs rounded-full">
                              {strategy.type}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                strategy.riskLevel === 'Low'
                                  ? 'bg-green-500/20 text-green-400'
                                  : strategy.riskLevel === 'High'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {strategy.riskLevel} Risk
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-semibold">{strategy.expectedAPY}</div>
                          <div className="text-xs text-gray-500">Expected APY</div>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-3">{strategy.description}</p>

                      {strategy.tokens && strategy.tokens.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500">Tokens:</span>
                          <div className="flex gap-1">
                            {strategy.tokens.map((token, i) => (
                              <span key={i} className="px-2 py-0.5 bg-[#2A2A2A] text-gray-300 text-xs rounded">
                                {token}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 italic">{strategy.reason}</div>

                      <div className="mt-3 text-[#DD44B9] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Select Strategy
                        <Check className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && selectedStrategy && (
            <div className="space-y-6">
              <div className="bg-[#161616]/50 rounded-xl p-4 border border-[#2A2A2A]/50">
                <div className="text-white font-semibold mb-1">{selectedStrategy.name}</div>
                <div className="text-gray-400 text-sm">{selectedStrategy.description}</div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Configure Parameters</h3>

                {selectedStrategy.type === 'DCA' && (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Amount per Trade</label>
                      <input
                        type="number"
                        value={config.amount || ''}
                        onChange={(e) => setConfig({ ...config, amount: e.target.value })}
                        placeholder="e.g., 100"
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Frequency</label>
                      <select
                        value={config.frequency || 'daily'}
                        onChange={(e) => setConfig({ ...config, frequency: e.target.value })}
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      >
                        <option value="hourly">Every Hour</option>
                        <option value="daily">Every Day</option>
                        <option value="weekly">Every Week</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Token to Buy</label>
                      <input
                        type="text"
                        value={config.targetToken || ''}
                        onChange={(e) => setConfig({ ...config, targetToken: e.target.value })}
                        placeholder="e.g., ETH, BTC"
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedStrategy.type === 'GRID' && (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Upper Price Limit</label>
                      <input
                        type="number"
                        value={config.upperPrice || ''}
                        onChange={(e) => setConfig({ ...config, upperPrice: e.target.value })}
                        placeholder="e.g., 2000"
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Lower Price Limit</label>
                      <input
                        type="number"
                        value={config.lowerPrice || ''}
                        onChange={(e) => setConfig({ ...config, lowerPrice: e.target.value })}
                        placeholder="e.g., 1500"
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Grid Levels</label>
                      <input
                        type="number"
                        value={config.gridLevels || ''}
                        onChange={(e) => setConfig({ ...config, gridLevels: e.target.value })}
                        placeholder="e.g., 10"
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedStrategy.type === 'MOMENTUM' && (
                  <>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Momentum Threshold (%)</label>
                      <input
                        type="number"
                        value={config.threshold || ''}
                        onChange={(e) => setConfig({ ...config, threshold: e.target.value })}
                        placeholder="e.g., 5"
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Lookback Period</label>
                      <select
                        value={config.period || '24h'}
                        onChange={(e) => setConfig({ ...config, period: e.target.value })}
                        className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                      >
                        <option value="1h">1 Hour</option>
                        <option value="4h">4 Hours</option>
                        <option value="24h">24 Hours</option>
                        <option value="7d">7 Days</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Initial Investment</label>
                  <input
                    type="number"
                    value={config.initialAmount || ''}
                    onChange={(e) => setConfig({ ...config, initialAmount: e.target.value })}
                    placeholder="e.g., 1000"
                    className="w-full px-4 py-3 bg-[#161616] border border-[#2A2A2A] rounded-lg text-white focus:border-[#DD44B9] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('suggestions')}
                  className="flex-1 px-4 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateStrategy}
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#DD44B9] to-[#FC519F] hover:opacity-90 rounded-lg text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Strategy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
