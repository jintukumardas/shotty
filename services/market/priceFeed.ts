// Real-time Price Feed Service
import axios from 'axios';

interface TokenPrice {
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  high24h?: number;
  low24h?: number;
}

export class PriceFeedService {
  private coingeckoApiKey: string | undefined;
  private cache: Map<string, { data: TokenPrice; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor() {
    this.coingeckoApiKey = process.env.COINGECKO_API_KEY;
  }

  // Map token symbols to CoinGecko IDs
  private getCoingeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      'ETH': 'ethereum',
      'BTC': 'bitcoin',
      'PUSH': 'push-protocol',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'UNI': 'uniswap',
      'AAVE': 'aave',
      'LINK': 'chainlink',
      'MATIC': 'matic-network',
      'SOL': 'solana',
    };

    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  async getTokenPrice(symbol: string): Promise<TokenPrice> {
    const cacheKey = symbol.toUpperCase();
    const cached = this.cache.get(cacheKey);

    // Return cached data if still fresh
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const coinId = this.getCoingeckoId(symbol);

      // Use CoinGecko API (free tier)
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd',
            include_24hr_change: true,
            include_24hr_vol: true,
            include_market_cap: true,
          },
          headers: this.coingeckoApiKey
            ? { 'x-cg-demo-api-key': this.coingeckoApiKey }
            : {},
        }
      );

      const data = response.data[coinId];
      if (!data) {
        throw new Error(`Price data not found for ${symbol}`);
      }

      const tokenPrice: TokenPrice = {
        symbol: symbol.toUpperCase(),
        price: data.usd,
        priceChange24h: data.usd_24h_change || 0,
        volume24h: data.usd_24h_vol || 0,
        marketCap: data.usd_market_cap || 0,
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: tokenPrice,
        timestamp: Date.now(),
      });

      return tokenPrice;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);

      // Return fallback prices if API fails
      return this.getFallbackPrice(symbol);
    }
  }

  async getMultiplePrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
    const prices: Record<string, TokenPrice> = {};

    // Fetch prices concurrently
    const results = await Promise.allSettled(
      symbols.map((symbol) => this.getTokenPrice(symbol))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        prices[symbols[index]] = result.value;
      } else {
        console.error(`Failed to fetch price for ${symbols[index]}`);
        prices[symbols[index]] = this.getFallbackPrice(symbols[index]);
      }
    });

    return prices;
  }

  private getFallbackPrice(symbol: string): TokenPrice {
    // Fallback prices in case API is unavailable
    const fallbackPrices: Record<string, number> = {
      ETH: 3500,
      BTC: 65000,
      PUSH: 0.25,
      USDC: 1,
      USDT: 1,
      UNI: 6.5,
      AAVE: 150,
      LINK: 15,
      MATIC: 0.8,
      SOL: 140,
    };

    const price = fallbackPrices[symbol.toUpperCase()] || 1;

    return {
      symbol: symbol.toUpperCase(),
      price,
      priceChange24h: 0,
      volume24h: 0,
      marketCap: 0,
    };
  }

  async getTokenPriceInUSD(symbol: string, amount: string): Promise<number> {
    const price = await this.getTokenPrice(symbol);
    return parseFloat(amount) * price.price;
  }

  async convertTokenValue(
    fromSymbol: string,
    toSymbol: string,
    amount: string
  ): Promise<number> {
    const [fromPrice, toPrice] = await Promise.all([
      this.getTokenPrice(fromSymbol),
      this.getTokenPrice(toSymbol),
    ]);

    const fromValueUSD = parseFloat(amount) * fromPrice.price;
    return fromValueUSD / toPrice.price;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
let priceFeedService: PriceFeedService | null = null;

export function getPriceFeedService(): PriceFeedService {
  if (!priceFeedService) {
    priceFeedService = new PriceFeedService();
  }
  return priceFeedService;
}
