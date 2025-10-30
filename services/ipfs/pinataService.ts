import { PinataSDK } from "pinata";

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Pinata Service for IPFS uploads
 */
export class PinataService {
  private pinata: PinataSDK | null = null;
  private jwt: string;
  private gateway: string;

  constructor() {
    this.jwt = process.env.NEXT_PUBLIC_PINATA_JWT || '';
    this.gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

    if (this.jwt) {
      this.pinata = new PinataSDK({
        pinataJwt: this.jwt,
        pinataGateway: this.gateway,
      });
      console.log('✅ Pinata SDK initialized with gateway:', this.gateway);
    } else {
      console.warn('⚠️ Pinata JWT not configured. IPFS uploads will not work.');
    }
  }

  /**
   * Check if Pinata is configured
   */
  isConfigured(): boolean {
    return !!this.pinata && !!this.jwt;
  }

  /**
   * Upload an image file to IPFS via Pinata
   */
  async uploadImage(file: File): Promise<{
    ipfsHash: string;
    ipfsUrl: string;
    gatewayUrl: string;
  }> {
    if (!this.pinata) {
      throw new Error('Pinata SDK not initialized. Please configure NEXT_PUBLIC_PINATA_JWT');
    }

    try {
      console.log('📤 Uploading image to IPFS via Pinata...');
      console.log('File:', file.name, file.type, file.size);

      // Pinata SDK v2 API
      const upload = await this.pinata.upload.public.file(file);

      console.log('✅ Image uploaded to IPFS:', upload.cid);

      const ipfsHash = upload.cid;
      const ipfsUrl = `ipfs://${ipfsHash}`;
      const gatewayUrl = `https://${this.gateway}/ipfs/${ipfsHash}`;

      return {
        ipfsHash,
        ipfsUrl,
        gatewayUrl,
      };
    } catch (error) {
      console.error('❌ Failed to upload image to IPFS:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload NFT metadata JSON to IPFS via Pinata
   */
  async uploadMetadata(metadata: NFTMetadata): Promise<{
    ipfsHash: string;
    ipfsUrl: string;
    gatewayUrl: string;
  }> {
    if (!this.pinata) {
      throw new Error('Pinata SDK not initialized. Please configure NEXT_PUBLIC_PINATA_JWT');
    }

    try {
      console.log('📤 Uploading metadata to IPFS via Pinata...');
      console.log('Metadata:', metadata);

      // Pinata SDK v2 API
      const upload = await this.pinata.upload.public.json(metadata);

      console.log('✅ Metadata uploaded to IPFS:', upload.cid);

      const ipfsHash = upload.cid;
      const ipfsUrl = `ipfs://${ipfsHash}`;
      const gatewayUrl = `https://${this.gateway}/ipfs/${ipfsHash}`;

      return {
        ipfsHash,
        ipfsUrl,
        gatewayUrl,
      };
    } catch (error) {
      console.error('❌ Failed to upload metadata to IPFS:', error);
      throw new Error(`Failed to upload metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a generic file to IPFS
   */
  async uploadFile(file: File): Promise<{
    ipfsHash: string;
    ipfsUrl: string;
    gatewayUrl: string;
  }> {
    if (!this.pinata) {
      throw new Error('Pinata SDK not initialized. Please configure NEXT_PUBLIC_PINATA_JWT');
    }

    try {
      console.log('📤 Uploading file to IPFS via Pinata...');
      console.log('File:', file.name, file.type, file.size);

      // Pinata SDK v2 API
      const upload = await this.pinata.upload.public.file(file);

      console.log('✅ File uploaded to IPFS:', upload.cid);

      const ipfsHash = upload.cid;
      const ipfsUrl = `ipfs://${ipfsHash}`;
      const gatewayUrl = `https://${this.gateway}/ipfs/${ipfsHash}`;

      return {
        ipfsHash,
        ipfsUrl,
        gatewayUrl,
      };
    } catch (error) {
      console.error('❌ Failed to upload file to IPFS:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert IPFS CID/URL to gateway URL
   */
  async getGatewayUrl(cidOrUrl: string): Promise<string> {
    // Remove ipfs:// prefix if present
    const hash = cidOrUrl.replace('ipfs://', '');
    return `https://${this.gateway}/ipfs/${hash}`;
  }

  /**
   * Get file data from IPFS gateway
   */
  async getFile(cid: string): Promise<any> {
    try {
      const url = await this.getGatewayUrl(cid);
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Failed to get file from IPFS:', error);
      throw error;
    }
  }

  /**
   * Fetch metadata from IPFS
   */
  async fetchMetadata(ipfsUrl: string): Promise<NFTMetadata | null> {
    try {
      const gatewayUrl = await this.getGatewayUrl(ipfsUrl);
      const response = await fetch(gatewayUrl);

      if (!response.ok) {
        console.error('Failed to fetch metadata from IPFS');
        return null;
      }

      const metadata = await response.json();
      return metadata as NFTMetadata;
    } catch (error) {
      console.error('Error fetching metadata from IPFS:', error);
      return null;
    }
  }

  /**
   * Create a complete NFT with image and metadata upload
   */
  async createNFT(
    imageFile: File,
    name: string,
    description: string,
    attributes?: Array<{ trait_type: string; value: string | number }>
  ): Promise<{
    metadataUri: string;
    imageUri: string;
    metadata: NFTMetadata;
  }> {
    // 1. Upload image first
    const imageUpload = await this.uploadImage(imageFile);

    // 2. Create metadata with IPFS image URL
    const metadata: NFTMetadata = {
      name,
      description,
      image: imageUpload.ipfsUrl,
      attributes: attributes || [],
    };

    // 3. Upload metadata
    const metadataUpload = await this.uploadMetadata(metadata);

    return {
      metadataUri: metadataUpload.ipfsUrl,
      imageUri: imageUpload.ipfsUrl,
      metadata,
    };
  }
}

// Singleton instance
let pinataService: PinataService | null = null;

/**
 * Get Pinata service instance
 */
export function getPinataService(): PinataService {
  if (!pinataService) {
    pinataService = new PinataService();
  }
  return pinataService;
}

/**
 * Helper: Check if Pinata is configured
 */
export function isPinataConfigured(): boolean {
  const service = getPinataService();
  return service.isConfigured();
}
