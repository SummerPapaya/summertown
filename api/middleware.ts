import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { rateLimit } from "./lib/ratelimit";
import { isUserFacingSpam } from "./lib/moderation";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

/** Admin gate — requires header `x-admin-token` to match the secret
 * bound as `env.ADMIN_TOKEN`. Throws UNAUTHORIZED otherwise.
 *
 * Both sides are trimmed: secrets uploaded via `wrangler secret put` (or
 * pasted into the dashboard) can carry a trailing newline, which would make
 * an otherwise-correct token compare unequal forever — with no way for ops
 * to tell why. */
export const adminProcedure = publicQuery.use(({ ctx, next }) => {
  const raw = ctx.env.ADMIN_TOKEN;
  const expected = typeof raw === "string" ? raw.trim() : "";
  const provided = ctx.req.headers.get("x-admin-token")?.trim() ?? "";

  // Distinct message (still UNAUTHORIZED) so a lockout is diagnosable:
  // "the secret was never bound" and "you typed the wrong value" are very
  // different fixes, and a single generic message hides which one it is.
  if (!expected) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message:
        "Admin token is not configured on the server — set the ADMIN_TOKEN secret and redeploy.",
    });
  }
  if (!provided || provided !== expected) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin token" });
  }
  return next();
});

const WRITE_RATE_LIMIT = Number.parseInt(
  process.env.WRITE_RATE_LIMIT ?? "8",
  10,
);
/** Per-day cap for write endpoints (`addWish` + `addPostcard` combined),
 * keyed by client IP. Throttles "refresh-spam" that slips past the
 * per-minute gate. `DAILY_POST_LIMIT` env var tunes it without redeploy. */
const DAILY_POST_LIMIT = Number.parseInt(
  process.env.DAILY_POST_LIMIT ?? "50",
  10,
);
/** Per-minute cap for write endpoints (`addWish`, `addPostcard`).
 * `WRITE_RATE_LIMIT` env var lets ops tune without redeploying. */
export const writeProcedure = publicQuery.use(async ({ ctx, next }) => {
  await rateLimit(ctx.env, `write:${ctx.clientIp}`, WRITE_RATE_LIMIT, 60_000);
  await rateLimit(
    ctx.env,
    `day:${ctx.clientIp}`,
    DAILY_POST_LIMIT,
    86_400_000,
    "你今天发布的条数已达上限，明天再来吧。 / You've reached today's posting limit — come back tomorrow.",
  );
  return next();
});

/* Throws if any submitted field looks like spam. The router should then
 * downgrade the row to "pending" before persisting. */
export function guardAgainstSpam(
  fields: Record<string, string | undefined>,
): void {
  for (const [name, value] of Object.entries(fields)) {
    if (!value) continue;
    const verdict = isUserFacingSpam(value);
    if (verdict.spam) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Field "${name}" rejected by moderation: ${verdict.reason ?? "blacklisted"}`,
      });
    }
  }
}
