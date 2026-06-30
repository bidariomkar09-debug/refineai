export type RateLimitTier = "free" | "pro" | "enterprise";

const LIMITS: Record<RateLimitTier, number> = {
  free: 10,
  pro: 60,
  enterprise: Infinity,
};

const WINDOW_MS = 60_000;

export function tierFromPlan(plan: string | null | undefined): RateLimitTier {
  if (plan === "enterprise") return "enterprise";
  if (plan === "pro") return "pro";
  return "free";
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
  tier: RateLimitTier;
};

export async function checkRateLimit(
  clientKey: string,
  tier: RateLimitTier,
  recordEvent: (key: string, tier: RateLimitTier) => Promise<void>,
  countRecent: (key: string, since: string) => Promise<number>
): Promise<RateLimitResult> {
  const limit = LIMITS[tier];
  if (limit === Infinity) {
    return { allowed: true, limit: -1, remaining: -1, tier };
  }

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const count = await countRecent(clientKey, since);

  if (count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfter: 60,
      tier,
    };
  }

  await recordEvent(clientKey, tier);

  return {
    allowed: true,
    limit,
    remaining: limit - count - 1,
    tier,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit === -1 ? "unlimited" : String(result.limit),
    "X-RateLimit-Remaining": result.remaining === -1 ? "unlimited" : String(result.remaining),
    "X-RateLimit-Tier": result.tier,
  };
  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }
  return headers;
}
