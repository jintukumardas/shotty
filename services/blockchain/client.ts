// Flow Network EVM Client Service
import { ethers } from 'ethers';

export class FlowEvmClient {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null = null;

  constructor() {
    // Use the Flow EVM RPC endpoint from environment or default to testnet
    const rpcUrl = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org';

    console.log('Connecting to Flow EVM RPC:', rpcUrl);
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async initialize() {
    try {
      console.log('Flow EVM client initialized');
      return this;
    } catch (error) {
      console.error('Failed to initialize Flow EVM client:', error);
      throw error;
    }
  }

  async connectWallet(privateKeyOrProvider?: string | any) {
    try {
      let address: string = '';

      if (typeof privateKeyOrProvider === 'string') {
        // Connect with private key (for server-side operations)
        console.log('Connecting with private key...');
        this.signer = new ethers.Wallet(privateKeyOrProvider, this.provider);
        address = await this.signer.getAddress();
      } else if (privateKeyOrProvider) {
        // Connect with external provider (MetaMask, etc.)
        console.log('Connecting with browser wallet (EIP-1193 provider)...');

        // The provider is an EIP-1193 compatible provider (window.ethereum)
        const web3Provider = new ethers.BrowserProvider(privateKeyOrProvider);
        this.signer = await web3Provider.getSigner();
        address = await this.signer.getAddress();

        // Get chain info
        const network = await web3Provider.getNetwork();
        const chainId = Number(network.chainId);
        console.log('Detected chain ID:', chainId);

        // Verify we're on Flow EVM
        if (chainId !== 545 && chainId !== 747) {
          console.warn(`Warning: Connected to chain ${chainId}, but Flow EVM Testnet is 545 and Mainnet is 747`);
        }

        console.log('Browser wallet connected');
        console.log('  Address:', address);
        console.log('  Chain:', this.getChainName(chainId));
      }

      console.log('✅ Wallet connected:', address);
      return address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  async sendTransaction(to: string, value: string, data?: string) {
    if (!this.signer) {
      throw new Error('No signer available. Please connect wallet first.');
    }

    try {
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.parseEther(value),
        data: data || '0x',
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt?.hash);

      return receipt;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }

  async deployContract(bytecode: string, abi: any[], args: any[] = []) {
    if (!this.signer) {
      throw new Error('No signer available. Please connect wallet first.');
    }

    try {
      const factory = new ethers.ContractFactory(abi, bytecode, this.signer);
      const contract = await factory.deploy(...args);
      await contract.waitForDeployment();

      const address = await contract.getAddress();
      console.log('Contract deployed at:', address);

      return contract;
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      throw error;
    }
  }

  async getContract(address: string, abi: any[]) {
    const signerOrProvider = this.signer || this.provider;
    return new ethers.Contract(address, abi, signerOrProvider);
  }

  /**
   * Execute a standard EVM transaction on Flow Network
   */
  async executeTransaction(params: {
    to: string;
    value?: bigint;
    data?: string;
  }) {
    try {
      console.log('🔍 executeTransaction called with params:', {
        to: params.to,
        value: params.value?.toString(),
        data: params.data,
      });

      if (!ethers.isAddress(params.to)) {
        throw new Error('Invalid "to" address');
      }

      // Ensure proper hex format with 0x prefix and normalize to checksum format
      let toAddress = params.to.trim();
      if (!toAddress.startsWith('0x')) {
        toAddress = '0x' + toAddress;
      }

      // Validate it's exactly 42 characters (0x + 40 hex chars)
      if (!/^0x[a-fA-F0-9]{40}$/i.test(toAddress)) {
        throw new Error('Invalid "to" address format: must be 0x followed by 40 hex characters');
      }

      // Get the checksummed address for maximum compatibility
      const checksummedAddress = ethers.getAddress(toAddress);

      if (!this.signer) {
        throw new Error('No signer available. Please connect wallet first.');
      }

      // Get current chain ID
      const network = await this.signer.provider?.getNetwork();
      const currentChainId = network ? Number(network.chainId) : null;
      console.log('🔍 Current Chain ID:', currentChainId, `(${this.getChainName(currentChainId)})`);

      // Build transaction
      const tx: any = {
        to: checksummedAddress,
        value: params.value || BigInt(0),
      };

      // Only add data if provided and not empty
      if (params.data && params.data.trim().length > 2) {
        tx.data = params.data;
      }

      console.log('📤 Sending transaction on Flow EVM:', tx);
      const txResponse = await this.signer.sendTransaction(tx);
      console.log('⏳ Transaction sent, waiting for confirmation:', txResponse.hash);

      const receipt = await txResponse.wait();
      console.log('✅ Transaction confirmed:', receipt?.hash);

      return txResponse.hash;
    } catch (error) {
      console.error('❌ Failed to execute transaction:', error);
      throw error;
    }
  }

  private getChainName(chainId: number | null | undefined): string {
    if (!chainId) return 'Unknown Chain';
    const chains: Record<number, string> = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      545: 'Flow EVM Testnet',
      747: 'Flow EVM Mainnet',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
    };
    return chains[chainId] || `Chain ${chainId}`;
  }

  async signMessage(message: string) {
    if (!this.signer) {
      throw new Error('No signer available. Please connect wallet first.');
    }

    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  getSigner() {
    return this.signer;
  }

  getProvider() {
    return this.provider;
  }

  isInitialized() {
    return true; // Always initialized for standard EVM client
  }

  hasWallet() {
    return this.signer !== null;
  }
}

// Singleton instance
let flowEvmClient: FlowEvmClient | null = null;

export function getFlowEvmClient(): FlowEvmClient {
  if (!flowEvmClient) {
    flowEvmClient = new FlowEvmClient();
  }
  return flowEvmClient;
}
