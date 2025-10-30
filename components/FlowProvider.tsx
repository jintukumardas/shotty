'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { initializeFlowFCL } from '@/lib/flow-config';

interface FlowContextType {
  network: 'testnet' | 'mainnet';
}

const FlowContext = createContext<FlowContextType>({
  network: 'testnet',
});

export function useFlowContext() {
  return useContext(FlowContext);
}

interface FlowProviderProps {
  children: ReactNode;
  network?: 'testnet' | 'mainnet';
}

/**
 * Flow Provider - Initializes Flow FCL and provides context
 *
 * Wrap your app with this provider to enable Flow wallet support:
 * - EVM wallets (MetaMask, etc.) work with Flow EVM
 * - Flow wallets (Blocto, Lilico, etc.) work via FCL
 */
export function FlowProvider({ children, network = 'testnet' }: FlowProviderProps) {
  useEffect(() => {
    // Initialize Flow FCL on mount
    initializeFlowFCL(network);
  }, [network]);

  return (
    <FlowContext.Provider value={{ network }}>
      {children}
    </FlowContext.Provider>
  );
}
