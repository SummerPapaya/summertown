import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { applePhotos, footprints, newsletterSubs, postcards, wishes } from "@db/schema";

function isDuplicateEntry(error: unknown): boolean {
  // Drizzle wraps driver errors in a "Failed query" error; the original
  // mysql2 error (code "ER_DUP_ENTRY" / errno 1062) is on `.cause`.
  let current: unknown = error;
  while (current && typeof current === "object") {
    const err = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) return true;
    if (err.cause === current) break;
    current = err.cause;
  }
  return false;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

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

export const townRouter = createRouter({
  listWishes: publicQuery.input(paginationInput).query(async ({ input }) => {
    const db = getDb();
    const offset = input?.cursor ?? 0;
    const limit = input?.limit ?? DEFAULT_PAGE_SIZE;
    const [items, total] = await Promise.all([
      db
        .select()
        .from(wishes)
        .orderBy(desc(wishes.createdAt), desc(wishes.id))
        .limit(limit)
        .offset(offset),
      db.$count(wishes),
    ]);
    const nextOffset = offset + items.length;
    return { items, total, nextCursor: nextOffset < total ? nextOffset : null };
  }),

  addWish: publicQuery
    .input(
      z.object({
        text: z.string().min(1).max(60),
        accent: hexColor,
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(wishes)
        .values({ text: input.text, accent: input.accent })
        .$returningId();
      return db.query.wishes.findFirst({ where: eq(wishes.id, id) });
    }),

  listPostcards: publicQuery.input(paginationInput).query(async ({ input }) => {
    const db = getDb();
    const offset = input?.cursor ?? 0;
    const limit = input?.limit ?? DEFAULT_PAGE_SIZE;
    const [items, total] = await Promise.all([
      db
        .select()
        .from(postcards)
        .orderBy(desc(postcards.createdAt), desc(postcards.id))
        .limit(limit)
        .offset(offset),
      db.$count(postcards),
    ]);
    const nextOffset = offset + items.length;
    return { items, total, nextCursor: nextOffset < total ? nextOffset : null };
  }),

  addPostcard: publicQuery
    .input(
      z.object({
        message: z.string().min(1).max(280),
        signature: z.string().min(1).max(60),
        doodle: z.string().min(1).max(20),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [{ id }] = await db
        .insert(postcards)
        .values({
          message: input.message,
          signature: input.signature,
          doodle: input.doodle,
        })
        .$returningId();
      return db.query.postcards.findFirst({ where: eq(postcards.id, id) });
    }),

  subscribe: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      try {
        await db.insert(newsletterSubs).values({ email: input.email });
      } catch (error) {
        // Idempotent: duplicate email still reports success so we don't
        // leak whether the address was already subscribed.
        if (!isDuplicateEntry(error)) throw error;
      }
      return { ok: true };
    }),

  listApplePhotos: publicQuery.query(async () => {
    return getDb()
      .select()
      .from(applePhotos)
      .orderBy(desc(applePhotos.date));
  }),

  getFootprints: publicQuery.query(async () => {
    const count = await getDb().$count(footprints);
    return { count };
  }),

  addFootprint: publicQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const ip = clientIp(ctx.req);
    const day = utcDay();
    let added = true;
    try {
      await db.insert(footprints).values({ ip, day });
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      added = false; // this IP already visited today
    }
    const count = await db.$count(footprints);
    return { count, added };
  }),
});
