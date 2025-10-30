// Supported Chains Configuration for Li.Fi Integration

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  symbol: string;
  decimals: number;
  rpcUrl: string;
  blockExplorerUrl: string;
  logo?: string;
  isTestnet?: boolean;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 545,
    name: 'Flow EVM Testnet',
    shortName: 'Flow Testnet',
    symbol: 'FLOW',
    decimals: 18,
    rpcUrl: 'https://testnet.evm.nodes.onflow.org',
    blockExplorerUrl: 'https://evm-testnet.flowscan.io',
    isTestnet: true,
  },
  {
    id: 747,
    name: 'Flow EVM Mainnet',
    shortName: 'Flow Mainnet',
    symbol: 'FLOW',
    decimals: 18,
    rpcUrl: 'https://mainnet.evm.nodes.onflow.org',
    blockExplorerUrl: 'https://evm.flowscan.io',
    isTestnet: false,
  },
  {
    id: 1,
    name: 'Ethereum',
    shortName: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorerUrl: 'https://etherscan.io',
  },
  {
    id: 137,
    name: 'Polygon',
    shortName: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorerUrl: 'https://polygonscan.com',
  },
  {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorerUrl: 'https://arbiscan.io',
  },
  {
    id: 10,
    name: 'Optimism',
    shortName: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorerUrl: 'https://optimistic.etherscan.io',
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'Base',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://mainnet.base.org',
    blockExplorerUrl: 'https://basescan.org',
  },
  {
    id: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorerUrl: 'https://snowtrace.io',
  },
  {
    id: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    symbol: 'BNB',
    decimals: 18,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorerUrl: 'https://bscscan.com',
  },
  {
    id: 250,
    name: 'Fantom Opera',
    shortName: 'Fantom',
    symbol: 'FTM',
    decimals: 18,
    rpcUrl: 'https://rpc.ftm.tools',
    blockExplorerUrl: 'https://ftmscan.com',
  },
  {
    id: 100,
    name: 'Gnosis',
    shortName: 'Gnosis',
    symbol: 'xDAI',
    decimals: 18,
    rpcUrl: 'https://rpc.gnosischain.com',
    blockExplorerUrl: 'https://gnosisscan.io',
  },
];

// Default chain - Flow EVM Testnet
export const DEFAULT_CHAIN_ID = 545;

// Get chain by ID
export function getChainById(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId);
}

// Get chain name
export function getChainName(chainId: number): string {
  return getChainById(chainId)?.name || `Chain ${chainId}`;
}

// Get chain symbol
export function getChainSymbol(chainId: number): string {
  return getChainById(chainId)?.symbol || 'ETH';
}

// Check if chain is supported
export function isChainSupported(chainId: number): boolean {
  return SUPPORTED_CHAINS.some((chain) => chain.id === chainId);
}

// Get mainnet chains only
export function getMainnetChains(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter((chain) => !chain.isTestnet);
}

// Get testnet chains only
export function getTestnetChains(): ChainConfig[] {
  return SUPPORTED_CHAINS.filter((chain) => chain.isTestnet);
}
