'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState, useEffect } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

// Define Flow EVM chains
const flowEvmTestnet = {
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow EVM Testnet Explorer',
      url: 'https://evm-testnet.flowscan.io',
    },
  },
  testnet: true,
} as const;

const flowEvmMainnet = {
  id: 747,
  name: 'Flow EVM Mainnet',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://mainnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow EVM Mainnet Explorer',
      url: 'https://evm.flowscan.io',
    },
  },
  testnet: false,
} as const;

// Create wagmi config with RainbowKit
const config = getDefaultConfig({
  appName: 'Shotty - AI Butler for Flow Network',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID', // Get from WalletConnect Cloud
  chains: [flowEvmTestnet, flowEvmMainnet, mainnet, sepolia],
  ssr: false, // Disable SSR to avoid indexedDB errors - handled manually in component
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchInterval: 60 * 1000, // 1 minute
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  // Get Flow network from environment (defaults to testnet)
  const network = (process.env.NEXT_PUBLIC_FLOW_NETWORK as 'testnet' | 'mainnet') || 'testnet';

  // Only render wallet providers on client side to avoid indexedDB SSR errors
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render children without wallet context during SSR
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={flowEvmTestnet}
          showRecentTransactions={true}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
