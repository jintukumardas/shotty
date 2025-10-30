import { NextRequest, NextResponse } from 'next/server';
import { getFlowEvmClient } from '@/services/blockchain/client';
import { createDEXAggregator } from '@/services/trading/dexAggregator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fromChain = 42101, // Default to Flow EVM
      toChain = 42101,
      fromToken,
      toToken,
      amount,
      slippage = 0.5,
      address: userAddress,
      simulate = false, // Allow simulation mode for testing
    } = body;

    // Validate inputs
    if (!fromToken || !toToken || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Initialize services
    const client = getFlowEvmClient();
    await client.initialize();

    // Create DEX aggregator with both fromChain and toChain for cross-chain support
    // This enables tokens to bridge as-is from any chain to Flow EVM
    const dexAggregator = createDEXAggregator(fromChain, toChain);

    // Get swap quote first
    const quote = await dexAggregator.getSwapQuote(
      fromToken,
      toToken,
      amount,
      slippage,
      userAddress
    );

    // If simulation mode, just return the quote
    if (simulate) {
      return NextResponse.json({
        success: true,
        quote,
        simulated: true,
      });
    }

    // Execute the actual trade
    const swapResult = await dexAggregator.executeSwap(
      fromToken,
      toToken,
      amount,
      slippage,
      userAddress
    );

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { address: userAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: userAddress,
        },
      });
    }

    // Determine chain name for database
    const chainName = fromChain === toChain
      ? `CHAIN_${fromChain}`
      : `CROSS_${fromChain}_${toChain}`;

    // Store trade in database
    const trade = await prisma.trade.create({
      data: {
        userId: user.id,
        type: 'SWAP',
        status: 'PENDING',
        fromToken,
        toToken,
        fromAmount: amount,
        toAmount: quote.toAmount,
        chain: chainName,
        txHash: swapResult.txHash,
        gasUsed: quote.estimatedGas,
      },
    });

    return NextResponse.json({
      success: true,
      trade: {
        id: trade.id,
        fromToken: trade.fromToken,
        toToken: trade.toToken,
        fromAmount: trade.fromAmount,
        toAmount: trade.toAmount,
        status: trade.status,
        txHash: trade.txHash,
        gasUsed: trade.gasUsed,
        createdAt: trade.createdAt,
      },
      quote,
    });
  } catch (error: any) {
    console.error('Trade execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute trade' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userAddress = searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Address parameter required' },
        { status: 400 }
      );
    }

    // Find user by address
    const user = await prisma.user.findUnique({
      where: { address: userAddress },
    });

    if (!user) {
      // Return empty array if user doesn't exist yet
      return NextResponse.json({
        success: true,
        trades: [],
        total: 0,
      });
    }

    // Fetch trades from database
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.trade.count({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      trades: trades.map((trade: any) => ({
        id: trade.id,
        fromToken: trade.fromToken,
        toToken: trade.toToken,
        fromAmount: trade.fromAmount,
        toAmount: trade.toAmount,
        status: trade.status,
        type: trade.type,
        txHash: trade.txHash,
        chain: trade.chain,
        createdAt: trade.createdAt,
        completedAt: trade.completedAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trades' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}