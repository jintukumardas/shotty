import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withRateLimit } from '@/services/rateLimit/rateLimiter';
import { getLiFiService } from '@/services/lifi/lifiService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { address, portfolio, marketConditions, riskProfile } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
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

    // Get available chains and tokens from LiFi
    const lifi = getLiFiService();
    const chains = await lifi.getChains();
    const availableChains = chains
      .filter((c) => c.mainnet)
      .map((c) => c.name)
      .slice(0, 10);

    // Build prompt for OpenAI
    const systemPrompt = `You are an expert DeFi trading strategist specializing in automated trading strategies.

Based on the user's portfolio and market conditions, suggest 3 trading strategies that would be suitable.

Available chains: ${availableChains.join(', ')}

Consider these strategy types:
1. **DCA (Dollar Cost Averaging)**: Buy fixed amounts at regular intervals
   - Best for: Long-term accumulation, reducing timing risk
   - Parameters: amount per buy, frequency (hourly, daily, weekly)

2. **Grid Trading**: Place multiple buy/sell orders at different price levels
   - Best for: Range-bound markets, capturing volatility
   - Parameters: price range (upper/lower), number of grid levels

3. **Momentum Trading**: Trade based on price momentum indicators
   - Best for: Trending markets, catching big moves
   - Parameters: momentum threshold (%), lookback period

4. **Rebalancing**: Maintain target portfolio allocation
   - Best for: Diversification, risk management
   - Parameters: target allocations, rebalance frequency

For each strategy, provide:
- Name and type
- Description (2-3 sentences)
- Recommended tokens/pairs
- Risk level (Low/Medium/High)
- Expected APY range
- Specific parameters
- Why it fits the user's profile

Format response as JSON array of strategy objects.`;

    const userPrompt = `User Portfolio: ${JSON.stringify(portfolio || 'None provided')}
Market Conditions: ${marketConditions || 'Normal volatility'}
Risk Profile: ${riskProfile || 'Medium'}

Suggest 3 personalized trading strategies.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json(
      {
        success: true,
        strategies: aiResponse.strategies || [],
        availableChains,
      },
      {
        headers: rateLimit.headers,
      }
    );
  } catch (error) {
    console.error('Strategy suggestion error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate strategy suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
