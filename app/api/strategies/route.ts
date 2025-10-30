import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userAddress = searchParams.get('address');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Address parameter required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { address: userAddress },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        strategies: [],
      });
    }

    // Fetch user strategies
    const strategies = await prisma.strategy.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        trades: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        executions: {
          take: 1,
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      strategies: strategies.map((strategy: any) => ({
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        status: strategy.status,
        config: strategy.config,
        performance: strategy.performance,
        lastExecution: strategy.executions[0]?.executedAt,
        totalTrades: strategy.trades.length,
        createdAt: strategy.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching strategies:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch strategies' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress, name, type, config } = body;

    if (!userAddress || !name || !type || !config) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: userAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { address: userAddress },
      });
    }

    // Create strategy
    const strategy = await prisma.strategy.create({
      data: {
        userId: user.id,
        name,
        type,
        status: 'ACTIVE',
        config,
        performance: {
          totalInvested: 0,
          currentValue: 0,
          profitLoss: 0,
          roi: 0,
          trades: 0,
        },
      },
    });

    return NextResponse.json({
      success: true,
      strategy: {
        id: strategy.id,
        name: strategy.name,
        type: strategy.type,
        status: strategy.status,
        config: strategy.config,
        createdAt: strategy.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating strategy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create strategy' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
