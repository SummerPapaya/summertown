import { z } from "zod";
import { and, desc, eq, count } from "drizzle-orm";
import { createRouter, publicQuery, writeProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import {
  appleLikes,
  applePhotos,
  footprints,
  newsletterSubs,
  postcards,
  wishes,
} from "@db/schema";
import { isAdOrSuspicious } from "./lib/moderation";
import { rateLimit } from "./lib/ratelimit";
import { guardAgainstSpam } from "./middleware";

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, {
    message: "accent must be a hex color string",
  });

/* offset-based pagination: `cursor` is the offset of the next page */
const paginationInput = z
  .object({
    cursor: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .optional();

const DEFAULT_PAGE_SIZE = 12;

/* Public list endpoints always filter to `status = 'approved'`. Admins use
 * the `admin.*` router to view or moderate `pending` rows. */
const PUBLIC_STATUS = "approved" as const;

export const townRouter = createRouter({
  listWishes: publicQuery.input(paginationInput).query(async ({ input, ctx }) => {
    const db = getDb(ctx.env);
    const offset = input?.cursor ?? 0;
    const limit = input?.limit ?? DEFAULT_PAGE_SIZE;
    const where = eq(wishes.status, PUBLIC_STATUS);
    const [items, countRows] = await Promise.all([
      db
        .select({
          id: wishes.id,
          text: wishes.text,
          accent: wishes.accent,
          createdAt: wishes.createdAt,
        })
        .from(wishes)
        .where(where)
        .orderBy(desc(wishes.createdAt), desc(wishes.id))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(wishes).where(where),
    ]);
    const total = countRows[0]?.value ?? 0;
    const nextOffset = offset + items.length;
    return { items, total, nextCursor: nextOffset < total ? nextOffset : null };
  }),

  addWish: writeProcedure
    .input(
      z.object({
        text: z.string().min(1).max(60),
        accent: hexColor,
        clientId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      // Hard block: script injection / XSS → 400, never stored.
      guardAgainstSpam({ text: input.text });
      const verdict = isAdOrSuspicious(input.text);

      /* Idempotency: same clientId returning twice is a no-op. The unique
       * index `wishes_client_id_unique` ensures SQLite enforces it. */
      if (input.clientId) {
        const existing = await db.query.wishes.findFirst({
          where: eq(wishes.clientId, input.clientId),
        });
        if (existing) return { id: existing.id, held: existing.status === "pending" };
      }

      let row;
      try {
        [row] = await db
          .insert(wishes)
          .values({
            text: input.text,
            accent: input.accent,
            status: verdict.spam ? "pending" : "approved",
            clientId: input.clientId ?? null,
            ip: ctx.clientIp,
          })
          .returning();
      } catch (err) {
        // Race condition: another concurrent insert with same clientId won.
        if (input.clientId) {
          const fallback = await db.query.wishes.findFirst({
            where: eq(wishes.clientId, input.clientId),
          });
          if (fallback) return { id: fallback.id, held: fallback.status === "pending" };
        }
        throw err;
      }

      /* Flagged rows were written with status='pending'; the public list only
       * shows approved ones, so they simply never appear on the wall. We
       * return normally (not an error) so the client doesn't stash the entry
       * in its outbox and retry — that would duplicate it. Only echo a safe
       * subset (never `ip` / `client_id`). */
      return { id: row.id, held: verdict.spam };
    }),

  listPostcards: publicQuery.input(paginationInput).query(async ({ input, ctx }) => {
    const db = getDb(ctx.env);
    const offset = input?.cursor ?? 0;
    const limit = input?.limit ?? DEFAULT_PAGE_SIZE;
    const where = eq(postcards.status, PUBLIC_STATUS);
    const [items, countRows] = await Promise.all([
      db
        .select({
          id: postcards.id,
          message: postcards.message,
          signature: postcards.signature,
          doodle: postcards.doodle,
          createdAt: postcards.createdAt,
        })
        .from(postcards)
        .where(where)
        .orderBy(desc(postcards.createdAt), desc(postcards.id))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(postcards).where(where),
    ]);
    const total = countRows[0]?.value ?? 0;
    const nextOffset = offset + items.length;
    return { items, total, nextCursor: nextOffset < total ? nextOffset : null };
  }),

  addPostcard: writeProcedure
    .input(
      z.object({
        message: z.string().min(1).max(280),
        signature: z.string().min(1).max(60),
        doodle: z.string().min(1).max(20),
        clientId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      // Hard block: script injection / XSS → 400, never stored.
      guardAgainstSpam({ message: input.message, signature: input.signature });
      const text = `${input.message}\n— ${input.signature}\n${input.doodle}`;
      const verdict = isAdOrSuspicious(text);

      if (input.clientId) {
        const existing = await db.query.postcards.findFirst({
          where: eq(postcards.clientId, input.clientId),
        });
        if (existing) return existing;
      }

      let row;
      try {
        [row] = await db
          .insert(postcards)
          .values({
            message: input.message,
            signature: input.signature,
            doodle: input.doodle,
            status: verdict.spam ? "pending" : "approved",
            clientId: input.clientId ?? null,
            ip: ctx.clientIp,
          })
          .returning();
      } catch (err) {
        if (input.clientId) {
          const fallback = await db.query.postcards.findFirst({
            where: eq(postcards.clientId, input.clientId),
          });
          if (fallback) return { id: fallback.id, held: fallback.status === "pending" };
        }
        throw err;
      }

      /* Flagged rows were written with status='pending'; the public list only
       * shows approved ones, so they simply never appear on the wall. We
       * return normally (not an error) so the client doesn't stash the entry
       * in its outbox and retry — that would duplicate it. Only echo a safe
       * subset (never `ip` / `client_id`). */
      return { id: row.id, held: verdict.spam };
    }),

  subscribe: publicQuery
    .input(
      z.object({
        email: z.string().email().max(190),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      try {
        await db.insert(newsletterSubs).values({ email: input.email.toLowerCase() });
      } catch (err) {
        // idempotent — duplicate is fine; SQLite raises UNIQUE constraint.
        // We swallow it by checking after; throws anything else.
        const existing = await db.query.newsletterSubs.findFirst({
          where: eq(newsletterSubs.email, input.email.toLowerCase()),
        });
        if (!existing) throw err;
      }
      return { ok: true };
    }),

  listApplePhotos: publicQuery.query(async ({ ctx }) => {
    /* Only the display fields: R2 keys and import bookkeeping stay on the
     * server, and a back-filled year is ~290 rows, so trimming matters. */
    return getDb(ctx.env)
      .select({
        id: applePhotos.id,
        date: applePhotos.date,
        description: applePhotos.description,
        imageUrl: applePhotos.imageUrl,
        thumbUrl: applePhotos.thumbUrl,
        videoUrl: applePhotos.videoUrl,
      })
      .from(applePhotos)
      .orderBy(desc(applePhotos.date));
  }),

  /* Like tallies per photo, plus whether *this* device has already liked
   * today. Kept separate from listApplePhotos so the album payload stays lean
   * and the counts can refresh on their own. */
  listAppleLikes: publicQuery
    .input(
      z.object({ deviceId: z.string().min(8).max(80).optional() }).nullish(),
    )
    .query(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      const rows = await db
        .select({ photoId: appleLikes.photoId, value: count() })
        .from(appleLikes)
        .groupBy(appleLikes.photoId);
      const counts: Record<string, number> = {};
      for (const r of rows) counts[String(r.photoId)] = r.value;

      let liked: number[] = [];
      if (input?.deviceId) {
        const day = new Date().toISOString().slice(0, 10);
        const mine = await db
          .select({ photoId: appleLikes.photoId })
          .from(appleLikes)
          .where(
            and(eq(appleLikes.device, input.deviceId), eq(appleLikes.day, day)),
          );
        liked = mine.map((m) => m.photoId);
      }
      return { counts, liked };
    }),

  /* One like per photo, per device, per UTC day — the unique index enforces
   * it. A duplicate insert is caught and reported as `liked: false` so the
   * client settles on the real total instead of double-counting. */
  likeApple: publicQuery
    .input(
      z.object({
        photoId: z.number().int().positive(),
        deviceId: z.string().min(8).max(80),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      // The daily rule is per device; this per-IP gate just stops a script
      // from racing through freshly minted device ids.
      await rateLimit(ctx.env, `like:${ctx.clientIp}`, 90, 60_000);
      const day = new Date().toISOString().slice(0, 10);
      let liked = true;
      try {
        await db.insert(appleLikes).values({
          photoId: input.photoId,
          device: input.deviceId,
          day,
          ip: ctx.clientIp,
        });
      } catch {
        liked = false; // already liked today — the unique index said no
      }
      const [row] = await db
        .select({ value: count() })
        .from(appleLikes)
        .where(eq(appleLikes.photoId, input.photoId));
      return { liked, count: row?.value ?? 0 };
    }),

  getFootprints: publicQuery.query(async ({ ctx }) => {
    const count = await getDb(ctx.env).$count(footprints);
    return { count };
  }),

  addFootprint: publicQuery.mutation(async ({ ctx }) => {
    const db = getDb(ctx.env);
    const ip = ctx.clientIp;
    const day = new Date().toISOString().slice(0, 10);
    let added = true;
    try {
      await db.insert(footprints).values({ ip, day });
    } catch {
      added = false; // deduped
    }
    const count = await db.$count(footprints);
    return { count, added };
  }),
});
