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
    return handleScheduled(controller, env, ctx);
  },
};
