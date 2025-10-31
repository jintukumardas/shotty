// Strategy Execution Service for automated trading strategies
import { PrismaClient } from '@prisma/client';
import { createDEXAggregator } from '../trading/dexAggregator';

const prisma = new PrismaClient();

export interface StrategyConfig {
  // DCA Configuration
  dcaAmount?: string;
  dcaInterval?: number; // in seconds
  dcaToken?: string;
  dcaTargetToken?: string;

  // Grid Trading Configuration
  gridUpperPrice?: number;
  gridLowerPrice?: number;
  gridLevels?: number;
  gridToken?: string;
  gridQuoteToken?: string;

  // Momentum Configuration
  momentumThreshold?: number;
  momentumWindow?: number; // in minutes
  momentumToken?: string;
}

export class StrategyExecutor {
  private chainId: number;

  constructor(chainId: number = 42101) {
    this.chainId = chainId;
  }

  async executeStrategy(strategyId: string, userAddress: string): Promise<boolean> {
    try {
      const strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
        include: { user: true },
      });

      if (!strategy) {
        throw new Error('Strategy not found');
      }

      if (strategy.status !== 'ACTIVE') {
        console.log(`Strategy ${strategyId} is not active, skipping execution`);
        return false;
      }

      const config = strategy.config as StrategyConfig;

      let result = false;

      switch (strategy.type) {
        case 'DCA':
          result = await this.executeDCA(strategy.id, config, userAddress);
          break;
        case 'GRID':
          result = await this.executeGridTrading(strategy.id, config, userAddress);
          break;
        case 'MOMENTUM':
          result = await this.executeMomentum(strategy.id, config, userAddress);
          break;
        default:
          console.log(`Unknown strategy type: ${strategy.type}`);
      }

      // Record execution
      await prisma.strategyExecution.create({
        data: {
          strategyId: strategy.id,
          success: result,
          details: {
            timestamp: new Date().toISOString(),
            type: strategy.type,
          },
        },
      });

      return result;
    } catch (error) {
      console.error('Strategy execution error:', error);

      // Record failed execution
      await prisma.strategyExecution.create({
        data: {
          strategyId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return false;
    }
  }

  private async executeDCA(
    strategyId: string,
    config: StrategyConfig,
    userAddress: string
  ): Promise<boolean> {
    if (!config.dcaAmount || !config.dcaToken || !config.dcaTargetToken) {
      throw new Error('Invalid DCA configuration');
    }

    const dex = createDEXAggregator(this.chainId);

    try {
      // Get quote
      const quote = await dex.getSwapQuote(
        config.dcaToken,
        config.dcaTargetToken,
        config.dcaAmount,
        0.5
      );

      console.log(
        `DCA: Buying ${quote.toAmount} ${config.dcaTargetToken} with ${config.dcaAmount} ${config.dcaToken}`
      );

      // In production, execute the actual swap
      // const result = await dex.executeSwap(...)

      // For now, just create a simulated trade record
      const user = await prisma.user.findUnique({
        where: { address: userAddress },
      });

      if (user) {
        await prisma.trade.create({
          data: {
            userId: user.id,
            strategyId,
            type: 'BUY',
            status: 'COMPLETED',
            fromToken: config.dcaToken,
            toToken: config.dcaTargetToken,
            fromAmount: config.dcaAmount,
            toAmount: quote.toAmount,
            chain: 'FLOW_EVM',
          },
        });
      }

      return true;
    } catch (error) {
      console.error('DCA execution error:', error);
      return false;
    }
  }

  private async executeGridTrading(
    strategyId: string,
    config: StrategyConfig,
    userAddress: string
  ): Promise<boolean> {
    if (
      !config.gridUpperPrice ||
      !config.gridLowerPrice ||
      !config.gridLevels ||
      !config.gridToken ||
      !config.gridQuoteToken
    ) {
      throw new Error('Invalid Grid Trading configuration');
    }

    const dex = createDEXAggregator(this.chainId);

    try {
      // Get current price
      const { getPriceFeedService } = await import('../market/priceFeed');
      const priceFeed = getPriceFeedService();
      const tokenPrice = await priceFeed.getTokenPrice(config.gridToken);

      // Check if price is within grid range
      if (
        tokenPrice.price < config.gridLowerPrice ||
        tokenPrice.price > config.gridUpperPrice
      ) {
        console.log('Price outside grid range, skipping execution');
        return false;
      }

      // Calculate grid level and execute buy/sell based on price position
      const priceRange = config.gridUpperPrice - config.gridLowerPrice;
      const levelSize = priceRange / config.gridLevels;
      const currentLevel = Math.floor(
        (tokenPrice.price - config.gridLowerPrice) / levelSize
      );

      console.log(
        `Grid Trading: Current level ${currentLevel}/${config.gridLevels} at price $${tokenPrice.price}`
      );

      // Implement grid logic here
      // Buy when price drops, sell when price rises
      return true;
    } catch (error) {
      console.error('Grid Trading execution error:', error);
      return false;
    }
  }

  private async executeMomentum(
    strategyId: string,
    config: StrategyConfig,
    userAddress: string
  ): Promise<boolean> {
    if (!config.momentumThreshold || !config.momentumToken) {
      throw new Error('Invalid Momentum configuration');
    }

    try {
      const { getPriceFeedService } = await import('../market/priceFeed');
      const priceFeed = getPriceFeedService();
      const tokenPrice = await priceFeed.getTokenPrice(config.momentumToken);

      // Check if momentum threshold is met
      if (Math.abs(tokenPrice.priceChange24h) >= config.momentumThreshold) {
        console.log(
          `Momentum signal detected: ${tokenPrice.priceChange24h}% change in ${config.momentumToken}`
        );

        // Execute trade based on momentum direction
        const tradeType = tokenPrice.priceChange24h > 0 ? 'BUY' : 'SELL';

        console.log(`Would execute ${tradeType} for ${config.momentumToken}`);
        return true;
      }

      console.log('Momentum threshold not met, skipping execution');
      return false;
    } catch (error) {
      console.error('Momentum execution error:', error);
      return false;
    }
  }

  async scheduleStrategies(): Promise<void> {
    try {
      const activeStrategies = await prisma.strategy.findMany({
        where: { status: 'ACTIVE' },
        include: { user: true },
      });

      console.log(`Found ${activeStrategies.length} active strategies to execute`);

      for (const strategy of activeStrategies) {
        await this.executeStrategy(strategy.id, strategy.user.address);
      }
    } catch (error) {
      console.error('Error scheduling strategies:', error);
    }
  }
}

export function createStrategyExecutor(chainId?: number): StrategyExecutor {
  return new StrategyExecutor(chainId);
}
