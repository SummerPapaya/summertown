/* Cloudflare Workers entry point.
 *
 * Hono is router-agnostic — the same `app` works behind `serve()` on Node,
 * a Cloudflare Worker `fetch` handler, or any other Web-Fetcher runtime.
 * Wrangler reads `api/worker.ts` from wrangler.toml (`main`) and feeds the
 * raw `Request` to `app.fetch`, which dispatches by URL.
 *
 * Optional `scheduled` hook lets a Cron Trigger clean up rate-limit rows
 * and roll daily visit aggregates; it's safe to leave disabled in dev.
 */

import handle from "./boot";

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handle.fetch(req, env, ctx);
  },
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const { handleScheduled } = await import("./cron/cleanup");
    await handleScheduled(controller, env, ctx);

    /* Daily import of the owner's own 🍎 posts from 即刻. Fully optional —
     * with no JIKE_* secrets it returns immediately, and errors are swallowed
     * inside the sync so a broken token can never break the cleanup above.
     * Only the daily entry triggers it; the hourly one is cleanup-only. */
    if (controller.cron !== "0 15 * * *") return;
    const { syncJikeApples } = await import("./cron/jikeSync");
    const result = await syncJikeApples(env);
    console.log(
      `jike sync: fetched=${result.fetched} matched=${result.matched} imported=${result.imported} skipped=${result.skipped}${result.reason ? ` reason=${result.reason}` : ""}`,
    );
  },
};
