import { z } from "zod";
import { desc, eq, and } from "drizzle-orm";
import { createRouter, publicQuery, writeProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { applePhotos, footprints, newsletterSubs, postcards, wishes } from "@db/schema";
import { isAdOrSuspicious } from "./lib/moderation";
import { TRPCError } from "@trpc/server";

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
    const [items, total] = await Promise.all([
      db
        .select()
        .from(wishes)
        .where(where)
        .orderBy(desc(wishes.createdAt), desc(wishes.id))
        .limit(limit)
        .offset(offset),
      db.$count(wishes).where(where),
    ]);
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
      const verdict = isAdOrSuspicious(input.text);

      /* Idempotency: same clientId returning twice is a no-op. The unique
       * index `wishes_client_id_unique` ensures SQLite enforces it. */
      if (input.clientId) {
        const existing = await db.query.wishes.findFirst({
          where: eq(wishes.clientId, input.clientId),
        });
        if (existing) return existing;
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
          if (fallback) return fallback;
        }
        throw err;
      }

      if (verdict.spam) {
        throw new TRPCError({
          code: "ACCEPTED",
          message: `Held for review: ${verdict.reason ?? "flagged"}`,
        });
      }
      return row;
    }),

  listPostcards: publicQuery.input(paginationInput).query(async ({ input, ctx }) => {
    const db = getDb(ctx.env);
    const offset = input?.cursor ?? 0;
    const limit = input?.limit ?? DEFAULT_PAGE_SIZE;
    const where = eq(postcards.status, PUBLIC_STATUS);
    const [items, total] = await Promise.all([
      db
        .select()
        .from(postcards)
        .where(where)
        .orderBy(desc(postcards.createdAt), desc(postcards.id))
        .limit(limit)
        .offset(offset),
      db.$count(postcards).where(where),
    ]);
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
          if (fallback) return fallback;
        }
        throw err;
      }

      if (verdict.spam) {
        throw new TRPCError({
          code: "ACCEPTED",
          message: `Held for review: ${verdict.reason ?? "flagged"}`,
        });
      }
      return row;
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
    return getDb(ctx.env)
      .select()
      .from(applePhotos)
      .orderBy(desc(applePhotos.date));
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
