'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface RateLimitIndicatorProps {
  address: string;
}

interface RateLimitData {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
}

export default function RateLimitIndicator({ address }: RateLimitIndicatorProps) {
  const [rateLimit, setRateLimit] = useState<RateLimitData | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!address) return;

    const fetchRateLimit = async () => {
      try {
        const response = await fetch(`/api/strategies/rate-limit?address=${address}`);
        const data = await response.json();

        if (data.success) {
          setRateLimit({
            used: data.used,
            limit: data.limit,
            remaining: data.remaining,
            resetAt: data.resetAt,
          });
        }
      } catch (error) {
        console.error('Failed to fetch rate limit:', error);
      }
    };

    fetchRateLimit();

    // Refresh every 10 seconds
    const interval = setInterval(fetchRateLimit, 10000);

    return () => clearInterval(interval);
  }, [address]);

  useEffect(() => {
    if (!rateLimit) return;

    const updateTimeUntilReset = () => {
      const now = Date.now();
      const diff = rateLimit.resetAt - now;

      if (diff <= 0) {
        setTimeUntilReset('Resetting...');
        return;
      }

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      setTimeUntilReset(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
    };

    updateTimeUntilReset();
    const interval = setInterval(updateTimeUntilReset, 1000);

    return () => clearInterval(interval);
  }, [rateLimit]);

  const handleReset = async () => {
    if (isResetting) return;

    setIsResetting(true);

    try {
      const response = await fetch('/api/strategies/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        // Refresh rate limit data
        const rateLimitResponse = await fetch(`/api/strategies/rate-limit?address=${address}`);
        const data = await rateLimitResponse.json();

        if (data.success) {
          setRateLimit({
            used: data.used,
            limit: data.limit,
            remaining: data.remaining,
            resetAt: data.resetAt,
          });
        }
      }
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    } finally {
      setIsResetting(false);
    }
  };

  if (!rateLimit) return null;

  const percentage = (rateLimit.used / rateLimit.limit) * 100;
  const isLow = rateLimit.remaining < 10;
  const isCritical = rateLimit.remaining < 5;

  return (
    <div className="bg-[#1E1E1E]/80 backdrop-blur-xl rounded-lg border border-[#2A2A2A]/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-white">API Calls</div>
          {isCritical && <AlertCircle className="w-4 h-4 text-red-400" />}
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting || rateLimit.used === 0}
          className="p-1.5 hover:bg-[#2A2A2A] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reset rate limit"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isResetting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        {/* Progress Bar */}
        <div className="h-2 bg-[#161616] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCritical
                ? 'bg-red-500'
                : isLow
                ? 'bg-yellow-500'
                : 'bg-gradient-to-r from-[#DD44B9] to-[#00D9FF]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {rateLimit.used} / {rateLimit.limit} used
          </span>
          <span className={`font-medium ${isCritical ? 'text-red-400' : 'text-gray-400'}`}>
            {rateLimit.remaining} remaining
          </span>
        </div>

        {/* Reset Timer */}
        <div className="text-center pt-1">
          <span className="text-xs text-gray-500">
            Resets in <span className="text-white font-mono">{timeUntilReset}</span>
          </span>
        </div>

        {/* Warning Message */}
        {isCritical && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
            Low API calls remaining. Consider waiting before making more requests.
          </div>
        )}
      </div>
    </div>
  );
}
