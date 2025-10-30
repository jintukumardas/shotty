'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { fcl } from '@/lib/flow-config';
import { getFlowEvmClient } from './client';

export interface FlowWalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  balance: string | null;
  flowEvmClient: ReturnType<typeof getFlowEvmClient> | null;
  walletType: 'evm' | 'flow' | null; // Track wallet type
  flowUser: any; // FCL user object for Flow wallets
}

/**
 * Enhanced wallet hook with Flow FCL support
 * Supports both:
 * - EVM wallets (MetaMask, etc.) for Flow EVM
 * - Flow wallets (Blocto, Lilico, etc.) via FCL
 */
export function useFlowWallet() {
  const [state, setState] = useState<FlowWalletState>({
    address: null,
    isConnected: false,
    chainId: null,
    balance: null,
    flowEvmClient: null,
    walletType: null,
    flowUser: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client
  useEffect(() => {
    const client = getFlowEvmClient();
    client.initialize();
    setState((prev) => ({ ...prev, flowEvmClient: client }));
  }, []);

  // Listen for FCL user changes (Flow wallets)
  useEffect(() => {
    const unsubscribe = fcl.currentUser.subscribe((user: any) => {
      if (user.loggedIn) {
        console.log('Flow wallet connected:', user.addr);
        setState((prev) => ({
          ...prev,
          address: user.addr,
          isConnected: true,
          walletType: 'flow',
          flowUser: user,
        }));
      } else if (state.walletType === 'flow') {
        console.log('Flow wallet disconnected');
        setState((prev) => ({
          ...prev,
          address: null,
          isConnected: false,
          walletType: null,
          flowUser: null,
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [state.walletType]);

  // Listen for EVM account changes (MetaMask, etc.)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected EVM wallet
        if (state.walletType === 'evm') {
          setState({
            address: null,
            isConnected: false,
            chainId: null,
            balance: null,
            flowEvmClient: state.flowEvmClient,
            walletType: null,
            flowUser: null,
          });
        }
      } else {
        // User switched accounts
        connectEVMWallet();
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
  }, [state.flowEvmClient, state.walletType]);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          await connectEVMWallet();
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
      }
    };

    checkConnection();
  }, []);

  /**
   * Connect EVM wallet (MetaMask, etc.) for Flow EVM
   */
  const connectEVMWallet = useCallback(async () => {
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
        walletType: 'evm',
        flowUser: null,
      });

      console.log('✅ EVM Wallet connected:', {
        address: accounts[0],
        chainId,
        balance: balanceFormatted,
      });

      return accounts[0];
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Failed to connect EVM wallet:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Connect Flow wallet via FCL (Blocto, Lilico, etc.)
   */
  const connectFlowWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Connecting Flow wallet via FCL...');

      // Authenticate with FCL
      await fcl.authenticate();

      // FCL will trigger the currentUser.subscribe effect
      // which will update the state

      console.log('✅ Flow wallet connection initiated');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect Flow wallet';
      setError(errorMessage);
      console.error('Failed to connect Flow wallet:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Smart connect - tries EVM first, falls back to Flow
   */
  const connectWallet = useCallback(async () => {
    try {
      // Try EVM wallet first (MetaMask)
      if (typeof window !== 'undefined' && window.ethereum) {
        await connectEVMWallet();
      } else {
        // No EVM wallet found, try Flow FCL
        await connectFlowWallet();
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      throw err;
    }
  }, [connectEVMWallet, connectFlowWallet]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(async () => {
    if (state.walletType === 'flow') {
      // Disconnect Flow wallet
      await fcl.unauthenticate();
    }

    setState({
      address: null,
      isConnected: false,
      chainId: null,
      balance: null,
      flowEvmClient: state.flowEvmClient,
      walletType: null,
      flowUser: null,
    });

    console.log('Wallet disconnected');
  }, [state.walletType, state.flowEvmClient]);

  /**
   * Switch to Flow EVM Testnet (EVM wallets only)
   */
  const switchToFlowEvmTestnet = useCallback(async () => {
    if (state.walletType !== 'evm') {
      console.warn('Network switching only available for EVM wallets');
      return;
    }

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
  }, [state.walletType]);

  /**
   * Switch to Flow EVM Mainnet (EVM wallets only)
   */
  const switchToFlowEvmMainnet = useCallback(async () => {
    if (state.walletType !== 'evm') {
      console.warn('Network switching only available for EVM wallets');
      return;
    }

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
  }, [state.walletType]);

  /**
   * Refresh balance
   */
  const refreshBalance = useCallback(async () => {
    if (!state.address) return;

    try {
      if (state.walletType === 'evm' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balanceWei = await provider.getBalance(state.address);
        const balanceFormatted = ethers.formatEther(balanceWei);

        setState((prev) => ({
          ...prev,
          balance: balanceFormatted,
        }));

        return balanceFormatted;
      }
      // For Flow wallets, balance fetching would use FCL
      // TODO: Implement Flow balance fetching if needed
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      throw err;
    }
  }, [state.address, state.walletType]);

  return {
    ...state,
    isLoading,
    error,
    connectWallet,
    connectEVMWallet,
    connectFlowWallet,
    disconnectWallet,
    switchToFlowEvmTestnet,
    switchToFlowEvmMainnet,
    refreshBalance,
  };
}
