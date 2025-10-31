/**
 * Scheduled Transactions Service
 * Handles scheduling and execution of time-locked transactions
 */

import { ethers, Contract } from 'ethers';

const SCHEDULED_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SCHEDULED_CONTRACT_ADDRESS || '';
const FLOW_CHAIN_RPC = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org/';

export enum ScheduleStatus {
  Pending = 0,
  Executed = 1,
  Cancelled = 2,
  Failed = 3
}

// ABI for ScheduledTransactions contract
const SCHEDULED_ABI = [
  "function scheduleTransaction(address target, uint256 value, bytes data, uint256 executeAfter, uint256 executeWindow, string description) payable returns (uint256)",
  "function executeScheduledTransaction(uint256 scheduleId) returns (bool)",
  "function cancelScheduledTransaction(uint256 scheduleId)",
  "function scheduleTransfer(address payable recipient, uint256 amount, uint256 executeAfter, string description) payable returns (uint256)",
  "function getUserSchedules(address user) view returns (uint256[])",
  "function getSchedule(uint256 scheduleId) view returns (tuple(uint256 id, address creator, address target, uint256 value, bytes data, uint256 executeAfter, uint256 executeWindow, uint8 status, string description, uint256 createdAt, uint256 executedAt))",
  "function isReadyToExecute(uint256 scheduleId) view returns (bool)",
  "function getPendingSchedulesCount(address user) view returns (uint256)",
  "function minDelay() view returns (uint256)",
  "function maxDelay() view returns (uint256)",
  "function defaultWindow() view returns (uint256)",
  "event TransactionScheduled(uint256 indexed scheduleId, address indexed creator, address target, uint256 executeAfter, string description)",
  "event TransactionExecuted(uint256 indexed scheduleId, bool success)",
  "event TransactionCancelled(uint256 indexed scheduleId)",
  "event TransactionFailed(uint256 indexed scheduleId, bytes reason)"
];

export interface ScheduledTransaction {
  id: number;
  creator: string;
  target: string;
  value: string;
  data: string;
  executeAfter: number;
  executeWindow: number;
  status: ScheduleStatus;
  description: string;
  createdAt: number;
  executedAt: number;
}

export interface ScheduleParams {
  target: string;
  value: string;
  data: string;
  executeAfter: number;
  executeWindow?: number;
  description: string;
}

/**
 * Scheduled Transactions Service Class
 */
export class ScheduledService {
  private contract: Contract;
  private readOnlyProvider: ethers.JsonRpcProvider;

  constructor() {
    this.readOnlyProvider = new ethers.JsonRpcProvider(FLOW_CHAIN_RPC);
    this.contract = new ethers.Contract(
      SCHEDULED_CONTRACT_ADDRESS,
      SCHEDULED_ABI,
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

    return new ethers.Contract(SCHEDULED_CONTRACT_ADDRESS, SCHEDULED_ABI, signer);
  }

  /**
   * Schedule a transaction for future execution
   */
  async scheduleTransaction(params: ScheduleParams): Promise<{ scheduleId: number; txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.scheduleTransaction(
        params.target,
        params.value,
        params.data,
        params.executeAfter,
        params.executeWindow || 0,
        params.description,
        { value: params.value }
      );

      const receipt = await tx.wait();

      // Parse event to get schedule ID
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id('TransactionScheduled(uint256,address,address,uint256,string)')
      );

      let scheduleId = 0;
      if (event) {
        const decoded = contract.interface.parseLog(event);
        scheduleId = Number(decoded?.args[0] || 0);
      }

      return {
        scheduleId,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Schedule transaction error:', error);
      throw new Error(error.message || 'Failed to schedule transaction');
    }
  }

  /**
   * Schedule a simple ETH/token transfer
   */
  async scheduleTransfer(
    recipient: string,
    amount: string,
    executeAfter: number,
    description: string
  ): Promise<{ scheduleId: number; txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.scheduleTransfer(
        recipient,
        amount,
        executeAfter,
        description,
        { value: amount }
      );

      const receipt = await tx.wait();

      // Parse event to get schedule ID
      const event = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id('TransactionScheduled(uint256,address,address,uint256,string)')
      );

      let scheduleId = 0;
      if (event) {
        const decoded = contract.interface.parseLog(event);
        scheduleId = Number(decoded?.args[0] || 0);
      }

      return {
        scheduleId,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Schedule transfer error:', error);
      throw new Error(error.message || 'Failed to schedule transfer');
    }
  }

  /**
   * Execute a scheduled transaction
   */
  async executeScheduledTransaction(scheduleId: number): Promise<{ success: boolean; txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.executeScheduledTransaction(scheduleId);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Execute scheduled transaction error:', error);
      throw new Error(error.message || 'Failed to execute scheduled transaction');
    }
  }

  /**
   * Cancel a pending scheduled transaction
   */
  async cancelScheduledTransaction(scheduleId: number): Promise<{ txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.cancelScheduledTransaction(scheduleId);
      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Cancel scheduled transaction error:', error);
      throw new Error(error.message || 'Failed to cancel scheduled transaction');
    }
  }

  /**
   * Get all scheduled transactions for a user
   */
  async getUserSchedules(userAddress: string): Promise<number[]> {
    try {
      const scheduleIds = await this.contract.getUserSchedules(userAddress);
      return scheduleIds.map((id: bigint) => Number(id));
    } catch (error: any) {
      console.error('Get user schedules error:', error);
      throw new Error('Failed to get user schedules');
    }
  }

  /**
   * Get details of a scheduled transaction
   */
  async getSchedule(scheduleId: number): Promise<ScheduledTransaction> {
    try {
      const schedule = await this.contract.getSchedule(scheduleId);

      return {
        id: Number(schedule.id),
        creator: schedule.creator,
        target: schedule.target,
        value: schedule.value.toString(),
        data: schedule.data,
        executeAfter: Number(schedule.executeAfter),
        executeWindow: Number(schedule.executeWindow),
        status: schedule.status as ScheduleStatus,
        description: schedule.description,
        createdAt: Number(schedule.createdAt),
        executedAt: Number(schedule.executedAt)
      };
    } catch (error: any) {
      console.error('Get schedule error:', error);
      throw new Error('Failed to get schedule');
    }
  }

  /**
   * Check if a scheduled transaction is ready to execute
   */
  async isReadyToExecute(scheduleId: number): Promise<boolean> {
    try {
      return await this.contract.isReadyToExecute(scheduleId);
    } catch (error: any) {
      console.error('Is ready to execute error:', error);
      return false;
    }
  }

  /**
   * Get pending schedules count for a user
   */
  async getPendingSchedulesCount(userAddress: string): Promise<number> {
    try {
      const count = await this.contract.getPendingSchedulesCount(userAddress);
      return Number(count);
    } catch (error: any) {
      console.error('Get pending schedules count error:', error);
      throw new Error('Failed to get pending schedules count');
    }
  }

  /**
   * Get all scheduled transactions with details for a user
   */
  async getUserSchedulesWithDetails(userAddress: string): Promise<ScheduledTransaction[]> {
    try {
      const scheduleIds = await this.getUserSchedules(userAddress);
      const schedules: ScheduledTransaction[] = [];

      for (const id of scheduleIds) {
        const schedule = await this.getSchedule(id);
        schedules.push(schedule);
      }

      return schedules;
    } catch (error: any) {
      console.error('Get user schedules with details error:', error);
      throw new Error('Failed to get user schedules with details');
    }
  }

  /**
   * Get contract configuration
   */
  async getConfig(): Promise<{
    minDelay: number;
    maxDelay: number;
    defaultWindow: number;
  }> {
    try {
      const [minDelay, maxDelay, defaultWindow] = await Promise.all([
        this.contract.minDelay(),
        this.contract.maxDelay(),
        this.contract.defaultWindow()
      ]);

      return {
        minDelay: Number(minDelay),
        maxDelay: Number(maxDelay),
        defaultWindow: Number(defaultWindow)
      };
    } catch (error: any) {
      console.error('Get config error:', error);
      throw new Error('Failed to get config');
    }
  }

  /**
   * Helper: Calculate execute after timestamp
   */
  calculateExecuteAfter(delayInSeconds: number): number {
    return Math.floor(Date.now() / 1000) + delayInSeconds;
  }

  /**
   * Helper: Format time remaining
   */
  formatTimeRemaining(executeAfter: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = executeAfter - now;

    if (diff <= 0) return 'Ready to execute';

    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// Export singleton instance
export const scheduledService = new ScheduledService();
