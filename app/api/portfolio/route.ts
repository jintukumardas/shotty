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

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: userAddress },
      include: {
        portfolios: {
          include: {
            tokens: true,
          },
        },
      },
    });

    if (!user) {
      // Create new user with empty portfolio
      user = await prisma.user.create({
        data: {
          address: userAddress,
          portfolios: {
            create: {
              totalValue: 0,
              chains: ['FLOW_EVM'],
            },
          },
        },
        include: {
          portfolios: {
            include: {
              tokens: true,
            },
          },
        },
      });
    }

    // Get real-time balance from Flow EVM
    const flowClient = getFlowEvmClient();
    await flowClient.initialize();

    let flowBalance = '0';
    try {
      flowBalance = await flowClient.getBalance(userAddress);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }

    // Get price feed service
    const priceFeed = getPriceFeedService();

    // Calculate portfolio value
    const portfolio = user.portfolios[0];
    let totalValue = 0;

    // Add FLOW token to portfolio if not exists
    const existingFlowToken = portfolio?.tokens.find(
      (t: any) => t.symbol === 'FLOW' && t.chain === 'FLOW_EVM'
    );

    if (portfolio && !existingFlowToken && parseFloat(flowBalance) > 0) {
      await prisma.tokenBalance.create({
        data: {
          portfolioId: portfolio.id,
          symbol: 'FLOW',
          name: 'Flow EVM',
          address: 'native',
          chain: 'FLOW_EVM',
          balance: flowBalance,
          valueUSD: 0,
        },
      });
    } else if (existingFlowToken && portfolio) {
      await prisma.tokenBalance.update({
        where: { id: existingFlowToken.id },
        data: { balance: flowBalance },
      });
    }

    // Fetch fresh portfolio with updated tokens
    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id: portfolio?.id },
      include: { tokens: true },
    });

    // Update token prices and calculate total value
    const tokens = await Promise.all(
      (updatedPortfolio?.tokens || []).map(async (token: any) => {
        const price = await priceFeed.getTokenPrice(token.symbol);
        const valueUSD = parseFloat(token.balance) * price.price;
        totalValue += valueUSD;

        // Update token value in database
        await prisma.tokenBalance.update({
          where: { id: token.id },
          data: { valueUSD },
        });

        return {
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          valueUSD,
          price: price.price,
          change24h: price.priceChange24h,
        };
      })
    );

    // Update total portfolio value
    if (updatedPortfolio) {
      await prisma.portfolio.update({
        where: { id: updatedPortfolio.id },
        data: { totalValue },
      });
    }

    return NextResponse.json({
      success: true,
      portfolio: {
        totalValue,
        tokens,
        chains: updatedPortfolio?.chains || ['FLOW_EVM'],
      },
    });
  } catch (error: any) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch portfolio' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
