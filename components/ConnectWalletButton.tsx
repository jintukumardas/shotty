'use client';

import { useState } from 'react';
import { Wallet, Loader2, X } from 'lucide-react';
import { useFlowWallet } from '@/services/blockchain/flowWallet';
import { formatBalance } from '@/utils/formatNumber';

/**
 * Enhanced Connect Wallet Button with Flow support
 *
 * Supports both:
 * - EVM wallets (MetaMask, etc.) for Flow EVM
 * - Flow wallets (Blocto, Lilico, etc.) via FCL
 */
export function ConnectWalletButton() {
  const {
    address,
    isConnected,
    isLoading,
    balance,
    walletType,
    chainId,
    connectEVMWallet,
    connectFlowWallet,
    disconnectWallet,
  } = useFlowWallet();

  const [showModal, setShowModal] = useState(false);

  const handleDisconnect = async () => {
    await disconnectWallet();
    setShowModal(false);
  };

  if (isConnected && address) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] hover:opacity-90 rounded-xl text-black font-semibold transition-all"
        >
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="sm:hidden">Connected</span>
        </button>

        {/* Wallet Info Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1E1E1E] rounded-3xl border border-[#2A2A2A] p-8 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Wallet Info</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-[#2A2A2A]/50 rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1">Wallet Type</div>
                  <div className="text-white font-medium capitalize">{walletType} Wallet</div>
                </div>

                <div className="bg-[#2A2A2A]/50 rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1">Address</div>
                  <div className="text-white font-mono text-sm break-all">{address}</div>
                </div>

                {chainId && (
                  <div className="bg-[#2A2A2A]/50 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-1">Network</div>
                    <div className="text-white font-medium">
                      {chainId === 545 && 'Flow EVM Testnet'}
                      {chainId === 747 && 'Flow EVM Mainnet'}
                      {chainId !== 545 && chainId !== 747 && `Chain ${chainId}`}
                    </div>
                  </div>
                )}

                {balance && (
                  <div className="bg-[#2A2A2A]/50 rounded-xl p-4">
                    <div className="text-sm text-gray-400 mb-1">Balance</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] bg-clip-text text-transparent">
                      {formatBalance(balance)} FLOW
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full mt-6 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-400 font-semibold transition-all"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00EF8B] to-[#00D9FF] hover:opacity-90 disabled:opacity-50 rounded-xl text-black font-semibold transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet</span>
          </>
        )}
      </button>

      {/* Wallet Selection Modal */}
      {showModal && !isConnected && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] rounded-3xl border border-[#2A2A2A] p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* EVM Wallet Option */}
              <button
                onClick={async () => {
                  try {
                    await connectEVMWallet();
                    setShowModal(false);
                  } catch (err) {
                    console.error('Failed to connect EVM wallet:', err);
                  }
                }}
                className="w-full p-6 bg-[#2A2A2A]/50 hover:bg-[#2A2A2A] border border-[#00EF8B]/20 hover:border-[#00EF8B] rounded-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00EF8B] to-[#00D9FF] rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-black" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold group-hover:text-[#00EF8B] transition-colors">
                      EVM Wallet
                    </div>
                    <div className="text-sm text-gray-400">
                      MetaMask, Coinbase, WalletConnect
                    </div>
                  </div>
                </div>
              </button>

              {/* Flow Wallet Option */}
              <button
                onClick={async () => {
                  try {
                    await connectFlowWallet();
                    setShowModal(false);
                  } catch (err) {
                    console.error('Failed to connect Flow wallet:', err);
                  }
                }}
                className="w-full p-6 bg-[#2A2A2A]/50 hover:bg-[#2A2A2A] border border-[#00D9FF]/20 hover:border-[#00D9FF] rounded-xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00D9FF] to-[#00EF8B] rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l7.5 3.75v7.57L12 19.25 4.5 15.5V7.93L12 4.18z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold group-hover:text-[#00D9FF] transition-colors">
                      Flow Wallet
                    </div>
                    <div className="text-sm text-gray-400">
                      Blocto, Lilico, Flow Reference
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      )}
    </>
  );
}
