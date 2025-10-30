import { NextRequest, NextResponse } from 'next/server';
import { redeemTokens } from '@/services/escrow/redeemLinks';

export async function POST(req: NextRequest) {
  try {
    const { linkId, secret, redeemer } = await req.json();

    if (!linkId || !secret || !redeemer) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Redeem tokens
    const txHash = await redeemTokens({ redeemer, linkId, secret });

    return NextResponse.json({
      success: true,
      txHash,
      message: 'Tokens redeemed successfully',
    });
  } catch (error) {
    console.error('Error redeeming tokens:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to redeem tokens',
      },
      { status: 500 }
    );
  }
}
