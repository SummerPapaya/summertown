import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, count, inArray, isNull } from "drizzle-orm";
import { createRouter, publicQuery, writeProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import {
  appleComments,
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
/** Page size for the guest-book feed: five top-level comments per page,
 * replies riding along with their root. */
const COMMENT_PAGE_SIZE = 5;

/* Commenting is chattier than leaving a wish, so it gets its own — stricter
 * — buckets on top of the shared writeProcedure ones. Tune without a
 * redeploy via the env vars. */
const COMMENT_RATE_LIMIT = Number.parseInt(
  process.env.COMMENT_RATE_LIMIT ?? "3",
  10,
);
const COMMENT_DAILY_LIMIT = Number.parseInt(
  process.env.COMMENT_DAILY_LIMIT ?? "10",
  10,
);

const optionalEmail = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
    message: "email must be empty or a valid address",
  })
  .optional();

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

  /* --- Album guest book -------------------------------------------------
   * Two-level threads: a page of top-level comments (parent_id IS NULL)
   * plus every approved reply belonging to them. The public payload never
   * returns `email` or `ip`. Photo thumbnails are NOT joined here: the
   * album page already has the photo list in memory and maps comment →
   * photo locally, which keeps this to two D1 queries (Workers caps
   * subrequests). */
  listAppleComments: publicQuery
    .input(paginationInput)
    .query(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      const offset = input?.cursor ?? 0;
      const limit = input?.limit ?? COMMENT_PAGE_SIZE;
      const rootWhere = and(
        eq(appleComments.status, PUBLIC_STATUS),
        isNull(appleComments.parentId),
      );
      const [roots, countRows] = await Promise.all([
        db
          .select({
            id: appleComments.id,
            photoId: appleComments.photoId,
            photoDate: appleComments.photoDate,
            nickname: appleComments.nickname,
            body: appleComments.body,
            createdAt: appleComments.createdAt,
          })
          .from(appleComments)
          .where(rootWhere)
          .orderBy(desc(appleComments.createdAt), desc(appleComments.id))
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(appleComments).where(rootWhere),
      ]);

      /* Replies read oldest-first inside their thread, chat-style. */
      const rootIds = roots.map((r) => r.id);
      const replies = rootIds.length
        ? await db
            .select({
              id: appleComments.id,
              parentId: appleComments.parentId,
              nickname: appleComments.nickname,
              isAdmin: appleComments.isAdmin,
              body: appleComments.body,
              createdAt: appleComments.createdAt,
            })
            .from(appleComments)
            .where(
              and(
                eq(appleComments.status, PUBLIC_STATUS),
                inArray(appleComments.parentId, rootIds),
              ),
            )
            .orderBy(asc(appleComments.createdAt), asc(appleComments.id))
        : [];

      const byParent = new Map<number, typeof replies>();
      for (const reply of replies) {
        const key = reply.parentId as number;
        const list = byParent.get(key);
        if (list) list.push(reply);
        else byParent.set(key, [reply]);
      }

      const total = countRows[0]?.value ?? 0;
      const nextOffset = offset + roots.length;
      return {
        items: roots.map((root) => ({
          ...root,
          replies: byParent.get(root.id) ?? [],
        })),
        total,
        nextCursor: nextOffset < total ? nextOffset : null,
      };
    }),

  addAppleComment: writeProcedure
    .input(
      z.object({
        nickname: z.string().trim().min(1).max(24),
        body: z.string().trim().min(1).max(500),
        email: optionalEmail,
        photoId: z.number().int().positive().nullable().optional(),
        /** Id of the top-level comment being replied to. Replying to a
         * reply is allowed but re-points to that reply's root, so threads
         * never nest deeper than two levels. */
        parentId: z.number().int().positive().nullable().optional(),
        clientId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      await rateLimit(
        ctx.env,
        `comment:${ctx.clientIp}`,
        COMMENT_RATE_LIMIT,
        60_000,
        "留言太快啦，歇一会儿再来。 / You're commenting too fast — take a breath.",
      );
      await rateLimit(
        ctx.env,
        `comment-day:${ctx.clientIp}`,
        COMMENT_DAILY_LIMIT,
        86_400_000,
        "你今天的留言次数用完啦，明天再来吧。 / You've reached today's comment limit — come back tomorrow.",
      );

      /* Same two layers as wishes/postcards: hard block never lands, soft
       * signals hold the row for a human. */
      guardAgainstSpam({
        nickname: input.nickname,
        body: input.body,
        email: input.email,
      });
      const verdict = isAdOrSuspicious(`${input.nickname}\n${input.body}`);

      /* Replies: the parent must exist and be public; a reply to a reply
       * re-points to its root so threads stay two levels deep. */
      let parentId: number | null = null;
      if (input.parentId) {
        const parent = await db.query.appleComments.findFirst({
          where: eq(appleComments.id, input.parentId),
          columns: { id: true, parentId: true, status: true },
        });
        if (!parent || parent.status !== PUBLIC_STATUS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The comment you're replying to is no longer available.",
          });
        }
        parentId = parent.parentId ?? parent.id;
      }

      /* Snapshot the photo's date so the comment still reads sensibly if
       * the photo is deleted later. Replies never carry a photo — they
       * belong to the thread, not to an apple. */
      let photoDate: string | null = null;
      if (input.photoId && !parentId) {
        const photo = await db.query.applePhotos.findFirst({
          where: eq(applePhotos.id, input.photoId),
          columns: { date: true },
        });
        photoDate = photo?.date ?? null;
      }

      const email = input.email ? input.email : null;

      if (input.clientId) {
        const existing = await db.query.appleComments.findFirst({
          where: eq(appleComments.clientId, input.clientId),
        });
        if (existing)
          return { id: existing.id, held: existing.status === "pending" };
      }

      let row;
      try {
        [row] = await db
          .insert(appleComments)
          .values({
            photoId: parentId ? null : (input.photoId ?? null),
            photoDate: parentId ? null : photoDate,
            parentId,
            isAdmin: false,
            nickname: input.nickname,
            email,
            body: input.body,
            status: verdict.spam ? "pending" : "approved",
            clientId: input.clientId ?? null,
            ip: ctx.clientIp,
          })
          .returning();
      } catch (err) {
        if (input.clientId) {
          const fallback = await db.query.appleComments.findFirst({
            where: eq(appleComments.clientId, input.clientId),
          });
          if (fallback)
            return { id: fallback.id, held: fallback.status === "pending" };
        }
        throw err;
      }

      /* held = true means the row is parked in the moderation queue: it was
       * written, but the public wall filters it out until /town-admin
       * approves it. Returned as a success so the client clears its outbox
       * instead of retrying (which would create a duplicate). */
      return { id: row.id, held: verdict.spam };
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
