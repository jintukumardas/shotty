import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Escrow contract ABI for redeem links
const ESCROW_ABI = [
  'function getLinkDetails(bytes32 linkId) external view returns (address creator, uint256 amount, bool redeemed, uint256 createdAt, uint256 expiresAt)',
  'function isLinkValid(bytes32 linkId) external view returns (bool)',
];

const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
const PUSH_CHAIN_RPC = process.env.NEXT_PUBLIC_PUSH_CHAIN_RPC;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID required' }, { status: 400 });
    }

    if (!ESCROW_CONTRACT_ADDRESS || !PUSH_CHAIN_RPC) {
      return NextResponse.json(
        { error: 'Configuration error: missing contract address or RPC' },
        { status: 500 }
      );
    }

    // Connect to Push Chain and fetch details from contract
    const provider = new ethers.JsonRpcProvider(PUSH_CHAIN_RPC);
    const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);

    // Fetch link details from contract
    const [creator, amount, redeemed, createdAt, expiresAt] = await contract.getLinkDetails(linkId);

    // Check if link exists (creator would be zero address if it doesn't)
    if (creator === ethers.ZeroAddress) {
      return NextResponse.json({ error: 'Redeem link not found' }, { status: 404 });
    }

    return NextResponse.json({
      creator,
      amount: ethers.formatEther(amount),
      token: 'ETH', // Native token on Push Chain
      redeemed,
      createdAt: Number(createdAt),
      expiresAt: expiresAt > 0 ? Number(expiresAt) * 1000 : null, // Convert to milliseconds
    });
  } catch (error) {
    console.error('Error fetching redeem link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link details' },
      { status: 500 }
    );
  }
}
