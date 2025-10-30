// Utility to add Flow EVM network to user's wallet

export const FLOW_EVM_TESTNET = {
  chainId: '0x221', // 545 in hex
  chainName: 'Flow EVM Testnet',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
  blockExplorerUrls: ['https://evm-testnet.flowscan.io'],
};

export const FLOW_EVM_MAINNET = {
  chainId: '0x2eb', // 747 in hex
  chainName: 'Flow EVM Mainnet',
  nativeCurrency: {
    name: 'Flow',
    symbol: 'FLOW',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.evm.nodes.onflow.org'],
  blockExplorerUrls: ['https://evm.flowscan.io'],
};

/**
 * Add Flow EVM network to user's wallet
 */
export async function addFlowEvmNetwork(network: 'testnet' | 'mainnet' = 'testnet'): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Web3 wallet detected');
  }

  const networkConfig = network === 'testnet' ? FLOW_EVM_TESTNET : FLOW_EVM_MAINNET;

  try {
    // Try to switch to the network first
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: networkConfig.chainId }],
    });

    console.log(`✅ Switched to Flow EVM ${network}`);
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });

        console.log(`✅ Flow EVM ${network} network added`);
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        throw new Error(`Failed to add Flow EVM ${network} network`);
      }
    } else {
      console.error('Failed to switch network:', switchError);
      throw new Error(`Failed to switch to Flow EVM ${network} network`);
    }
  }
}

/**
 * Switch to Flow EVM Testnet
 */
export async function switchToFlowEvmTestnet(): Promise<boolean> {
  return addFlowEvmNetwork('testnet');
}

/**
 * Switch to Flow EVM Mainnet
 */
export async function switchToFlowEvmMainnet(): Promise<boolean> {
  return addFlowEvmNetwork('mainnet');
}

/**
 * Legacy function name for backwards compatibility
 */
export async function switchToPushChain(): Promise<boolean> {
  console.warn('switchToPushChain is deprecated, use switchToFlowEvmTestnet instead');
  return switchToFlowEvmTestnet();
}
