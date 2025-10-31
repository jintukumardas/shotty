import { ethers } from 'ethers';

const FLOW_CHAIN_EXPLORER_API = 'https://evm-testnet.flowscan.io/api';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueFormatted: string;
  timestamp: number;
  timeAgo: string;
  blockNumber: number;
  status: 'success' | 'failed' | 'pending';
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;
  feeFormatted?: string;
  methodId?: string;
  functionName?: string;
  isError?: boolean;
}

export interface TransactionQueryOptions {
  limit?: number;
  offset?: number;
  startBlock?: number;
  endBlock?: number;
}

/**
 * Transaction Service for fetching and displaying user transactions
 */
export class TransactionService {
  private explorerApiUrl: string;
  private providerUrl: string;

  constructor() {
    this.explorerApiUrl = FLOW_CHAIN_EXPLORER_API;
    this.providerUrl = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org/';
  }

  /**
   * Get recent transactions for an address using explorer API
   */
  async getRecentTransactions(
    address: string,
    options: TransactionQueryOptions = {}
  ): Promise<Transaction[]> {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address');
      }

      const { limit = 10, offset = 0, startBlock, endBlock } = options;

      // Try Blockscout API format first
      const params = new URLSearchParams({
        module: 'account',
        action: 'txlist',
        address: address,
        sort: 'desc',
        page: String(Math.floor(offset / limit) + 1),
        offset: String(limit),
      });

      if (startBlock) params.append('startblock', String(startBlock));
      if (endBlock) params.append('endblock', String(endBlock));

      const url = `${this.explorerApiUrl}?${params.toString()}`;
      console.log('Fetching transactions from explorer API:', url);

      const response = await fetch(url);

      if (!response.ok) {
        console.warn('Explorer API not available, falling back to RPC');
        return await this.getTransactionsViaRPC(address, limit);
      }

      const data = await response.json();

      // Handle Blockscout API response format
      if (data.status === '1' && Array.isArray(data.result)) {
        return this.parseExplorerTransactions(data.result, address);
      }

      // Fallback to RPC if API doesn't return expected format
      console.warn('Unexpected API response format, falling back to RPC');
      return await this.getTransactionsViaRPC(address, limit);
    } catch (error) {
      console.error('Error fetching transactions from explorer:', error);
      // Fallback to RPC method
      return await this.getTransactionsViaRPC(address, options.limit || 10);
    }
  }

  /**
   * Fallback method: Get recent transactions using RPC provider
   * This is less efficient but works without explorer API
   */
  private async getTransactionsViaRPC(
    address: string,
    limit: number = 10
  ): Promise<Transaction[]> {
    try {
      console.log('Fetching transactions via RPC for address:', address);
      const provider = new ethers.JsonRpcProvider(this.providerUrl);

      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      const transactions: Transaction[] = [];

      // Search last 1000 blocks for transactions
      const blocksToSearch = Math.min(1000, currentBlock);
      const startBlock = currentBlock - blocksToSearch;

      console.log(`Searching blocks ${startBlock} to ${currentBlock}`);

      // This is a simplified version - in production, use indexed data
      for (let i = currentBlock; i >= startBlock && transactions.length < limit; i--) {
        try {
          const block = await provider.getBlock(i, true);
          if (!block || !block.transactions) continue;

          for (const txHash of block.transactions) {
            if (transactions.length >= limit) break;

            // For prefetched transactions, check if address is involved
            if (typeof txHash === 'string') {
              const tx = await provider.getTransaction(txHash);
              if (!tx) continue;

              if (
                tx.from.toLowerCase() === address.toLowerCase() ||
                (tx.to && tx.to.toLowerCase() === address.toLowerCase())
              ) {
                const receipt = await provider.getTransactionReceipt(txHash);
                transactions.push(
                  this.parseRPCTransaction(tx, receipt, block.timestamp)
                );
              }
            } else {
              // Transaction already fetched with block
              const tx = txHash as ethers.TransactionResponse;
              if (
                tx.from.toLowerCase() === address.toLowerCase() ||
                (tx.to && tx.to.toLowerCase() === address.toLowerCase())
              ) {
                const receipt = await provider.getTransactionReceipt(tx.hash);
                transactions.push(
                  this.parseRPCTransaction(tx, receipt, block.timestamp)
                );
              }
            }
          }
        } catch (blockError) {
          console.warn(`Error fetching block ${i}:`, blockError);
          continue;
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions via RPC:', error);
      return [];
    }
  }

  /**
   * Parse transactions from explorer API
   */
  private parseExplorerTransactions(
    txList: any[],
    userAddress: string
  ): Transaction[] {
    return txList.map((tx) => {
      const value = tx.value || '0';
      const gasUsed = tx.gasUsed || tx.gas_used || '0';
      const gasPrice = tx.gasPrice || tx.gas_price || '0';
      const timestamp = parseInt(tx.timeStamp || tx.timestamp || '0');

      // Calculate fee
      const fee =
        gasUsed && gasPrice
          ? (BigInt(gasUsed) * BigInt(gasPrice)).toString()
          : '0';

      return {
        hash: tx.hash || tx.transaction_hash,
        from: tx.from,
        to: tx.to || tx.to_address || '',
        value: value,
        valueFormatted: this.formatValue(value),
        timestamp: timestamp,
        timeAgo: this.getTimeAgo(timestamp),
        blockNumber: parseInt(tx.blockNumber || tx.block_number || '0'),
        status: this.getStatus(tx),
        gasUsed: gasUsed,
        gasPrice: gasPrice,
        fee: fee,
        feeFormatted: this.formatValue(fee),
        methodId: tx.methodId || tx.input?.slice(0, 10),
        functionName: tx.functionName || this.getFunctionName(tx.input),
        isError: tx.isError === '1' || tx.is_error === true,
      };
    });
  }

  /**
   * Parse transaction from RPC response
   */
  private parseRPCTransaction(
    tx: ethers.TransactionResponse,
    receipt: ethers.TransactionReceipt | null,
    blockTimestamp: number
  ): Transaction {
    const value = tx.value.toString();
    const fee = receipt
      ? (receipt.gasUsed * tx.gasPrice).toString()
      : '0';

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: value,
      valueFormatted: this.formatValue(value),
      timestamp: blockTimestamp,
      timeAgo: this.getTimeAgo(blockTimestamp),
      blockNumber: tx.blockNumber || 0,
      status: receipt
        ? receipt.status === 1
          ? 'success'
          : 'failed'
        : 'pending',
      gasUsed: receipt?.gasUsed.toString(),
      gasPrice: tx.gasPrice.toString(),
      fee: fee,
      feeFormatted: this.formatValue(fee),
      methodId: tx.data.slice(0, 10),
      functionName: this.getFunctionName(tx.data),
    };
  }

  /**
   * Get transaction status
   */
  private getStatus(tx: any): 'success' | 'failed' | 'pending' {
    if (tx.txreceipt_status === '1' || tx.status === '1') return 'success';
    if (tx.isError === '1' || tx.is_error === true) return 'failed';
    if (tx.txreceipt_status === '0' || tx.status === '0') return 'failed';
    return 'success'; // Default to success if no error indicated
  }

  /**
   * Format wei value to ETH with symbol
   */
  private formatValue(weiValue: string): string {
    try {
      const eth = ethers.formatEther(weiValue);
      const num = parseFloat(eth);

      if (num === 0) return '0 FLOW';
      if (num < 0.0001) return '< 0.0001 FLOW';
      if (num < 1) return `${num.toFixed(4)} FLOW`;
      return `${num.toFixed(4)} FLOW`;
    } catch {
      return '0 FLOW';
    }
  }

  /**
   * Get human-readable time ago
   */
  private getTimeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const seconds = now - timestamp;

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  /**
   * Try to decode function name from transaction data
   */
  private getFunctionName(data?: string): string {
    if (!data || data === '0x' || data.length < 10) {
      return 'Transfer';
    }

    const methodId = data.slice(0, 10);

    // Common method signatures
    const knownMethods: Record<string, string> = {
      '0xa9059cbb': 'Transfer',
      '0x23b872dd': 'Transfer From',
      '0x095ea7b3': 'Approve',
      '0x40c10f19': 'Mint',
      '0x42842e0e': 'Safe Transfer',
      '0x': 'Transfer',
    };

    return knownMethods[methodId] || 'Contract Call';
  }

  /**
   * Format transaction for display
   */
  formatTransactionForDisplay(tx: Transaction, userAddress: string): string {
    const isOutgoing =
      tx.from.toLowerCase() === userAddress.toLowerCase();
    const direction = isOutgoing ? '→' : '←';
    const counterparty = isOutgoing ? tx.to : tx.from;
    const statusEmoji = tx.status === 'success' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';

    return `
${statusEmoji} ${direction} ${tx.valueFormatted}
${isOutgoing ? 'To' : 'From'}: ${this.shortenAddress(counterparty)}
${tx.functionName} • ${tx.timeAgo}
Tx: ${this.shortenHash(tx.hash)}
    `.trim();
  }

  /**
   * Shorten address for display
   */
  private shortenAddress(address: string): string {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Shorten transaction hash for display
   */
  private shortenHash(hash: string): string {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }

  /**
   * Get explorer URL for transaction
   */
  getTransactionUrl(txHash: string): string {
    return `https://evm-testnet.flowscan.io/tx/${txHash}`;
  }
}

/**
 * Get transaction service instance
 */
export function getTransactionService(): TransactionService {
  return new TransactionService();
}
