import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter } from '@/services/rateLimit/rateLimiter';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const limiter = getRateLimiter();
    const usage = limiter.getUsage(address);

    return NextResponse.json({
      success: true,
      ...usage,
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check rate limit',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const limiter = getRateLimiter();
    limiter.reset(address);

    return NextResponse.json({
      success: true,
      message: 'Rate limit reset successfully',
    });
  } catch (error) {
    console.error('Rate limit reset error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset rate limit',
      },
      { status: 500 }
    );
  }
}
