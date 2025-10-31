/**
 * Batch Transactions Service
 * Handles batch EVM operations for efficient multi-transaction execution
 */

import { ethers, Contract } from 'ethers';

const BATCH_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BATCH_CONTRACT_ADDRESS || '';
const FLOW_CHAIN_RPC = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org/';

// ABI for BatchTransactions contract
const BATCH_ABI = [
  "function executeBatch((address target, uint256 value, bytes data, bool allowFailure)[] operations, bool requireAllSuccess) payable returns ((bool success, bytes[] results, uint256 failedCount))",
  "function executeBatchSimple(address[] targets, uint256[] values, bytes[] datas) payable returns (bool)",
  "function estimateGas((address target, uint256 value, bytes data, bool allowFailure)[] operations) view returns (uint256)",
  "function getUserStats(address user) view returns (uint256)",
  "function totalBatchesExecuted() view returns (uint256)",
  "event BatchExecuted(address indexed executor, uint256 operationsCount, bool success)",
  "event OperationFailed(uint256 indexed operationIndex, bytes reason)"
];

export interface BatchOperation {
  target: string;
  value: string;
  data: string;
  allowFailure: boolean;
  description?: string;
}

export interface BatchResult {
  success: boolean;
  results: string[];
  failedCount: number;
  txHash?: string;
}

/**
 * Batch Transactions Service Class
 */
export class BatchService {
  private contract: Contract;
  private readOnlyProvider: ethers.JsonRpcProvider;

  constructor() {
    this.readOnlyProvider = new ethers.JsonRpcProvider(FLOW_CHAIN_RPC);
    this.contract = new ethers.Contract(
      BATCH_CONTRACT_ADDRESS,
      BATCH_ABI,
      this.readOnlyProvider
    );
  }

  /**
   * Get write-enabled contract with signer
   */
  private async getWriteContract(): Promise<Contract> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Wallet not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    return new ethers.Contract(BATCH_CONTRACT_ADDRESS, BATCH_ABI, signer);
  }

  /**
   * Execute a batch of operations
   */
  async executeBatch(
    operations: BatchOperation[],
    requireAllSuccess: boolean = true,
    totalValue?: string
  ): Promise<BatchResult> {
    try {
      const contract = await this.getWriteContract();

      // Calculate total value if not provided
      if (!totalValue) {
        totalValue = operations
          .reduce((sum, op) => sum + BigInt(op.value || '0'), BigInt(0))
          .toString();
      }

      // Convert operations to contract format
      const contractOps = operations.map(op => ({
        target: op.target,
        value: op.value || '0',
        data: op.data || '0x',
        allowFailure: op.allowFailure
      }));

      const tx = await contract.executeBatch(contractOps, requireAllSuccess, {
        value: totalValue
      });

      const receipt = await tx.wait();

      return {
        success: true,
        results: [],
        failedCount: 0,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Batch execution error:', error);
      throw new Error(error.message || 'Failed to execute batch');
    }
  }

  /**
   * Execute batch with simplified interface
   */
  async executeBatchSimple(
    targets: string[],
    values: string[],
    datas: string[]
  ): Promise<{ success: boolean; txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const totalValue = values.reduce(
        (sum, val) => sum + BigInt(val),
        BigInt(0)
      ).toString();

      const tx = await contract.executeBatchSimple(targets, values, datas, {
        value: totalValue
      });

      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Simple batch execution error:', error);
      throw new Error(error.message || 'Failed to execute simple batch');
    }
  }

  /**
   * Estimate gas for batch operations
   */
  async estimateGas(operations: BatchOperation[]): Promise<bigint> {
    try {
      const contractOps = operations.map(op => ({
        target: op.target,
        value: op.value || '0',
        data: op.data || '0x',
        allowFailure: op.allowFailure
      }));

      const gasEstimate = await this.contract.estimateGas(contractOps);
      return gasEstimate;
    } catch (error: any) {
      console.error('Gas estimation error:', error);
      throw new Error('Failed to estimate gas');
    }
  }

  /**
   * Get batch execution stats for a user
   */
  async getUserStats(userAddress: string): Promise<number> {
    try {
      const stats = await this.contract.getUserStats(userAddress);
      return Number(stats);
    } catch (error: any) {
      console.error('Get user stats error:', error);
      throw new Error('Failed to get user stats');
    }
  }

  /**
   * Get total batches executed globally
   */
  async getTotalBatchesExecuted(): Promise<number> {
    try {
      const total = await this.contract.totalBatchesExecuted();
      return Number(total);
    } catch (error: any) {
      console.error('Get total batches error:', error);
      throw new Error('Failed to get total batches');
    }
  }

  /**
   * Helper: Create a token transfer operation
   */
  createTransferOperation(
    tokenAddress: string,
    recipient: string,
    amount: string
  ): BatchOperation {
    const iface = new ethers.Interface([
      'function transfer(address to, uint256 amount)'
    ]);

    return {
      target: tokenAddress,
      value: '0',
      data: iface.encodeFunctionData('transfer', [recipient, amount]),
      allowFailure: false,
      description: `Transfer tokens to ${recipient}`
    };
  }

  /**
   * Helper: Create an approval operation
   */
  createApprovalOperation(
    tokenAddress: string,
    spender: string,
    amount: string
  ): BatchOperation {
    const iface = new ethers.Interface([
      'function approve(address spender, uint256 amount)'
    ]);

    return {
      target: tokenAddress,
      value: '0',
      data: iface.encodeFunctionData('approve', [spender, amount]),
      allowFailure: false,
      description: `Approve ${spender} to spend tokens`
    };
  }

  /**
   * Helper: Create an ETH transfer operation
   */
  createETHTransferOperation(
    recipient: string,
    amount: string
  ): BatchOperation {
    return {
      target: recipient,
      value: amount,
      data: '0x',
      allowFailure: false,
      description: `Send ${ethers.formatEther(amount)} ETH to ${recipient}`
    };
  }
}

// Export singleton instance
export const batchService = new BatchService();
