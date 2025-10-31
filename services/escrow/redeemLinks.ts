// Redeem Links Service - Escrow-based token distribution
import { ethers } from 'ethers';
import { getFlowEvmClient } from '../blockchain/client';
import crypto from 'crypto';

// Escrow contract ABI for redeem links
const ESCROW_ABI = [
  'function createRedeemLink(bytes32 linkHash, uint256 expiresIn) external payable returns (bytes32)',
  'function redeemTokens(bytes32 linkId, string memory secret) external',
  'function redeemTokensTo(bytes32 linkId, string memory secret, address payable recipient) external',
  'function getLinkDetails(bytes32 linkId) external view returns (address creator, uint256 amount, bool redeemed, uint256 createdAt, uint256 expiresAt)',
  'function isLinkValid(bytes32 linkId) external view returns (bool)',
  'function cancelLink(bytes32 linkId) external',
  'event LinkCreated(bytes32 indexed linkId, address indexed creator, uint256 amount, uint256 expiresAt)',
  'event LinkRedeemed(bytes32 indexed linkId, address indexed redeemer, uint256 amount)',
  'event LinkCanceled(bytes32 indexed linkId, address indexed creator, uint256 amount)',
];

// Deployed escrow contract address on Flow EVM Testnet
const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;

if (!ESCROW_CONTRACT_ADDRESS && typeof window === 'undefined') {
  console.warn('⚠️  NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS not set! Please deploy the contract and add it to .env.local');
}

export interface RedeemLinkData {
  url: string;
  linkId: string;
  secret: string;
  creator: string;
  amount: string;
  token: string;
  txHash: string;
  expiresAt?: Date;
}

export interface CreateRedeemLinkParams {
  creator: string;
  amount: string;
  token: string;
  expiresIn?: number; // hours
  flowEvmClient?: any; // Flow EVM client
}

export interface RedeemTokensParams {
  redeemer: string;
  linkId: string;
  secret: string;
}

/**
 * Create a redeem link by locking tokens in escrow
 */
export async function createRedeemLink(
  params: CreateRedeemLinkParams
): Promise<RedeemLinkData> {
  const { creator, amount, token, expiresIn = 24, flowEvmClient: clientFromParams } = params;

  try {
    if (!ESCROW_CONTRACT_ADDRESS) {
      throw new Error('Escrow contract not deployed. Please deploy the contract first.');
    }

    // Generate unique secret and link ID
    const secret = generateSecret();
    const secretHash = ethers.keccak256(ethers.toUtf8Bytes(secret));

    // Convert amount to Wei
    const amountWei = ethers.parseEther(amount);

    // Calculate expires in seconds (default 24 hours)
    const expiresInSeconds = expiresIn * 60 * 60;

    // Get Flow EVM client - use passed client or fall back to default client
    const flowEvmClient = clientFromParams || getFlowEvmClient();

    // Initialize client if needed
    if (!clientFromParams && flowEvmClient.initialize) {
      if (!flowEvmClient.hasWallet() && typeof window !== 'undefined' && (window as any).ethereum) {
        await flowEvmClient.connectWallet((window as any).ethereum);
      }
      await flowEvmClient.initialize();
    }

    // Encode contract call for creating redeem link
    const iface = new ethers.Interface(ESCROW_ABI);
    const data = iface.encodeFunctionData('createRedeemLink', [secretHash, expiresInSeconds]);

    console.log('Creating redeem link on contract:', ESCROW_CONTRACT_ADDRESS);
    console.log('Amount:', ethers.formatEther(amountWei), token);
    console.log('Expires in:', expiresIn, 'hours');

    // Send transaction on Flow EVM
    let txHash: string;
    let receipt: any;

    console.log('📤 Sending transaction on Flow EVM');

    // Get signer
    let signer;
    if (flowEvmClient.getSigner) {
      signer = flowEvmClient.getSigner();
    } else if (typeof window !== 'undefined' && (window as any).ethereum) {
      // Use browser provider
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      signer = await browserProvider.getSigner();
    }

    if (!signer) {
      throw new Error('No signer available. Please connect your wallet.');
    }

    const tx = await signer.sendTransaction({
      to: ESCROW_CONTRACT_ADDRESS,
      value: amountWei,
      data: data,
    });

    txHash = tx.hash;
    console.log('⏳ Waiting for transaction confirmation...', txHash);

    receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    console.log(`✅ Redeem link created with tx: ${txHash}`);

    // Get provider for parsing events
    let providerForParsing;
    if (flowEvmClient.getProvider) {
      providerForParsing = flowEvmClient.getProvider();
    } else {
      // Use Flow EVM RPC directly
      const rpcUrl = process.env.NEXT_PUBLIC_FLOW_CHAIN_RPC || 'https://testnet.evm.nodes.onflow.org';
      providerForParsing = new ethers.JsonRpcProvider(rpcUrl);
    }

    // Parse LinkCreated event to get the actual linkId from the contract
    const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, providerForParsing);
    const linkCreatedEvent = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog({ topics: [...log.topics], data: log.data });
        } catch {
          return null;
        }
      })
      .find((event: any) => event?.name === 'LinkCreated');

    if (!linkCreatedEvent) {
      throw new Error('LinkCreated event not found in transaction receipt');
    }

    // Extract the linkId from the event
    const linkId = linkCreatedEvent.args[0]; // First indexed parameter is linkId

    // Store link data (in production, use database)
    const linkData: RedeemLinkData = {
      url: generateRedeemUrl(linkId, secret),
      linkId,
      secret,
      creator,
      amount,
      token,
      txHash,
      expiresAt: new Date(Date.now() + expiresIn * 60 * 60 * 1000),
    };

    // Store in temporary storage (use database in production)
    await storeRedeemLink(linkData);

    return linkData;
  } catch (error) {
    console.error('Failed to create redeem link:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create redeem link'
    );
  }
}

/**
 * Redeem tokens from a link
 */
export async function redeemTokens(params: RedeemTokensParams): Promise<string> {
  const { redeemer, linkId, secret } = params;

  try {
    // Get Flow EVM client and connect wallet
    const flowEvmClient = getFlowEvmClient();

    // Connect wallet if not already connected
    if (!flowEvmClient.hasWallet() && typeof window !== 'undefined' && (window as any).ethereum) {
      await flowEvmClient.connectWallet((window as any).ethereum);
    }

    await flowEvmClient.initialize();

    if (!ESCROW_CONTRACT_ADDRESS) {
      throw new Error('Escrow contract not deployed. Please deploy the contract first.');
    }

    // Encode redemption call using the secret from the URL and explicit recipient
    const iface = new ethers.Interface(ESCROW_ABI);
    const data = iface.encodeFunctionData('redeemTokensTo', [linkId, secret, redeemer]);

    console.log('Redeeming from contract:', ESCROW_CONTRACT_ADDRESS);
    console.log('Link ID:', linkId);
    console.log('Recipient:', redeemer);

    // Send transaction on Flow EVM
    const signer = flowEvmClient.getSigner();
    if (!signer) {
      throw new Error('No signer available. Please connect your wallet.');
    }

    console.log('📤 Sending transaction on Flow EVM');
    const tx = await signer.sendTransaction({
      to: ESCROW_CONTRACT_ADDRESS,
      value: BigInt(0),
      data: data,
    });

    const txHash = tx.hash;
    console.log('⏳ Waiting for transaction confirmation...', txHash);

    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    console.log(`✅ Tokens redeemed with tx: ${txHash}`);

    return txHash;
  } catch (error) {
    console.error('Failed to redeem tokens:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to redeem tokens');
  }
}

/**
 * Get redeem link details from blockchain
 */
export async function getRedeemLinkDetails(linkId: string): Promise<{
  creator: string;
  amount: string;
  token: string;
  redeemed: boolean;
  expiresAt?: Date;
} | null> {
  try {
    if (!ESCROW_CONTRACT_ADDRESS) {
      throw new Error('Escrow contract not deployed');
    }

    // Get provider directly (read-only, no signer needed)
    const flowEvmClient = getFlowEvmClient();
    const provider = flowEvmClient.getProvider();

    // Create read-only contract instance
    const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);

    // Fetch link details from contract
    const [creator, amount, redeemed, createdAt, expiresAt] = await contract.getLinkDetails(linkId);

    // Check if link exists (creator would be zero address if it doesn't)
    if (creator === ethers.ZeroAddress) {
      return null;
    }

    return {
      creator,
      amount: ethers.formatEther(amount),
      token: 'ETH',
      redeemed,
      expiresAt: expiresAt > BigInt(0) ? new Date(Number(expiresAt) * 1000) : undefined,
    };
  } catch (error) {
    console.error('Failed to get link details:', error);
    return null;
  }
}

/**
 * Generate a secure random secret
 */
function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate redeem URL
 */
function generateRedeemUrl(linkId: string, secret: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/redeem/${linkId}?secret=${secret}`;
}

// Persistent storage using file system (for development)
// In production, replace with proper database (PostgreSQL, MongoDB, etc.)

// Storage helper functions
function getStorageFilePath(): string {
  // Use /tmp directory for server-side storage
  // In production, use a proper database
  return '/tmp/shotty-redeem-links.json';
}

interface StorageData {
  links: Record<string, RedeemLinkData>;
  redeemed: string[];
}

function loadStorage(): StorageData {
  if (typeof window !== 'undefined') {
    // Client-side: use localStorage
    const stored = localStorage.getItem('shotty-redeem-links');
    return stored ? JSON.parse(stored) : { links: {}, redeemed: [] };
  } else {
    // Server-side: use file system
    try {
      const fs = require('fs');
      const path = getStorageFilePath();
      if (fs.existsSync(path)) {
        const data = fs.readFileSync(path, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading storage:', error);
    }
    return { links: {}, redeemed: [] };
  }
}

function saveStorage(data: StorageData): void {
  if (typeof window !== 'undefined') {
    // Client-side: use localStorage
    localStorage.setItem('shotty-redeem-links', JSON.stringify(data));
  } else {
    // Server-side: use file system
    try {
      const fs = require('fs');
      const path = getStorageFilePath();
      fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving storage:', error);
    }
  }
}

/**
 * Store redeem link data
 */
async function storeRedeemLink(linkData: RedeemLinkData): Promise<void> {
  const storage = loadStorage();
  storage.links[linkData.linkId] = linkData;
  saveStorage(storage);
}

/**
 * Get redeem link data
 */
async function getRedeemLink(linkId: string): Promise<RedeemLinkData | null> {
  const storage = loadStorage();
  return storage.links[linkId] || null;
}

/**
 * Check if link has been redeemed
 */
async function checkIfRedeemed(linkId: string): Promise<boolean> {
  const storage = loadStorage();
  return storage.redeemed.includes(linkId);
}

/**
 * Mark link as redeemed
 */
async function markAsRedeemed(linkId: string, redeemer: string): Promise<void> {
  const storage = loadStorage();
  if (!storage.redeemed.includes(linkId)) {
    storage.redeemed.push(linkId);
  }
  if (storage.links[linkId]) {
    storage.links[linkId] = {
      ...storage.links[linkId],
      creator: redeemer, // Store redeemer info
    };
  }
  saveStorage(storage);
}

/**
 * List all redeem links created by user
 */
export async function getUserRedeemLinks(creator: string): Promise<RedeemLinkData[]> {
  const storage = loadStorage();
  const userLinks: RedeemLinkData[] = [];
  for (const linkId in storage.links) {
    const linkData = storage.links[linkId];
    if (linkData.creator.toLowerCase() === creator.toLowerCase()) {
      userLinks.push(linkData);
    }
  }
  return userLinks;
}
