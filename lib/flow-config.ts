// Flow Client Library (FCL) Configuration
import * as fcl from '@onflow/fcl';

// Flow EVM Testnet Configuration
export const FLOW_EVM_TESTNET_CONFIG = {
  chainId: 545,
  chainName: 'Flow EVM Testnet',
  rpcUrl: 'https://testnet.evm.nodes.onflow.org',
  explorerUrl: 'https://evm-testnet.flowscan.io',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
};

// Flow EVM Mainnet Configuration
export const FLOW_EVM_MAINNET_CONFIG = {
  chainId: 747,
  chainName: 'Flow EVM Mainnet',
  rpcUrl: 'https://mainnet.evm.nodes.onflow.org',
  explorerUrl: 'https://evm.flowscan.io',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
};

/**
 * Initialize Flow Client Library with testnet configuration
 */
export function initializeFlowFCL(network: 'testnet' | 'mainnet' = 'testnet') {
  const isTestnet = network === 'testnet';

  fcl.config({
    // Wallet Discovery - allows users to connect various Flow wallets
    'discovery.wallet': isTestnet
      ? 'https://fcl-discovery.onflow.org/testnet/authn'
      : 'https://fcl-discovery.onflow.org/authn',

    // Flow Access Node - for reading blockchain data
    'accessNode.api': isTestnet
      ? 'https://rest-testnet.onflow.org'
      : 'https://rest-mainnet.onflow.org',

    // Network selection
    'flow.network': network,

    // App metadata (displayed in wallet)
    'app.detail.title': 'Shotty AI Butler',
    'app.detail.icon': 'https://shotty.ai/icon.png',
    'app.detail.description': 'AI-powered blockchain transactions on Flow EVM',
  });

  console.log(`✅ Flow FCL initialized for ${network}`);
}

/**
 * Get current Flow network configuration
 */
export function getFlowNetworkConfig(network: 'testnet' | 'mainnet' = 'testnet') {
  return network === 'testnet' ? FLOW_EVM_TESTNET_CONFIG : FLOW_EVM_MAINNET_CONFIG;
}

// Initialize FCL on module load
if (typeof window !== 'undefined') {
  // Default to testnet
  const network = (process.env.NEXT_PUBLIC_FLOW_NETWORK as 'testnet' | 'mainnet') || 'testnet';
  initializeFlowFCL(network);
}

export { fcl };
