import { ethers } from 'ethers';
import { getFlowEvmClient } from '../blockchain/client';

// Import the contract ABI
import DomainRegistryArtifact from '../../artifacts/contracts/DomainRegistry.sol/DomainRegistry.json';

export interface Domain {
  name: string;
  owner: string;
  chainId: number;
  resolvedAddress: string;
  registeredAt: number;
  expiresAt: number;
  metadata: string;
  active: boolean;
}

export interface RegisterDomainParams {
  domainName: string;
  chainId: number;
  resolvedAddress: string;
  metadata?: string;
}

export interface BatchRegisterParams {
  domainNames: string[];
  chainIds: number[];
  resolvedAddresses: string[];
  metadatas?: string[];
}

export interface UpdateResolutionParams {
  domainName: string;
  newChainId: number;
  newAddress: string;
}

/**
 * Domain Service for interacting with DomainRegistry contract
 */
export class DomainService {
  private readOnlyContract: ethers.Contract | null = null;
  private writeContract: ethers.Contract | null = null;
  private contractAddress: string;

  constructor(contractAddress: string) {
    this.contractAddress = contractAddress;
  }

  /**
   * Initialize the Domain Registry contract
   * @param readOnly - If true, creates contract with provider only (for queries)
   */
  private async getContract(readOnly: boolean = false): Promise<ethers.Contract> {
    // For read-only operations, use Flow EVM RPC provider
    if (readOnly) {
      if (!this.readOnlyContract) {
        const rpcUrl = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        this.readOnlyContract = new ethers.Contract(
          this.contractAddress,
          DomainRegistryArtifact.abi,
          provider
        );
      }
      return this.readOnlyContract;
    } else {
      // For write operations, use browser wallet (window.ethereum)
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error('No browser wallet detected. Please connect your wallet.');
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // Don't cache writeContract, always get fresh signer
      this.writeContract = new ethers.Contract(
        this.contractAddress,
        DomainRegistryArtifact.abi,
        signer
      );

      return this.writeContract;
    }
  }

  /**
   * Get current registration fee
   */
  async getRegistrationFee(): Promise<string> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);
      const fee = await contract.registrationFee();
      return ethers.formatEther(fee);
    } catch (error) {
      console.error('Error getting registration fee:', error);
      throw error;
    }
  }

  /**
   * Check if domain is available
   */
  async isDomainAvailable(domainName: string): Promise<boolean> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);
      return await contract.isDomainAvailable(domainName);
    } catch (error) {
      console.error('Error checking domain availability:', error);
      throw error;
    }
  }

  /**
   * Register a new domain
   */
  async registerDomain(params: RegisterDomainParams): Promise<{
    domainHash: string;
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      // Validate address
      if (!ethers.isAddress(params.resolvedAddress)) {
        throw new Error('Invalid resolved address');
      }

      // Check if domain is available
      const available = await this.isDomainAvailable(params.domainName);
      if (!available) {
        throw new Error('Domain is not available');
      }

      // Get registration fee
      const fee = await contract.registrationFee();

      // Execute registration transaction
      const metadata = params.metadata || JSON.stringify({
        registeredBy: 'AI Butler',
        timestamp: Date.now(),
      });

      const tx = await contract.registerDomain(
        params.domainName,
        params.chainId,
        params.resolvedAddress,
        metadata,
        { value: fee }
      );

      const receipt = await tx.wait();

      // Parse the DomainRegistered event to get domainHash
      const event = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'DomainRegistered'
      );

      const domainHash = event ? event.args[0] : '';

      return {
        domainHash,
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error registering domain:', error);
      throw error;
    }
  }

  /**
   * Batch register multiple domains
   */
  async batchRegisterDomains(params: BatchRegisterParams): Promise<{
    domainHashes: string[];
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      // Validate inputs
      const { domainNames, chainIds, resolvedAddresses } = params;

      if (
        domainNames.length !== chainIds.length ||
        chainIds.length !== resolvedAddresses.length
      ) {
        throw new Error('Array length mismatch');
      }

      // Validate addresses
      for (const addr of resolvedAddresses) {
        if (!ethers.isAddress(addr)) {
          throw new Error(`Invalid address: ${addr}`);
        }
      }

      // Check all domains are available
      for (const name of domainNames) {
        const available = await this.isDomainAvailable(name);
        if (!available) {
          throw new Error(`Domain not available: ${name}`);
        }
      }

      // Get registration fee
      const fee = await contract.registrationFee();
      const totalFee = fee * BigInt(domainNames.length);

      // Prepare metadatas
      const metadatas = params.metadatas || domainNames.map((name) =>
        JSON.stringify({
          name,
          registeredBy: 'AI Butler',
          timestamp: Date.now(),
        })
      );

      const tx = await contract.batchRegisterDomains(
        domainNames,
        chainIds,
        resolvedAddresses,
        metadatas,
        { value: totalFee }
      );

      const receipt = await tx.wait();

      // Parse events to get all domain hashes
      const events = receipt.logs.filter(
        (log: any) => log.fragment && log.fragment.name === 'DomainRegistered'
      );

      const domainHashes = events.map((event: any) => event.args[0]);

      return {
        domainHashes,
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error batch registering domains:', error);
      throw error;
    }
  }

  /**
   * Resolve a domain to get chain and address
   */
  async resolveDomain(domainName: string): Promise<{
    chainId: number;
    resolvedAddress: string;
  }> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);

      const [chainId, resolvedAddress] = await contract.resolveDomain(
        domainName
      );

      return {
        chainId: Number(chainId),
        resolvedAddress,
      };
    } catch (error) {
      console.error('Error resolving domain:', error);
      throw error;
    }
  }

  /**
   * Update domain resolution
   */
  async updateDomainResolution(params: UpdateResolutionParams): Promise<{
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      if (!ethers.isAddress(params.newAddress)) {
        throw new Error('Invalid address');
      }

      const tx = await contract.updateDomainResolution(
        params.domainName,
        params.newChainId,
        params.newAddress
      );

      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error updating domain resolution:', error);
      throw error;
    }
  }

  /**
   * Transfer domain ownership
   */
  async transferDomain(
    domainName: string,
    newOwner: string
  ): Promise<{
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      if (!ethers.isAddress(newOwner)) {
        throw new Error('Invalid new owner address');
      }

      const tx = await contract.transferDomain(domainName, newOwner);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error transferring domain:', error);
      throw error;
    }
  }

  /**
   * Renew domain registration
   */
  async renewDomain(domainName: string): Promise<{
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      const fee = await contract.registrationFee();

      const tx = await contract.renewDomain(domainName, { value: fee });
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error renewing domain:', error);
      throw error;
    }
  }

  /**
   * Update domain metadata
   */
  async updateDomainMetadata(
    domainName: string,
    metadata: Record<string, any>
  ): Promise<{
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      const metadataString = JSON.stringify(metadata);

      const tx = await contract.updateDomainMetadata(
        domainName,
        metadataString
      );
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error updating domain metadata:', error);
      throw error;
    }
  }

  /**
   * Get domains owned by an address
   */
  async getOwnedDomains(owner: string): Promise<Domain[]> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);

      if (!ethers.isAddress(owner)) {
        throw new Error('Invalid owner address');
      }

      const domainHashes = await contract.getOwnedDomains(owner);

      // Fetch details for each domain
      const domains = await Promise.all(
        domainHashes.map(async (hash: string) => {
          const domainData = await contract.domains(hash);
          return this.parseDomainData(domainData);
        })
      );

      return domains;
    } catch (error) {
      console.error('Error getting owned domains:', error);
      throw error;
    }
  }

  /**
   * Get domain details
   */
  async getDomainDetails(domainName: string): Promise<Domain> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);

      const domainData = await contract.getDomainDetails(domainName);
      return this.parseDomainData(domainData);
    } catch (error) {
      console.error('Error getting domain details:', error);
      throw error;
    }
  }

  /**
   * Check if domain exists
   */
  async domainExists(domainName: string): Promise<boolean> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);
      return await contract.domainExists(domainName);
    } catch (error) {
      console.error('Error checking domain existence:', error);
      return false;
    }
  }

  /**
   * Get domain hash
   */
  getDomainHash(domainName: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(domainName));
  }

  /**
   * Parse domain data from contract
   */
  private parseDomainData(domainData: any): Domain {
    return {
      name: domainData.name,
      owner: domainData.owner,
      chainId: Number(domainData.chainId),
      resolvedAddress: domainData.resolvedAddress,
      registeredAt: Number(domainData.registeredAt),
      expiresAt: Number(domainData.expiresAt),
      metadata: domainData.metadata,
      active: domainData.active,
    };
  }

  /**
   * Format domain info for display
   */
  formatDomainInfo(domain: Domain): string {
    const now = Math.floor(Date.now() / 1000);
    const daysUntilExpiry = Math.floor((domain.expiresAt - now) / 86400);

    return `
Domain: ${domain.name}
Owner: ${domain.owner}
Points to: ${domain.resolvedAddress} on Chain ${domain.chainId}
Expires in: ${daysUntilExpiry} days
Status: ${domain.active ? 'Active' : 'Inactive'}
    `.trim();
  }
}

/**
 * Get Domain service instance
 */
export function getDomainService(): DomainService {
  const contractAddress =
    process.env.NEXT_PUBLIC_DOMAIN_CONTRACT_ADDRESS || '';

  if (!contractAddress) {
    throw new Error('Domain contract address not configured');
  }

  return new DomainService(contractAddress);
}

/**
 * Utility: Validate domain name format
 * Returns an object with validation result and error message
 */
export function isValidDomainName(domainName: string): boolean {
  // Check minimum length
  if (domainName.length < 3) {
    return false;
  }

  // Check if domain ends with .flow
  if (!domainName.endsWith('.flow')) {
    return false;
  }

  // Check if domain contains only lowercase letters, numbers, hyphens, and dots
  const lowercaseRegex = /^[a-z0-9][a-z0-9-_.]*[a-z0-9]$/;
  if (!lowercaseRegex.test(domainName)) {
    return false;
  }

  return true;
}

/**
 * Utility: Validate domain name and return detailed error message
 */
export function validateDomainName(domainName: string): {
  valid: boolean;
  error?: string;
} {
  // Check minimum length
  if (domainName.length < 3) {
    return {
      valid: false,
      error: 'Domain name must be at least 3 characters long',
    };
  }

  // Check if domain ends with .flow
  if (!domainName.endsWith('.flow')) {
    return {
      valid: false,
      error: 'Invalid domain name. Only .flow domains are allowed (e.g., myname.flow)',
    };
  }

  // Check if domain contains only lowercase letters
  const hasUppercase = /[A-Z]/.test(domainName);
  if (hasUppercase) {
    return {
      valid: false,
      error: 'Domain name must be all lowercase. Please use lowercase letters only (e.g., myname.flow not MyName.flow)',
    };
  }

  // Check if domain contains only valid characters (lowercase letters, numbers, hyphens, dots)
  const lowercaseRegex = /^[a-z0-9][a-z0-9-_.]*[a-z0-9]$/;
  if (!lowercaseRegex.test(domainName)) {
    return {
      valid: false,
      error: 'Domain name contains invalid characters. Use only lowercase letters, numbers, hyphens, and dots (e.g., my-name.flow)',
    };
  }

  return { valid: true };
}

/**
 * Utility: Get chain name from chain ID
 */
export function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    11155111: 'Sepolia',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    8453: 'Base',
    43114: 'Avalanche',
    56: 'BSC',
    250: 'Fantom',
    100: 'Gnosis',
    545: 'Flow EVM Testnet',
  };

  return chainNames[chainId] || `Chain ${chainId}`;
}
