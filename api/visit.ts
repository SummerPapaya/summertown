import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { pageVisits } from "@db/schema";

/* --- sha256 helper using Web Crypto, available in Workers and Node 18+ --- */

async function visitorHash(ip: string, userAgent: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${userAgent}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* --- /api/visit POST: log a page hit (best-effort, no error to caller) --- */

export async function handleVisit(c: Context): Promise<Response> {
  const { env } = c;
  const ip =
    c.req.header("CF-Connecting-IP") ??
    (c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
  const userAgent = c.req.header("User-Agent") ?? "";

  // Bail early on robots / pre-fetch probes (cheap heuristic).
  if (/bot|spider|crawl|preview|facebookexternalhit/i.test(userAgent)) {
    return c.json({ ok: true, ignored: "bot" });
  }

  const hash = await visitorHash(ip, userAgent);
  const url = new URL(c.req.url);
  const path = url.searchParams.get("path") ?? url.pathname;

  try {
    const db = getDb(env);
    await db.insert(pageVisits).values({
      visitorHash: hash,
      path,
      userAgent: userAgent.slice(0, 200),
      visitedAt: new Date(),
    });
  } catch (err) {
    // The hit counter must never break the page — log and move on.
    console.warn("page_visits insert failed:", err);
  }

  return c.json({ ok: true });
}

/* --- /api/stats/site GET: PV / UV rollups --- */

export async function handleStats(c: Context): Promise<Response> {
  const { env } = c;
  const db = getDb(env);
  // SQLite has `unixepoch() * 1000` for ms-precision "today" cutoffs.
  const todayMs = sql`(unixepoch() * 1000 - (unixepoch() % 86400) * 1000)`;

  const [totals] = await db
    .select({
      pv: sql<number>`count(*)`,
      uv: sql<number>`count(distinct ${pageVisits.visitorHash})`,
    })
    .from(pageVisits);

  const [today] = await db
    .select({
      pv: sql<number>`count(*)`,
      uv: sql<number>`count(distinct ${pageVisits.visitorHash})`,
    })
    .from(pageVisits)
    .where(sql`${pageVisits.visitedAt} >= ${todayMs}`);

  return c.json({
    totalPv: totals?.pv ?? 0,
    totalUv: totals?.uv ?? 0,
    todayPv: today?.pv ?? 0,
    todayUv: today?.uv ?? 0,
    updatedAt: Date.now(),
  });
}
