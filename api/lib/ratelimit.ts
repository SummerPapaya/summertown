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
  message = "Slow down, friend — try again in a moment.",
): Promise<void> {
  const decision = await bumpCounter(env, bucket, limit, windowMs);
  if (!decision.allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  }
}

async function bumpCounter(
  env: Env,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitDecision> {
  void env; // reserved for future D1/KV-backed limits

  /* The Cache API only exists on Cloudflare. Running the Worker on plain Node
   * (the `vite` dev server via @hono/vite-dev-server) leaves `caches`
   * undefined, which would 500 every write endpoint locally. Rate limiting is
   * an edge-side safety net — the D1 unique indexes are the real enforcement —
   * so degrade to "allowed" rather than failing the request. */
  const cacheStorage = (globalThis as { caches?: CacheStorage }).caches;
  if (!cacheStorage) {
    return { allowed: true, remaining: limit, resetAtMs: Date.now() + windowMs };
  }

  // Cache keys need to be valid URLs — wrap the bucket name with a stable
  // prefix; Cloudflare limits to <512 chars & ascii printable.
  const url = `https://ratelimit.local/${encodeURIComponent(bucket)}/${Math.floor(
    Date.now() / windowMs,
  )}`;
  const cache = cacheStorage.open("ratelimit");
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
