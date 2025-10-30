// LiFi API Integration Service
// Cross-chain bridging and swapping

import axios from 'axios';

const LIFI_API_BASE = 'https://li.quest/v1';

export interface LiFiQuoteParams {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
}

export interface LiFiQuote {
  id: string;
  type: string;
  tool: string;
  action: any;
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: any[];
    gasCosts: any[];
  };
  includedSteps: any[];
  transactionRequest?: any;
}

export interface LiFiChain {
  id: number;
  key: string;
  name: string;
  coin: string;
  mainnet: boolean;
  logoURI?: string;
  tokenlistUrl?: string;
  multicallAddress?: string;
  metamask: {
    chainId: string;
    blockExplorerUrls: string[];
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
  };
}

export interface LiFiToken {
  address: string;
  symbol: string;
  decimals: number;
  chainId: number;
  name: string;
  priceUSD?: string;
  logoURI?: string;
}

class LiFiService {
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.LIFI_API_KEY;
  }

  /**
   * Get all supported chains
   */
  async getChains(): Promise<LiFiChain[]> {
    try {
      const response = await axios.get(`${LIFI_API_BASE}/chains`, {
        headers: this.getHeaders(),
      });

      return response.data.chains || [];
    } catch (error) {
      console.error('LiFi getChains error:', error);
      throw new Error('Failed to fetch chains from LiFi');
    }
  }

  /**
   * Get tokens for a specific chain
   */
  async getTokens(chainId: number): Promise<LiFiToken[]> {
    try {
      const response = await axios.get(`${LIFI_API_BASE}/tokens`, {
        params: { chains: chainId },
        headers: this.getHeaders(),
      });

      return response.data.tokens?.[chainId] || [];
    } catch (error) {
      console.error('LiFi getTokens error:', error);
      throw new Error('Failed to fetch tokens from LiFi');
    }
  }

  /**
   * Get a quote for a cross-chain swap/bridge
   */
  async getQuote(params: LiFiQuoteParams): Promise<LiFiQuote> {
    try {
      const response = await axios.get(`${LIFI_API_BASE}/quote`, {
        params: {
          fromChain: params.fromChain,
          toChain: params.toChain,
          fromToken: params.fromToken,
          toToken: params.toToken,
          fromAmount: params.fromAmount,
          fromAddress: params.fromAddress,
          integrator: 'shotty-trading-butler',
        },
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('LiFi getQuote error:', error);
      throw new Error('Failed to get quote from LiFi');
    }
  }

  /**
   * Get multiple routes for a swap/bridge
   */
  async getRoutes(params: LiFiQuoteParams): Promise<{ routes: LiFiQuote[] }> {
    try {
      const response = await axios.post(
        `${LIFI_API_BASE}/advanced/routes`,
        {
          fromChainId: params.fromChain,
          fromAmount: params.fromAmount,
          fromTokenAddress: params.fromToken,
          toChainId: params.toChain,
          toTokenAddress: params.toToken,
          options: {
            slippage: 0.005, // 0.5%
            integrator: 'shotty-trading-butler',
          },
        },
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('LiFi getRoutes error:', error);
      throw new Error('Failed to get routes from LiFi');
    }
  }

  /**
   * Get transaction status
   */
  async getStatus(params: {
    txHash: string;
    bridge: string;
    fromChain: string;
    toChain: string;
  }): Promise<any> {
    try {
      const response = await axios.get(`${LIFI_API_BASE}/status`, {
        params: {
          txHash: params.txHash,
          bridge: params.bridge,
          fromChain: params.fromChain,
          toChain: params.toChain,
        },
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error('LiFi getStatus error:', error);
      throw new Error('Failed to get status from LiFi');
    }
  }

  /**
   * Get supported bridges between chains
   */
  async getConnections(params?: { fromChain?: string; toChain?: string }): Promise<any> {
    try {
      const response = await axios.get(`${LIFI_API_BASE}/connections`, {
        params,
        headers: this.getHeaders(),
      });

      return response.data.connections || [];
    } catch (error) {
      console.error('LiFi getConnections error:', error);
      throw new Error('Failed to get connections from LiFi');
    }
  }

  /**
   * Get tools (DEXs, bridges) available
   */
  async getTools(): Promise<any[]> {
    try {
      const response = await axios.get(`${LIFI_API_BASE}/tools`, {
        headers: this.getHeaders(),
      });

      return response.data.bridges || [];
    } catch (error) {
      console.error('LiFi getTools error:', error);
      throw new Error('Failed to get tools from LiFi');
    }
  }

  /**
   * Get token price
   */
  async getTokenPrice(chain: string, tokenAddress: string): Promise<number> {
    try {
      const response = await axios.get(`${LIFI_API_BASE}/token`, {
        params: {
          chain,
          token: tokenAddress,
        },
        headers: this.getHeaders(),
      });

      return parseFloat(response.data.priceUSD || '0');
    } catch (error) {
      console.error('LiFi getTokenPrice error:', error);
      return 0;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-lifi-api-key'] = this.apiKey;
    }

    return headers;
  }
}

// Singleton instance
let lifiService: LiFiService | null = null;

export function getLiFiService(): LiFiService {
  if (!lifiService) {
    lifiService = new LiFiService();
  }
  return lifiService;
}

// Helper function to convert chain names to chain IDs
export function getChainId(chainName: string): string {
  const chainMap: Record<string, string> = {
    'ethereum': '1',
    'eth': '1',
    'polygon': '137',
    'matic': '137',
    'arbitrum': '42161',
    'arb': '42161',
    'optimism': '10',
    'op': '10',
    'bsc': '56',
    'binance': '56',
    'avalanche': '43114',
    'avax': '43114',
    'flow': '545',
    'flowevm': '545',
  };

  return chainMap[chainName.toLowerCase()] || chainName;
}
