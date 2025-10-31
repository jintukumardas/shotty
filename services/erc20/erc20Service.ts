/**
 * ERC20 Token Service
 * Handles ERC20 token creation, management, and queries
 */

import { ethers, Contract } from 'ethers';

// Contract addresses (will be set after deployment)
const FACTORY_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ERC20_FACTORY_ADDRESS || '';
const PUSH_CHAIN_RPC = process.env.NEXT_PUBLIC_PUSH_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org/';

// ABI for ERC20 Token Factory
const FACTORY_ABI = [
  "event TokenCreated(address indexed tokenAddress, address indexed creator, string name, string symbol, uint256 totalSupply, uint8 decimals, uint256 timestamp)",
  "function createToken(string memory name, string memory symbol, uint256 initialSupply, uint8 decimals) external returns (address)",
  "function getCreatorTokens(address creator) external view returns (address[] memory)",
  "function getCreatorTokensInfo(address creator) external view returns (tuple(address tokenAddress, address creator, string name, string symbol, uint256 totalSupply, uint8 decimals, uint256 createdAt)[] memory)",
  "function getTokenInfo(address tokenAddress) external view returns (tuple(address tokenAddress, address creator, string name, string symbol, uint256 totalSupply, uint8 decimals, uint256 createdAt))",
  "function getTotalTokensCreated() external view returns (uint256)",
  "function getAllTokens() external view returns (address[] memory)"
];

// ABI for individual ERC20 tokens
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function owner() view returns (address)",
  "function transferOwnership(address newOwner)",
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

export interface TokenInfo {
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  totalSupply: string;
  decimals: number;
  createdAt: number;
}

export interface TokenBalance {
  tokenAddress: string;
  name: string;
  symbol: string;
  balance: string;
  decimals: number;
}

/**
 * ERC20 Service Class
 */
export class ERC20Service {
  private factoryContract: Contract;
  private readOnlyProvider: ethers.JsonRpcProvider;

  constructor() {
    this.readOnlyProvider = new ethers.JsonRpcProvider(PUSH_CHAIN_RPC);

    // Initialize read-only factory contract
    this.factoryContract = new ethers.Contract(
      FACTORY_CONTRACT_ADDRESS,
      FACTORY_ABI,
      this.readOnlyProvider
    );
  }

  /**
   * Get a signer-connected factory contract for write operations
   */
  private async getWriteContract(): Promise<Contract> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask or compatible wallet not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum!);
    const signer = await provider.getSigner();

    return new ethers.Contract(
      FACTORY_CONTRACT_ADDRESS,
      FACTORY_ABI,
      signer
    );
  }

  /**
   * Get a token contract instance
   */
  private getTokenContract(tokenAddress: string, withSigner: boolean = false): Promise<Contract> | Contract {
    if (withSigner) {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask or compatible wallet not found');
      }
      return (async () => {
        const provider = new ethers.BrowserProvider(window.ethereum!);
        const signer = await provider.getSigner();
        return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      })();
    }

    return new ethers.Contract(tokenAddress, ERC20_ABI, this.readOnlyProvider);
  }

  /**
   * Create a new ERC20 token
   */
  async createToken(params: {
    name: string;
    symbol: string;
    initialSupply: number;
    decimals?: number;
  }): Promise<{ tokenAddress: string; txHash: string }> {
    try {
      const { name, symbol, initialSupply, decimals = 18 } = params;

      // Validate inputs
      if (!name || !symbol || !initialSupply) {
        throw new Error('Missing required parameters');
      }

      if (initialSupply <= 0) {
        throw new Error('Initial supply must be greater than 0');
      }

      if (decimals > 18 || decimals < 0) {
        throw new Error('Decimals must be between 0 and 18');
      }

      const factoryContract = await this.getWriteContract();

      // Create the token
      const tx = await factoryContract.createToken(
        name,
        symbol,
        initialSupply,
        decimals
      );

      console.log('Token creation transaction sent:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('Token creation confirmed:', receipt);

      // Find the TokenCreated event to get the token address
      const event = receipt.logs.find((log: any) => {
        try {
          const parsedLog = factoryContract.interface.parseLog(log);
          return parsedLog?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('Token creation event not found');
      }

      const parsedEvent = factoryContract.interface.parseLog(event);
      const tokenAddress = parsedEvent?.args[0];

      return {
        tokenAddress,
        txHash: tx.hash,
      };
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }

  /**
   * Get all tokens created by a specific address
   */
  async getCreatorTokens(creatorAddress: string): Promise<TokenInfo[]> {
    try {
      const tokens = await this.factoryContract.getCreatorTokensInfo(creatorAddress);

      return tokens.map((token: any) => ({
        tokenAddress: token.tokenAddress,
        creator: token.creator,
        name: token.name,
        symbol: token.symbol,
        totalSupply: ethers.formatUnits(token.totalSupply, token.decimals),
        decimals: Number(token.decimals),
        createdAt: Number(token.createdAt),
      }));
    } catch (error) {
      console.error('Error fetching creator tokens:', error);
      throw error;
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      const info = await this.factoryContract.getTokenInfo(tokenAddress);

      return {
        tokenAddress: info.tokenAddress,
        creator: info.creator,
        name: info.name,
        symbol: info.symbol,
        totalSupply: ethers.formatUnits(info.totalSupply, info.decimals),
        decimals: Number(info.decimals),
        createdAt: Number(info.createdAt),
      };
    } catch (error) {
      console.error('Error fetching token info:', error);
      throw error;
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<TokenBalance> {
    try {
      const tokenContract = this.getTokenContract(tokenAddress) as Contract;

      const [name, symbol, decimals, balance] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.balanceOf(userAddress),
      ]);

      return {
        tokenAddress,
        name,
        symbol,
        balance: ethers.formatUnits(balance, decimals),
        decimals: Number(decimals),
      };
    } catch (error) {
      console.error('Error fetching token balance:', error);
      throw error;
    }
  }

  /**
   * Transfer ERC20 tokens to another address
   */
  async transferTokens(tokenAddress: string, to: string, amount: string): Promise<{ txHash: string }> {
    try {
      if (!ethers.isAddress(to)) {
        throw new Error('Invalid recipient address');
      }

      const tokenContract = await this.getTokenContract(tokenAddress, true) as Contract;

      // Get token decimals
      const decimals = await tokenContract.decimals();

      // Convert amount to wei format
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await tokenContract.transfer(to, amountInWei);

      console.log('Token transfer transaction sent:', tx.hash);

      await tx.wait();

      return { txHash: tx.hash };
    } catch (error) {
      console.error('Error transferring tokens:', error);
      throw error;
    }
  }

  /**
   * Transfer token ownership to a new address
   */
  async transferOwnership(tokenAddress: string, newOwner: string): Promise<{ txHash: string }> {
    try {
      if (!ethers.isAddress(newOwner)) {
        throw new Error('Invalid new owner address');
      }

      const tokenContract = await this.getTokenContract(tokenAddress, true) as Contract;

      const tx = await tokenContract.transferOwnership(newOwner);

      console.log('Ownership transfer transaction sent:', tx.hash);

      await tx.wait();

      return { txHash: tx.hash };
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  }

  /**
   * Get the current owner of a token
   */
  async getTokenOwner(tokenAddress: string): Promise<string> {
    try {
      const tokenContract = this.getTokenContract(tokenAddress) as Contract;
      return await tokenContract.owner();
    } catch (error) {
      console.error('Error fetching token owner:', error);
      throw error;
    }
  }

  /**
   * Check if factory contract is configured
   */
  static isConfigured(): boolean {
    return !!FACTORY_CONTRACT_ADDRESS && FACTORY_CONTRACT_ADDRESS !== '';
  }
}

// Singleton instance
let erc20ServiceInstance: ERC20Service | null = null;

export function getERC20Service(): ERC20Service {
  if (!ERC20Service.isConfigured()) {
    throw new Error('ERC20 Factory contract address not configured. Please deploy the contract and set NEXT_PUBLIC_ERC20_FACTORY_ADDRESS in your environment variables.');
  }

  if (!erc20ServiceInstance) {
    erc20ServiceInstance = new ERC20Service();
  }

  return erc20ServiceInstance;
}
