import { ethers } from 'ethers';
import { getFlowEvmClient } from '../blockchain/client';

// Import the contract ABI (will be generated after compilation)
import UniversalNFTArtifact from '../../artifacts/contracts/UniversalNFT.sol/UniversalNFT.json';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface NFTDetails {
  tokenId: number;
  owner: string;
  creator: string;
  uri: string;
  metadata?: NFTMetadata;
}

export interface MintNFTParams {
  to: string;
  uri: string;
}

export interface TransferNFTParams {
  from: string;
  to: string;
  tokenId: number;
}

/**
 * NFT Service for interacting with UniversalNFT contract
 */
export class NFTService {
  private readOnlyContract: ethers.Contract | null = null;
  private writeContract: ethers.Contract | null = null;
  private contractAddress: string;

  constructor(contractAddress: string) {
    this.contractAddress = contractAddress;
  }

  /**
   * Initialize the NFT contract
   * @param readOnly - If true, creates contract with provider only (for queries)
   */
  private async getContract(readOnly: boolean = false): Promise<ethers.Contract> {
    // For read-only operations, use Flow EVM RPC provider
    if (readOnly) {
      if (!this.readOnlyContract) {
        const rpcUrl = process.env.NEXT_PUBLIC_FLOW_EVM_RPC || 'https://evm.rpc-testnet-donut-node2.flow.org/';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        this.readOnlyContract = new ethers.Contract(
          this.contractAddress,
          UniversalNFTArtifact.abi,
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
        UniversalNFTArtifact.abi,
        signer
      );

      return this.writeContract;
    }
  }

  /**
   * Mint a new NFT
   */
  async mintNFT(params: MintNFTParams): Promise<{
    tokenId: number;
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      // Validate address
      if (!ethers.isAddress(params.to)) {
        throw new Error('Invalid recipient address');
      }

      // Execute mint transaction
      const tx = await contract.mintNFT(params.to, params.uri);
      const receipt = await tx.wait();

      // Parse the NFTMinted event to get tokenId
      const event = receipt.logs.find(
        (log: any) => log.fragment && log.fragment.name === 'NFTMinted'
      );

      const tokenId = event ? Number(event.args[0]) : 0;

      return {
        tokenId,
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw error;
    }
  }

  /**
   * Batch mint multiple NFTs
   */
  async batchMintNFT(
    to: string,
    uris: string[]
  ): Promise<{
    tokenIds: number[];
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      if (!ethers.isAddress(to)) {
        throw new Error('Invalid recipient address');
      }

      const tx = await contract.batchMintNFT(to, uris);
      const receipt = await tx.wait();

      // Parse events to get all token IDs
      const events = receipt.logs.filter(
        (log: any) => log.fragment && log.fragment.name === 'NFTMinted'
      );

      const tokenIds = events.map((event: any) => Number(event.args[0]));

      return {
        tokenIds,
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error batch minting NFTs:', error);
      throw error;
    }
  }

  /**
   * Transfer an NFT
   */
  async transferNFT(params: TransferNFTParams): Promise<{
    txHash: string;
  }> {
    try {
      const contract = await this.getContract();

      if (!ethers.isAddress(params.from) || !ethers.isAddress(params.to)) {
        throw new Error('Invalid address');
      }

      const tx = await contract.transferNFT(
        params.from,
        params.to,
        params.tokenId
      );
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
      };
    } catch (error) {
      console.error('Error transferring NFT:', error);
      throw error;
    }
  }

  /**
   * Get NFTs owned by an address
   */
  async getOwnedNFTs(owner: string): Promise<NFTDetails[]> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);

      if (!ethers.isAddress(owner)) {
        throw new Error('Invalid owner address');
      }

      const tokenIds = await contract.getOwnedNFTs(owner);

      // Fetch details for each token
      const nftDetails = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          const details = await this.getNFTDetails(Number(tokenId));
          return details;
        })
      );

      return nftDetails;
    } catch (error) {
      console.error('Error getting owned NFTs:', error);
      throw error;
    }
  }

  /**
   * Get NFTs created by an address
   */
  async getCreatedNFTs(creator: string): Promise<NFTDetails[]> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);

      if (!ethers.isAddress(creator)) {
        throw new Error('Invalid creator address');
      }

      const tokenIds = await contract.getCreatedNFTs(creator);

      const nftDetails = await Promise.all(
        tokenIds.map(async (tokenId: bigint) => {
          const details = await this.getNFTDetails(Number(tokenId));
          return details;
        })
      );

      return nftDetails;
    } catch (error) {
      console.error('Error getting created NFTs:', error);
      throw error;
    }
  }

  /**
   * Get NFT details
   */
  async getNFTDetails(tokenId: number): Promise<NFTDetails> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);

      const [owner, creator, uri] = await contract.getNFTDetails(tokenId);

      // Optionally fetch metadata from URI
      let metadata: NFTMetadata | undefined;
      try {
        if (uri.startsWith('http') || uri.startsWith('ipfs://')) {
          const metadataUrl = uri.startsWith('ipfs://')
            ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
            : uri;

          const response = await fetch(metadataUrl);
          if (response.ok) {
            metadata = await response.json();
          }
        }
      } catch (error) {
        console.warn('Could not fetch metadata for token', tokenId);
      }

      return {
        tokenId,
        owner,
        creator,
        uri,
        metadata,
      };
    } catch (error) {
      console.error('Error getting NFT details:', error);
      throw error;
    }
  }

  /**
   * Get total number of NFTs minted
   */
  async getTotalMinted(): Promise<number> {
    try {
      // Use read-only contract for queries
      const contract = await this.getContract(true);
      const total = await contract.totalMinted();
      return Number(total);
    } catch (error) {
      console.error('Error getting total minted:', error);
      throw error;
    }
  }

  /**
   * Check if an address owns a specific NFT
   */
  async ownsNFT(address: string, tokenId: number): Promise<boolean> {
    try {
      const details = await this.getNFTDetails(tokenId);
      return details.owner.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }
}

/**
 * Get NFT service instance
 */
export function getNFTService(): NFTService {
  const contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '';

  if (!contractAddress) {
    throw new Error('NFT contract address not configured');
  }

  return new NFTService(contractAddress);
}

/**
 * Utility: Upload metadata to IPFS via Pinata
 */
export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  try {
    const { getPinataService } = await import('../ipfs/pinataService');
    const pinata = getPinataService();

    if (!pinata.isConfigured()) {
      console.warn('Pinata not configured, using data URI fallback');
      const jsonString = JSON.stringify(metadata);
      const base64 = Buffer.from(jsonString).toString('base64');
      return `data:application/json;base64,${base64}`;
    }

    const result = await pinata.uploadMetadata(metadata);
    return result.ipfsUrl;
  } catch (error) {
    console.error('Error uploading metadata to Pinata:', error);
    // Fallback to data URI
    const jsonString = JSON.stringify(metadata);
    const base64 = Buffer.from(jsonString).toString('base64');
    return `data:application/json;base64,${base64}`;
  }
}

/**
 * Utility: Create metadata object
 */
export function createNFTMetadata(
  name: string,
  description: string,
  image: string,
  attributes?: Array<{ trait_type: string; value: string | number }>
): NFTMetadata {
  return {
    name,
    description,
    image,
    attributes,
  };
}

/**
 * Upload NFT with image file to IPFS
 */
export async function uploadNFTWithImage(
  imageFile: File,
  name: string,
  description: string,
  attributes?: Array<{ trait_type: string; value: string | number }>
): Promise<{ metadataUri: string; imageUri: string }> {
  try {
    const { getPinataService } = await import('../ipfs/pinataService');
    const pinata = getPinataService();

    if (!pinata.isConfigured()) {
      throw new Error('Pinata is not configured. Please add NEXT_PUBLIC_PINATA_JWT to your environment variables.');
    }

    // Upload image and metadata together
    const result = await pinata.createNFT(imageFile, name, description, attributes);

    return {
      metadataUri: result.metadataUri,
      imageUri: result.imageUri,
    };
  } catch (error) {
    console.error('Error uploading NFT with image:', error);
    throw error;
  }
}
