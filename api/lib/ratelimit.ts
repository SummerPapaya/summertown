/* Sliding-window rate limiter implemented entirely inside the Worker via
 * the Cloudflare Cache API. The Cache API is shared globally per Worker
 * so counts are accurate across all edge POPs.
 *
 * On overflow we throw a TRPCError so callers see the same UX as spam
 * blocks. The cache entry TTL equals the window size.
 */

import { TRPCError } from "@trpc/server";

interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

/** Reads or increments the counter in the Cache API.
 * Returns the post-increment decision. */
export async function rateLimit(
  env: Env,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const decision = await bumpCounter(env, bucket, limit, windowMs);
  if (!decision.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Slow down, friend — try again in a moment.",
    });
  }
}

async function bumpCounter(
  env: Env,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitDecision> {
  // Cache keys need to be valid URLs — wrap the bucket name with a stable
  // prefix; Cloudflare limits to <512 chars & ascii printable.
  const url = `https://ratelimit.local/${encodeURIComponent(bucket)}/${Math.floor(
    Date.now() / windowMs,
  )}`;
  const cache = caches.open("ratelimit");
  const existing = (await (await cache).match(url))?.clone();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAtMs = windowStart + windowMs;

  if (!existing) {
    const fresh = new Response(JSON.stringify({ count: 1 }), {
      headers: {
        "Cache-Control": `public, max-age=${Math.ceil(windowMs / 1000)}`,
      },
    });
    (await cache).put(url, fresh.clone());
    return { allowed: 1 <= limit, remaining: Math.max(limit - 1, 0), resetAtMs };
  }

  const data: { count: number } = await existing.json();
  const next = data.count + 1;
  const updated = new Response(JSON.stringify({ count: next }), {
    headers: {
      "Cache-Control": `public, max-age=${Math.ceil(windowMs / 1000)}`,
    },
  });
  (await cache).put(url, updated);
  return {
    allowed: next <= limit,
    remaining: Math.max(limit - next, 0),
    resetAtMs,
  };
}

// `env` is intentionally unused today but kept in the signature so future
// D1-backed or KV-backed limits can plug in without touching call sites.
void (null as unknown as Env);
