'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getFlowEvmClient } from './client';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string | null;
  flowEvmClient: ReturnType<typeof getFlowEvmClient> | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    balance: null,
    flowEvmClient: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  useEffect(() => {
    const client = getFlowEvmClient();
    client.initialize();
    setState((prev) => ({ ...prev, flowEvmClient: client }));
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        setState({
          address: null,
          isConnected: false,
          chainId: null,
          balance: null,
          flowEvmClient: state.flowEvmClient,
        });
      } else {
        // User switched accounts
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      // Reload the page when chain changes (recommended by MetaMask)
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [state.flowEvmClient]);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    };

    checkConnection();
  }, []);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Connect to Flow EVM client
      const client = getFlowEvmClient();
      await client.connectWallet(window.ethereum);

      // Get balance
      const balanceWei = await provider.getBalance(accounts[0]);
      const balanceFormatted = ethers.formatEther(balanceWei);

      setState({
        address: accounts[0],
        isConnected: true,
        chainId,
        balance: balanceFormatted,
        flowEvmClient: client,
      });

      console.log('✅ Wallet connected:', {
        address: accounts[0],
        chainId,
        balance: balanceFormatted,
      });

      return accounts[0];
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Failed to connect wallet:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      chainId: null,
      balance: null,
      flowEvmClient: state.flowEvmClient,
    });
    console.log('Wallet disconnected');
  }, [state.flowEvmClient]);

  const switchToFlowEvmTestnet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Please install MetaMask or another Web3 wallet');
    }

    try {
      // Try to switch to Flow EVM Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x221' }], // 545 in hex
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x221', // 545 in hex
                chainName: 'Flow EVM Testnet',
                nativeCurrency: {
                  name: 'Flow',
                  symbol: 'FLOW',
                  decimals: 18,
                },
                rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
                blockExplorerUrls: ['https://evm-testnet.flowscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add Flow EVM Testnet:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  const switchToFlowEvmMainnet = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Please install MetaMask or another Web3 wallet');
    }

    try {
      // Try to switch to Flow EVM Mainnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2eb' }], // 747 in hex
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x2eb', // 747 in hex
                chainName: 'Flow EVM Mainnet',
                nativeCurrency: {
                  name: 'Flow',
                  symbol: 'FLOW',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.evm.nodes.onflow.org'],
                blockExplorerUrls: ['https://evm.flowscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add Flow EVM Mainnet:', addError);
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.address) return;

    try {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balanceWei = await provider.getBalance(state.address);
      const balanceFormatted = ethers.formatEther(balanceWei);

      setState((prev) => ({
        ...prev,
        balance: balanceFormatted,
      }));

      return balanceFormatted;
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      throw err;
    }
  }, [state.address]);

  return {
    ...state,
    isLoading,
    error,
    connectWallet,
    disconnectWallet,
    switchToFlowEvmTestnet,
    switchToFlowEvmMainnet,
    refreshBalance,
  };
}
