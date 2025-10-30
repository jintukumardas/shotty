import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/services/rateLimit/rateLimiter';
import { getLiFiService, getChainId } from '@/services/lifi/lifiService';

export async function POST(req: NextRequest) {
  try {
    const { address, strategyId, action } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    if (!strategyId) {
      return NextResponse.json({ error: 'Strategy ID required' }, { status: 400 });
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

    // Handle different actions
    let result;
    switch (action) {
      case 'start':
        result = await startStrategy(strategyId, address);
        break;
      case 'pause':
        result = await pauseStrategy(strategyId, address);
        break;
      case 'resume':
        result = await resumeStrategy(strategyId, address);
        break;
      case 'stop':
        result = await stopStrategy(strategyId, address);
        break;
      case 'execute_once':
        result = await executeStrategyOnce(strategyId, address);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: rateLimit.headers,
      }
    );
  } catch (error) {
    console.error('Strategy execution error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute strategy action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function startStrategy(strategyId: string, address: string) {
  // In production, update database and start scheduler
  console.log(`Starting strategy ${strategyId} for ${address}`);

  return {
    message: 'Strategy started successfully',
    strategyId,
    status: 'ACTIVE',
    nextExecution: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  };
}

async function pauseStrategy(strategyId: string, address: string) {
  // In production, update database
  console.log(`Pausing strategy ${strategyId} for ${address}`);

  return {
    message: 'Strategy paused successfully',
    strategyId,
    status: 'PAUSED',
  };
}

async function resumeStrategy(strategyId: string, address: string) {
  // In production, update database
  console.log(`Resuming strategy ${strategyId} for ${address}`);

  return {
    message: 'Strategy resumed successfully',
    strategyId,
    status: 'ACTIVE',
    nextExecution: new Date(Date.now() + 3600000).toISOString(),
  };
}

async function stopStrategy(strategyId: string, address: string) {
  // In production, update database and stop scheduler
  console.log(`Stopping strategy ${strategyId} for ${address}`);

  return {
    message: 'Strategy stopped successfully',
    strategyId,
    status: 'STOPPED',
  };
}

async function executeStrategyOnce(strategyId: string, address: string) {
  // In production, execute the actual strategy
  console.log(`Executing strategy ${strategyId} once for ${address}`);

  // Example: Get a quote from LiFi for a cross-chain swap
  const lifi = getLiFiService();

  try {
    // This is a mock example - in production, use actual strategy config
    const quote = await lifi.getQuote({
      fromChain: getChainId('ethereum'),
      toChain: getChainId('polygon'),
      fromToken: '0x0000000000000000000000000000000000000000', // Native token
      toToken: '0x0000000000000000000000000000000000000000', // Native token
      fromAmount: '1000000000000000000', // 1 ETH in wei
      fromAddress: address,
    });

    return {
      message: 'Strategy executed successfully',
      strategyId,
      execution: {
        timestamp: new Date().toISOString(),
        quoteId: quote.id,
        estimatedOutput: quote.estimate.toAmount,
        success: true,
      },
    };
  } catch (error) {
    return {
      message: 'Strategy execution failed',
      strategyId,
      execution: {
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
