import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/services/rateLimit/rateLimiter';

export async function POST(req: NextRequest) {
  try {
    const { address, strategy } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    if (!strategy || !strategy.type || !strategy.name) {
      return NextResponse.json({ error: 'Invalid strategy data' }, { status: 400 });
    }

    // Check rate limit
    const rateLimit = withRateLimit(address);
    if (!rateLimit.isAllowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: rateLimit.headers,
        }
      );
    }

    // Validate strategy configuration
    const validTypes = ['DCA', 'GRID', 'MOMENTUM', 'REBALANCE'];
    if (!validTypes.includes(strategy.type)) {
      return NextResponse.json({ error: 'Invalid strategy type' }, { status: 400 });
    }

    // In production, save to database
    // For now, return mock data
    const createdStrategy = {
      id: `strategy_${Date.now()}`,
      userId: address,
      name: strategy.name,
      type: strategy.type,
      status: 'ACTIVE',
      config: strategy.config,
      createdAt: new Date().toISOString(),
      totalProfit: '$0',
      invested: strategy.config?.initialAmount || '$0',
      nextExecution: 'In 1 hour',
    };

    return NextResponse.json(
      {
        success: true,
        strategy: createdStrategy,
        message: 'Strategy created successfully',
      },
      {
        headers: rateLimit.headers,
      }
    );
  } catch (error) {
    console.error('Strategy creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create strategy',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
