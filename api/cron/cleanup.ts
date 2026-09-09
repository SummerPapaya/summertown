/* Cron-triggered cleanup. Bound via wrangler.toml `triggers.crons`.
 *
 * Runs once an hour on the production worker. Today it just trims old
 * `page_visits` rows (older than 90 days) and `rate_limits` bucket rows
 * past their `resetAt`. Keeps the D1 storage quota healthy.
 */

import { lt } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { pageVisits, rateLimits } from "@db/schema";

const NINETY_DAYS_MS = 90 * 86_400_000;

export async function handleScheduled(
  _controller: ScheduledController,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const db = getDb(env);
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS);

  try {
    await db.delete(pageVisits).where(lt(pageVisits.visitedAt, cutoff));
  } catch (err) {
    console.warn("page_visits cleanup failed:", err);
  }

  try {
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date()));
  } catch (err) {
    console.warn("rate_limits cleanup failed:", err);
  }
}
