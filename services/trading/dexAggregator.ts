// DEX Aggregator Service for executing real trades using Li.Fi
import axios from 'axios';
import { ethers } from 'ethers';
import { getFlowEvmClient } from '../blockchain/client';

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  price: string;
  estimatedGas: string;
  protocols: string[];
  route?: any; // Li.Fi route data for execution
}

export interface SwapResult {
  txHash: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  gasUsed?: string;
}

export class DEXAggregatorService {
  private lifiApiKey: string | undefined;
  private fromChainId: number;
  private toChainId: number;
  private readonly LIFI_BASE_URL = 'https://li.quest/v1';
  private readonly FLOW_EVM_ID = 545; // Flow EVM Testnet

  constructor(fromChainId: number = 1, toChainId?: number) {
    this.lifiApiKey = process.env.LIFI_API_KEY;
    this.fromChainId = fromChainId;
    // Default to Flow EVM as destination if not specified
    this.toChainId = toChainId ?? this.FLOW_EVM_ID;
  }

  // Get swap quote from Li.Fi
  async getSwapQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 0.5,
    userAddress?: string
  ): Promise<SwapQuote> {
    return await this.getLifiQuote(fromToken, toToken, amount, slippage, userAddress);
  }

  private async getLifiQuote(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number,
    userAddress?: string
  ): Promise<SwapQuote> {
    try {
      const fromTokenAddress = this.getTokenAddress(fromToken, this.fromChainId);
      const toTokenAddress = this.getTokenAddress(toToken, this.toChainId);

      // Get token decimals (defaulting to 18 for most tokens)
      const decimals = this.getTokenDecimals(fromToken, this.fromChainId);
      const fromAmountWei = ethers.parseUnits(amount, decimals).toString();

      // Build request parameters - allow cross-chain bridging
      const params: any = {
        fromChain: this.fromChainId.toString(),
        toChain: this.toChainId.toString(), // Can be different for cross-chain
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        fromAmount: fromAmountWei,
        slippage: (slippage / 100).toString(), // Li.Fi expects decimal format (0.005 for 0.5%)
      };

      // Add fromAddress if provided (required for some endpoints)
      if (userAddress) {
        params.fromAddress = userAddress;
      }

      // Build headers
      const headers: any = {};
      if (this.lifiApiKey) {
        headers['x-lifi-api-key'] = this.lifiApiKey;
      }

      // Request quote from Li.Fi
      const response = await axios.get(`${this.LIFI_BASE_URL}/quote`, {
        params,
        headers,
      });

      const data = response.data;

      // Extract quote information
      const toAmountWei = data.estimate?.toAmount || data.action?.toAmount || '0';
      const toDecimals = this.getTokenDecimals(toToken, this.toChainId);
      const toAmount = ethers.formatUnits(toAmountWei, toDecimals);

      // Extract gas estimate
      const gasEstimate = data.estimate?.gasCosts?.[0]?.estimate || '200000';

      // Extract protocol/tool information
      const protocols = data.includedSteps?.map((step: any) =>
        step.tool || step.toolDetails?.name
      ).filter(Boolean) || [];

      return {
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount,
        price: (parseFloat(toAmount) / parseFloat(amount)).toString(),
        estimatedGas: gasEstimate,
        protocols,
        route: data, // Store full route data for execution
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data;

        // Provide user-friendly error messages based on status code
        if (statusCode === 400) {
          throw new Error('No route available for this swap. The selected chain or token pair may not be supported.');
        } else if (statusCode === 404) {
          throw new Error('Swap route not found. Please try different tokens or chains.');
        } else if (statusCode === 500 || statusCode === 503) {
          throw new Error('Swap service temporarily unavailable. Please try again later.');
        } else {
          throw new Error(errorData?.message || error.message || 'Unable to get swap quote');
        }
      }
      throw new Error('Failed to fetch swap quote. Please try again.');
    }
  }

  // Execute swap using Li.Fi and Flow EVM's universal transaction
  async executeSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 0.5,
    userAddress: string
  ): Promise<SwapResult> {
    try {
      const flowEvmClient = getFlowEvmClient();
      await flowEvmClient.initialize();

      // Check if this is a cross-chain bridge to Flow EVM
      const isBridgeToFlowEvm = this.fromChainId !== this.FLOW_EVM_ID &&
                                   this.toChainId === this.FLOW_EVM_ID;

      if (isBridgeToFlowEvm) {
        console.log('🌉 Bridging from chain', this.fromChainId, 'to Flow EVM');
        // For bridging TO Flow EVM, use Flow EVM's universal transaction
        // with the funds field to move tokens as-is
        return await this.executeFlowEvmBridge(fromToken, toToken, amount, userAddress);
      }

      // For other cross-chain or same-chain swaps, use Li.Fi
      const quote = await this.getSwapQuote(fromToken, toToken, amount, slippage, userAddress);

      // Build swap transaction data using Li.Fi
      const swapData = await this.buildLifiSwapData(
        fromToken,
        toToken,
        amount,
        slippage,
        userAddress,
        quote
      );

      // Execute via Flow EVM transaction
      const txResponse = await flowEvmClient.executeTransaction({
        to: swapData.to,
        value: BigInt(swapData.value),
        data: swapData.data,
      });

      // Convert UniversalTxResponse to hash string
      const txHash = typeof txResponse === 'string' ? txResponse : String(txResponse);

      return {
        txHash,
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: quote.toAmount,
        status: 'PENDING',
      };
    } catch (error) {
      console.error('Failed to execute swap:', error);
      throw error;
    }
  }

  // Execute a bridge to Flow EVM using universal transactions with funds field
  private async executeFlowEvmBridge(
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string
  ): Promise<SwapResult> {
    try {
      // Flow EVM is a standard EVM chain, so cross-chain bridging
      // would require using a bridge protocol like LiFi or similar
      throw new Error('Cross-chain bridging to Flow EVM requires using a bridge protocol. Please use the LiFi integration for cross-chain swaps.');
    } catch (error) {
      console.error('Failed to bridge to Flow EVM:', error);
      throw error instanceof Error ? error : new Error('Failed to bridge tokens to Flow EVM. Please try again.');
    }
  }


  private async buildLifiSwapData(
    fromToken: string,
    toToken: string,
    fromAmount: string,
    slippage: number,
    userAddress: string,
    quote?: SwapQuote
  ): Promise<{ to: string; value: string; data: string }> {
    try {
      // If we have route data from the quote, use it
      if (quote?.route) {
        const route = quote.route;

        // Extract transaction data from Li.Fi route
        const transactionRequest = route.transactionRequest;

        if (transactionRequest?.to && transactionRequest?.data) {
          return {
            to: transactionRequest.to,
            value: transactionRequest.value || '0',
            data: transactionRequest.data,
          };
        }
      }

      // If no route data, we need to request it from Li.Fi
      const fromTokenAddress = this.getTokenAddress(fromToken, this.fromChainId);
      const toTokenAddress = this.getTokenAddress(toToken, this.toChainId);
      const decimals = this.getTokenDecimals(fromToken, this.fromChainId);
      const fromAmountWei = ethers.parseUnits(fromAmount, decimals).toString();

      const params: any = {
        fromChain: this.fromChainId.toString(),
        toChain: this.toChainId.toString(), // Cross-chain capable
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        fromAmount: fromAmountWei,
        fromAddress: userAddress,
        slippage: (slippage / 100).toString(),
      };

      const headers: any = {};
      if (this.lifiApiKey) {
        headers['x-lifi-api-key'] = this.lifiApiKey;
      }

      // Request transaction data from Li.Fi
      const response = await axios.get(`${this.LIFI_BASE_URL}/quote`, {
        params,
        headers,
      });

      const transactionRequest = response.data.transactionRequest;

      if (!transactionRequest?.to || !transactionRequest?.data) {
        throw new Error('Invalid transaction data from swap service');
      }

      return {
        to: transactionRequest.to,
        value: transactionRequest.value || '0',
        data: transactionRequest.data,
      };
    } catch (error) {
      console.error('Failed to build swap transaction:', error);
      throw new Error('Unable to build swap transaction. Please try again.');
    }
  }

  private getTokenAddress(symbol: string, chainId: number): string {
    // Chain-specific token addresses
    // Li.Fi uses 0x0000... for native tokens on all chains
    const tokenAddresses: Record<number, Record<string, string>> = {
      // Ethereum Mainnet (1)
      1: {
        ETH: '0x0000000000000000000000000000000000000000',
        USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        PUSH: '0xf418588522d5dd018b425E472991E52EBBeEEEEE',
        WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      // Polygon (137)
      137: {
        MATIC: '0x0000000000000000000000000000000000000000',
        USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC native
        USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      // Base (8453)
      8453: {
        ETH: '0x0000000000000000000000000000000000000000',
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC native on Base
        DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      },
      // Arbitrum (42161)
      42161: {
        ETH: '0x0000000000000000000000000000000000000000',
        USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC native
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
      },
      // Optimism (10)
      10: {
        ETH: '0x0000000000000000000000000000000000000000',
        USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC native
        USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      },
      // Avalanche (43114)
      43114: {
        AVAX: '0x0000000000000000000000000000000000000000',
        USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // USDC native
        USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
      },
      // BNB Chain (56)
      56: {
        BNB: '0x0000000000000000000000000000000000000000',
        USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        USDT: '0x55d398326f99059fF775485246999027B3197955',
        DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
      },
      // Flow EVM Testnet (545)
      // Flow EVM supports universal tokens that can bridge from any chain
      545: {
        FLOW: '0x0000000000000000000000000000000000000000', // Native FLOW token
        ETH: '0x0000000000000000000000000000000000000000', // Can receive from any EVM chain
        USDC: '0x0000000000000000000000000000000000000000', // Universal USDC
        USDT: '0x0000000000000000000000000000000000000000', // Universal USDT
        DAI: '0x0000000000000000000000000000000000000000', // Universal DAI
      },
    };

    const chainTokens = tokenAddresses[chainId];
    if (!chainTokens) {
      throw new Error(`Chain ${chainId} is not supported for swaps`);
    }

    const address = chainTokens[symbol.toUpperCase()];
    if (!address) {
      throw new Error(`Token ${symbol} is not available on chain ${chainId}`);
    }

    return address;
  }

  private getTokenDecimals(symbol: string, chainId: number): number {
    // Chain-specific decimals (some tokens have different decimals on different chains)
    const chainDecimals: Record<number, Record<string, number>> = {
      56: { // BNB Chain has 18 decimals for bridged stablecoins
        USDC: 18,
        USDT: 18,
        DAI: 18,
      },
    };

    // Check for chain-specific decimals first
    if (chainDecimals[chainId]?.[symbol.toUpperCase()]) {
      return chainDecimals[chainId][symbol.toUpperCase()];
    }

    // Standard decimals for most tokens
    const decimals: Record<string, number> = {
      ETH: 18,
      WETH: 18,
      USDC: 6,
      USDT: 6,
      DAI: 18,
      UNI: 18,
      PUSH: 18,
      MATIC: 18,
      AVAX: 18,
      BNB: 18,
    };

    return decimals[symbol.toUpperCase()] || 18;
  }

  // Simulate trade for testing (useful before executing real trades)
  async simulateSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    slippage: number = 0.5
  ): Promise<SwapQuote> {
    return await this.getSwapQuote(fromToken, toToken, amount, slippage);
  }
}

// Factory function
export function createDEXAggregator(fromChainId?: number, toChainId?: number): DEXAggregatorService {
  return new DEXAggregatorService(fromChainId, toChainId);
}
