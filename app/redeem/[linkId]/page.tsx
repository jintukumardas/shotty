'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useWallet } from '@/services/blockchain/useWallet';
import { Gift, Loader2, CheckCircle, XCircle, AlertCircle, Network, ExternalLink, Copy } from 'lucide-react';
import { redeemTokens } from '@/services/escrow/redeemLinks';
import { switchToFlowEvmTestnet } from '@/utils/addNetwork';

export default function RedeemPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { address, isConnected, refreshBalance } = useWallet();

  const linkId = params?.linkId as string;
  const secret = searchParams?.get('secret');

  const [linkDetails, setLinkDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplorerUrl = (txHash: string) => {
    // Use Flow EVM Testnet explorer
    return `https://evm-testnet.flowscan.io/tx/${txHash}`;
  };

  // Track the actual current network from MetaMask
  useEffect(() => {
    const getCurrentChainId = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setCurrentChainId(parseInt(chainId, 16));
        } catch (error) {
          console.error('Failed to get chain ID:', error);
        }
      }
    };

    getCurrentChainId();

    // Listen for network changes
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        setCurrentChainId(parseInt(chainId, 16));
        console.log('Network changed to:', parseInt(chainId, 16));
      };

      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  useEffect(() => {
    if (linkId) {
      fetchLinkDetails();
    }
  }, [linkId]);

  const fetchLinkDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/redeem/${linkId}`);
      const data = await response.json();

      if (response.ok) {
        setLinkDetails(data);
      } else {
        setMessage(data.error || 'Failed to load link details');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error fetching link details:', error);
      setMessage('Failed to load redeem link');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      setSwitchingNetwork(true);
      setMessage('');
      await switchToFlowEvmTestnet();
      setMessage('Successfully switched to Flow EVM Testnet!');
      // Wallet context should update automatically after network switch
    } catch (error) {
      console.error('Failed to switch network:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to switch network');
    } finally {
      setSwitchingNetwork(false);
    }
  };

  const handleRedeem = async () => {
    if (!address || !secret) return;

    try {
      setRedeeming(true);
      setMessage('');

      console.log('🎁 Starting redemption...');
      console.log('Redeemer address:', address);
      console.log('Link ID:', linkId);

      // Check if user is connected to Flow EVM Testnet (chainId 545)
      if (currentChainId !== 545) {
        throw new Error(
          `Please switch to Flow EVM Testnet to redeem. Current network: ${currentChainId}. Required: 545 (Flow EVM Testnet)`
        );
      }

      // Call redeemTokens directly from client-side
      const txHash = await redeemTokens({
        redeemer: address,
        linkId,
        secret,
      });

      console.log('✅ Redemption successful, tx:', txHash);

      setStatus('success');
      setTxHash(txHash);
      setMessage(`Successfully redeemed ${linkDetails.amount} ${linkDetails.token}!`);

      // Refresh link details to show redeemed status
      await fetchLinkDetails();

      // Refresh wallet balance to show updated amount
      if (refreshBalance) {
        await refreshBalance();
        console.log('✅ Balance refreshed');
      }
    } catch (error) {
      console.error('Redemption error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to redeem tokens');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#00EF8B]/20 to-[#00D9FF]/20 rounded-full mb-4">
              <Gift className="w-8 h-8 text-[#00EF8B]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Redeem Tokens</h1>
            <p className="text-sm text-gray-400">
              Someone sent you tokens on Flow EVM!
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#00EF8B] animate-spin" />
            </div>
          )}

          {/* Link Details */}
          {!loading && linkDetails && status === 'idle' && (
            <>
              <div className="bg-[#161616] rounded-xl p-6 mb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] bg-clip-text text-transparent">
                    {linkDetails.amount} {linkDetails.token}
                  </span>
                </div>

                {linkDetails.expiresAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Expires</span>
                    <span className="text-gray-400">
                      {new Date(linkDetails.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {linkDetails.redeemed && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-yellow-400">
                      This link has already been redeemed
                    </span>
                  </div>
                )}
              </div>

              {!isConnected ? (
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                    <p className="text-sm text-yellow-400 mb-3">
                      Please connect your wallet to redeem tokens
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const { connectWallet } = useWallet();
                      connectWallet();
                    }}
                    className="w-full py-4 rounded-xl font-semibold text-lg bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] text-black hover:opacity-90 transition-all"
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : linkDetails.redeemed ? (
                <button
                  disabled
                  className="w-full py-4 rounded-xl font-semibold bg-[#2A2A2A] text-gray-500 cursor-not-allowed"
                >
                  Already Redeemed
                </button>
              ) : currentChainId !== 545 ? (
                <div className="space-y-4">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
                    <Network className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-sm text-cyan-400 mb-1 font-semibold">
                      Wrong Network
                    </p>
                    <p className="text-xs text-gray-400">
                      Please switch to Flow EVM Testnet to redeem your tokens
                    </p>
                  </div>
                  <button
                    onClick={handleSwitchNetwork}
                    disabled={switchingNetwork}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                      switchingNetwork
                        ? 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] text-white hover:opacity-90'
                    }`}
                  >
                    {switchingNetwork ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Switching Network...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Network className="w-5 h-5" />
                        Switch to Flow EVM Testnet
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRedeem}
                  disabled={redeeming || !secret}
                  className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                    redeeming || !secret
                      ? 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] text-white hover:opacity-90'
                  }`}
                >
                  {redeeming ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Redeeming...
                    </span>
                  ) : (
                    'Redeem Tokens'
                  )}
                </button>
              )}
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Success!</h3>
              <p className="text-gray-400 mb-4">{message}</p>
              {txHash && (
                <div className="bg-[#161616] rounded-lg p-4 mb-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Transaction Hash</p>
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                      <p className="text-xs font-mono text-gray-400 break-all flex-1">
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </p>
                      <button
                        onClick={() => copyToClipboard(txHash)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                        title="Copy full hash"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <a
                    href={getExplorerUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00EF8B]/10 hover:bg-[#00EF8B]/20 border border-[#00EF8B]/30 rounded-lg text-[#00EF8B] text-sm font-medium transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Flow Explorer
                  </a>
                </div>
              )}
              <a
                href="/"
                className="inline-block px-6 py-3 bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              >
                Back to Home
              </a>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && !loading && (
            <div className="text-center py-6">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
              <p className="text-red-400 mb-6">{message}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Powered by Flow EVM Blockchain
          </p>
        </div>
      </div>
    </div>
  );
}
