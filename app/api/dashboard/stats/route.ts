import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getPriceFeedService } from '@/services/market/priceFeed';
import { getFlowEvmClient } from '@/services/blockchain/client';

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

    // Try to get real balance from blockchain
    let flowBalance = '0';
    try {
      const flowClient = getFlowEvmClient();
      await flowClient.initialize();
      flowBalance = await flowClient.getBalance(userAddress);
    } catch (error) {
      console.error('Failed to fetch blockchain balance:', error);
    }

    // Try to get price for FLOW token (Flow EVM native)
    let flowPrice = 0.25; // Fallback price
    try {
      const priceFeed = getPriceFeedService();
      const priceData = await priceFeed.getTokenPrice('FLOW');
      flowPrice = priceData.price;
    } catch (error) {
      console.error('Failed to fetch FLOW price:', error);
    }

    const flowBalanceNum = parseFloat(flowBalance);
    const portfolioValue = flowBalanceNum * flowPrice;

    // Try to fetch from database, but return default data if DB not available
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { address: userAddress },
        include: {
          portfolios: {
            include: {
              tokens: true,
            },
          },
          trades: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          strategies: {
            where: { status: 'ACTIVE' },
          },
        },
      });
    } catch (dbError) {
      console.error('Database not available:', dbError);
      // Return data based on blockchain only
      return NextResponse.json({
        success: true,
        stats: {
          portfolioValue: `$${portfolioValue.toFixed(2)}`,
          totalInvested: '$0',
          totalProfit: `$${portfolioValue.toFixed(2)}`,
          profitPercentage: portfolioValue > 0 ? '+100%' : '0%',
          activeStrategies: 0,
          totalTrades: 0,
          recentTrades: [],
          assets: flowBalanceNum > 0 ? [{
            symbol: 'FLOW',
            name: 'Flow Protocol',
            balance: flowBalance,
            value: `$${portfolioValue.toFixed(2)}`,
            change: '+0.0%',
            positive: true,
          }] : [],
          strategies: [],
        },
      });
    }

    if (!user) {
      // Return default stats for new users
      return NextResponse.json({
        success: true,
        stats: {
          portfolioValue: 0,
          totalInvested: 0,
          totalProfit: 0,
          profitPercentage: 0,
          activeStrategies: 0,
          totalTrades: 0,
          recentTrades: [],
          assets: [],
          strategies: [],
        },
      });
    }

    // Calculate portfolio stats
    const portfolio = user.portfolios[0];
    const priceFeed = getPriceFeedService();

    let totalPortfolioValue = 0;
    const assets = await Promise.all(
      (portfolio?.tokens || []).map(async (token: any) => {
        const price = await priceFeed.getTokenPrice(token.symbol);
        const valueUSD = parseFloat(token.balance) * price.price;
        totalPortfolioValue += valueUSD;

        return {
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          value: `$${valueUSD.toFixed(2)}`,
          change: `${price.priceChange24h > 0 ? '+' : ''}${price.priceChange24h.toFixed(2)}%`,
          positive: price.priceChange24h > 0,
        };
      })
    );

    // Calculate total invested from completed trades
    const completedTrades = user.trades.filter((t: any) => t.status === 'COMPLETED');
    const totalInvested = completedTrades.reduce((sum: number, trade: any) => {
      return sum + parseFloat(trade.fromAmount || '0');
    }, 0);

    const totalProfit = totalPortfolioValue - totalInvested;
    const profitPercentage =
      totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Format recent trades
    const recentTrades = user.trades.slice(0, 5).map((trade: any) => ({
      id: trade.id,
      type: trade.type,
      from: trade.fromToken,
      to: trade.toToken,
      amount: trade.fromAmount,
      time: getTimeAgo(trade.createdAt),
      status: trade.status,
    }));

    // Format active strategies
    const activeStrategies = user.strategies.map((strategy: any) => {
      const perf = strategy.performance as any;
      return {
        name: strategy.name,
        type: strategy.type,
        status: strategy.status,
        invested: `$${perf.totalInvested || 0}`,
        current: `$${perf.currentValue || 0}`,
        profit: `${perf.roi > 0 ? '+' : ''}${perf.roi || 0}%`,
        nextExecution: 'Not scheduled',
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        portfolioValue: `$${totalPortfolioValue.toFixed(2)}`,
        totalInvested: `$${totalInvested.toFixed(2)}`,
        totalProfit: `$${totalProfit.toFixed(2)}`,
        profitPercentage: `${profitPercentage > 0 ? '+' : ''}${profitPercentage.toFixed(2)}%`,
        activeStrategies: user.strategies.length,
        totalTrades: user.trades.length,
        recentTrades,
        assets,
        strategies: activeStrategies,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
}
