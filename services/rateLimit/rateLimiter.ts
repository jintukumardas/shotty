// Rate Limiter Service
// Implements per-user rate limiting for API calls

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiterService {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly MAX_REQUESTS = 10; // per window
  private readonly WINDOW_MS = 60 * 1000; // 1 minute

  /**
   * Check if a user has exceeded their rate limit
   * @param userId User identifier (address or session ID)
   * @returns Object with isAllowed flag and remaining calls
   */
  checkLimit(userId: string): { isAllowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(userId);

    // No entry or window expired
    if (!entry || now >= entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.WINDOW_MS,
      };
      this.limits.set(userId, newEntry);

      return {
        isAllowed: true,
        remaining: this.MAX_REQUESTS - 1,
        resetAt: newEntry.resetAt,
      };
    }

    // Entry exists and within window
    if (entry.count >= this.MAX_REQUESTS) {
      return {
        isAllowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count += 1;
    this.limits.set(userId, entry);

    return {
      isAllowed: true,
      remaining: this.MAX_REQUESTS - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for a user
   * @param userId User identifier
   */
  reset(userId: string): void {
    this.limits.delete(userId);
  }

  /**
   * Get current usage for a user
   * @param userId User identifier
   */
  getUsage(userId: string): { used: number; limit: number; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(userId);

    if (!entry || now >= entry.resetAt) {
      return {
        used: 0,
        limit: this.MAX_REQUESTS,
        remaining: this.MAX_REQUESTS,
        resetAt: now + this.WINDOW_MS,
      };
    }

    return {
      used: entry.count,
      limit: this.MAX_REQUESTS,
      remaining: this.MAX_REQUESTS - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.limits.entries()) {
      if (now >= entry.resetAt) {
        this.limits.delete(userId);
      }
    }
  }
}

// Singleton instance
let rateLimiter: RateLimiterService | null = null;

export function getRateLimiter(): RateLimiterService {
  if (!rateLimiter) {
    rateLimiter = new RateLimiterService();

    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      rateLimiter?.cleanup();
    }, 5 * 60 * 1000);
  }

  return rateLimiter;
}

/**
 * Middleware helper for Next.js API routes
 */
export function withRateLimit(userId: string): {
  isAllowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
} {
  const limiter = getRateLimiter();
  const result = limiter.checkLimit(userId);

  return {
    ...result,
    headers: {
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    },
  };
}
