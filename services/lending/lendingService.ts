/**
 * Lending Protocol Service
 * Handles lending, borrowing, and DeFi operations
 */

import { ethers, Contract } from 'ethers';

const LENDING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS || '';
const FLOW_CHAIN_RPC = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org/';

// ABI for LendingProtocol contract
const LENDING_ABI = [
  "function createPool(address token, uint256 initialInterestRate)",
  "function deposit(address token, uint256 amount)",
  "function withdraw(address token, uint256 amount)",
  "function borrow(address token, uint256 amount) payable",
  "function repay(address token, uint256 amount)",
  "function liquidate(address borrower, address token)",
  "function getUserDeposit(address token, address user) view returns (uint256 amount, uint256 interest)",
  "function getUserLoan(address token, address user) view returns (uint256 borrowed, uint256 collateral, uint256 interest)",
  "function getPoolUtilization(address token) view returns (uint256)",
  "function getSupportedTokens() view returns (address[])",
  "function pools(address) view returns (uint256 totalSupply, uint256 totalBorrowed, uint256 interestRate, uint256 lastUpdateTime, bool isActive)",
  "event Deposited(address indexed user, address indexed token, uint256 amount)",
  "event Withdrawn(address indexed user, address indexed token, uint256 amount, uint256 interest)",
  "event Borrowed(address indexed user, address indexed token, uint256 amount, uint256 collateral)",
  "event Repaid(address indexed user, address indexed token, uint256 amount, uint256 interest)",
  "event Liquidated(address indexed borrower, address indexed liquidator, uint256 amount)",
  "event PoolCreated(address indexed token, uint256 initialInterestRate)"
];

export interface Pool {
  totalSupply: string;
  totalBorrowed: string;
  interestRate: number;
  lastUpdateTime: number;
  isActive: boolean;
}

export interface UserDeposit {
  amount: string;
  interest: string;
}

export interface UserLoan {
  borrowed: string;
  collateral: string;
  interest: string;
}

export interface DepositParams {
  token: string;
  amount: string;
}

export interface BorrowParams {
  token: string;
  amount: string;
  collateral: string;
}

/**
 * Lending Protocol Service Class
 */
export class LendingService {
  private contract: Contract;
  private readOnlyProvider: ethers.JsonRpcProvider;

  constructor() {
    this.readOnlyProvider = new ethers.JsonRpcProvider(FLOW_CHAIN_RPC);
    this.contract = new ethers.Contract(
      LENDING_CONTRACT_ADDRESS,
      LENDING_ABI,
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

    return new ethers.Contract(LENDING_CONTRACT_ADDRESS, LENDING_ABI, signer);
  }

  /**
   * Deposit tokens to earn interest
   */
  async deposit(token: string, amount: string): Promise<{ txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      // First approve the lending contract to spend tokens
      const tokenContract = new ethers.Contract(
        token,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        await (await this.getWriteContract()).runner
      );

      const approveTx = await tokenContract.approve(LENDING_CONTRACT_ADDRESS, amount);
      await approveTx.wait();

      // Then deposit
      const tx = await contract.deposit(token, amount);
      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Deposit error:', error);
      throw new Error(error.message || 'Failed to deposit');
    }
  }

  /**
   * Withdraw deposited tokens and earned interest
   */
  async withdraw(token: string, amount: string = '0'): Promise<{ txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.withdraw(token, amount);
      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Withdraw error:', error);
      throw new Error(error.message || 'Failed to withdraw');
    }
  }

  /**
   * Borrow tokens by providing collateral
   */
  async borrow(token: string, amount: string, collateral: string): Promise<{ txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      const tx = await contract.borrow(token, amount, {
        value: collateral
      });

      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Borrow error:', error);
      throw new Error(error.message || 'Failed to borrow');
    }
  }

  /**
   * Repay borrowed tokens
   */
  async repay(token: string, amount: string = '0'): Promise<{ txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      // First approve the lending contract to spend tokens
      const tokenContract = new ethers.Contract(
        token,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        await (await this.getWriteContract()).runner
      );

      const approveTx = await tokenContract.approve(LENDING_CONTRACT_ADDRESS, amount);
      await approveTx.wait();

      // Then repay
      const tx = await contract.repay(token, amount);
      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Repay error:', error);
      throw new Error(error.message || 'Failed to repay');
    }
  }

  /**
   * Liquidate an undercollateralized loan
   */
  async liquidate(borrower: string, token: string): Promise<{ txHash: string }> {
    try {
      const contract = await this.getWriteContract();

      // Get loan info first to know repayment amount
      const loanInfo = await this.getUserLoan(token, borrower);
      const totalDebt = BigInt(loanInfo.borrowed) + BigInt(loanInfo.interest);

      // Approve repayment amount
      const tokenContract = new ethers.Contract(
        token,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        await (await this.getWriteContract()).runner
      );

      const approveTx = await tokenContract.approve(LENDING_CONTRACT_ADDRESS, totalDebt);
      await approveTx.wait();

      // Liquidate
      const tx = await contract.liquidate(borrower, token);
      const receipt = await tx.wait();

      return { txHash: receipt.hash };
    } catch (error: any) {
      console.error('Liquidate error:', error);
      throw new Error(error.message || 'Failed to liquidate');
    }
  }

  /**
   * Get user deposit information
   */
  async getUserDeposit(token: string, userAddress: string): Promise<UserDeposit> {
    try {
      const deposit = await this.contract.getUserDeposit(token, userAddress);

      return {
        amount: deposit.amount.toString(),
        interest: deposit.interest.toString()
      };
    } catch (error: any) {
      console.error('Get user deposit error:', error);
      throw new Error('Failed to get user deposit');
    }
  }

  /**
   * Get user loan information
   */
  async getUserLoan(token: string, userAddress: string): Promise<UserLoan> {
    try {
      const loan = await this.contract.getUserLoan(token, userAddress);

      return {
        borrowed: loan.borrowed.toString(),
        collateral: loan.collateral.toString(),
        interest: loan.interest.toString()
      };
    } catch (error: any) {
      console.error('Get user loan error:', error);
      throw new Error('Failed to get user loan');
    }
  }

  /**
   * Get pool information
   */
  async getPool(token: string): Promise<Pool> {
    try {
      const pool = await this.contract.pools(token);

      return {
        totalSupply: pool.totalSupply.toString(),
        totalBorrowed: pool.totalBorrowed.toString(),
        interestRate: Number(pool.interestRate),
        lastUpdateTime: Number(pool.lastUpdateTime),
        isActive: pool.isActive
      };
    } catch (error: any) {
      console.error('Get pool error:', error);
      throw new Error('Failed to get pool');
    }
  }

  /**
   * Get pool utilization rate
   */
  async getPoolUtilization(token: string): Promise<number> {
    try {
      const utilization = await this.contract.getPoolUtilization(token);
      return Number(utilization);
    } catch (error: any) {
      console.error('Get pool utilization error:', error);
      throw new Error('Failed to get pool utilization');
    }
  }

  /**
   * Get all supported tokens
   */
  async getSupportedTokens(): Promise<string[]> {
    try {
      return await this.contract.getSupportedTokens();
    } catch (error: any) {
      console.error('Get supported tokens error:', error);
      throw new Error('Failed to get supported tokens');
    }
  }

  /**
   * Get user's total position (deposits + loans) across all tokens
   */
  async getUserTotalPosition(userAddress: string): Promise<{
    deposits: Array<{ token: string; amount: string; interest: string }>;
    loans: Array<{ token: string; borrowed: string; collateral: string; interest: string }>;
  }> {
    try {
      const tokens = await this.getSupportedTokens();

      const deposits = [];
      const loans = [];

      for (const token of tokens) {
        const deposit = await this.getUserDeposit(token, userAddress);
        if (BigInt(deposit.amount) > 0) {
          deposits.push({
            token,
            amount: deposit.amount,
            interest: deposit.interest
          });
        }

        const loan = await this.getUserLoan(token, userAddress);
        if (BigInt(loan.borrowed) > 0) {
          loans.push({
            token,
            borrowed: loan.borrowed,
            collateral: loan.collateral,
            interest: loan.interest
          });
        }
      }

      return { deposits, loans };
    } catch (error: any) {
      console.error('Get user total position error:', error);
      throw new Error('Failed to get user total position');
    }
  }

  /**
   * Calculate health factor for a loan
   * Health factor = (collateral value) / (borrowed value + interest)
   */
  calculateHealthFactor(collateral: string, borrowed: string, interest: string): number {
    try {
      const collateralBN = BigInt(collateral);
      const totalDebt = BigInt(borrowed) + BigInt(interest);

      if (totalDebt === BigInt(0)) return Infinity;

      // Health factor as percentage
      return Number((collateralBN * BigInt(100)) / totalDebt);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if a loan can be liquidated
   * Liquidation threshold is 80% (health factor < 80)
   */
  canBeLiquidated(healthFactor: number): boolean {
    return healthFactor < 80 && healthFactor > 0;
  }

  /**
   * Calculate APY for deposits
   */
  async calculateDepositAPY(token: string): Promise<number> {
    try {
      const pool = await this.getPool(token);
      const utilization = await this.getPoolUtilization(token);

      // Simple APY calculation: base rate * utilization rate
      const apy = (Number(pool.interestRate) * utilization) / 10000;

      return apy;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate borrow APY
   */
  async calculateBorrowAPY(token: string): Promise<number> {
    try {
      const pool = await this.getPool(token);
      return Number(pool.interestRate) / 100; // Convert basis points to percentage
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format token amount with decimals
   */
  formatAmount(amount: string, decimals: number = 18): string {
    try {
      return ethers.formatUnits(amount, decimals);
    } catch (error) {
      return '0';
    }
  }

  /**
   * Parse token amount to Wei
   */
  parseAmount(amount: string, decimals: number = 18): string {
    try {
      return ethers.parseUnits(amount, decimals).toString();
    } catch (error) {
      return '0';
    }
  }
}

// Export singleton instance
export const lendingService = new LendingService();
