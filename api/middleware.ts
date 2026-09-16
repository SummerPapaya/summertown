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
 * bound as `env.ADMIN_TOKEN`. Throws UNAUTHORIZED otherwise. */
export const adminProcedure = publicQuery.use(({ ctx, next }) => {
  const expected = ctx.env.ADMIN_TOKEN;
  const provided = ctx.req.headers.get("x-admin-token");
  if (!expected || provided !== expected) {
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
