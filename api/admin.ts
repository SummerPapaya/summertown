import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { applePhotos, newsletterSubs, postcards, wishes } from "@db/schema";

// Token gate: requires header `x-admin-token` to match ADMIN_TOKEN env var.
const adminProcedure = publicQuery.use(({ ctx, next }) => {
  const expected = process.env.ADMIN_TOKEN;
  const provided = ctx.req.headers.get("x-admin-token");
  if (!expected || provided !== expected) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid admin token" });
  }
  return next();
});

const MAX_DATA_URL_LENGTH = 4 * 1024 * 1024; // ~4MB

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

const imageDataUrl = z
  .string()
  .startsWith("data:image/", { message: "image must be an image data URL" })
  .max(MAX_DATA_URL_LENGTH, { message: "image payload too large" });

const videoDataUrl = z
  .string()
  .startsWith("data:video/", { message: "video must be a video data URL" })
  .max(MAX_DATA_URL_LENGTH, { message: "video payload too large" });

export const adminRouter = createRouter({
  listSubs: adminProcedure.query(async () => {
    return getDb()
      .select()
      .from(newsletterSubs)
      .orderBy(desc(newsletterSubs.createdAt), desc(newsletterSubs.id));
  }),

  listApplePhotos: adminProcedure.query(async () => {
    return getDb()
      .select()
      .from(applePhotos)
      .orderBy(desc(applePhotos.date));
  }),

  upsertApplePhoto: adminProcedure
    .input(
      z.object({
        date: dateString,
        description: z.string().max(500).default(""),
        image: imageDataUrl,
        video: videoDataUrl.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .insert(applePhotos)
        .values({
          date: input.date,
          description: input.description,
          image: input.image,
          video: input.video ?? null,
        })
        .onDuplicateKeyUpdate({
          set: {
            description: input.description,
            image: input.image,
            video: input.video ?? null,
          },
        });
      return db.query.applePhotos.findFirst({
        where: eq(applePhotos.date, input.date),
      });
    }),

  deleteApplePhoto: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(applePhotos).where(eq(applePhotos.id, input.id));
      return { ok: true };
    }),

  listWishes: adminProcedure.query(async () => {
    return getDb()
      .select()
      .from(wishes)
      .orderBy(desc(wishes.createdAt), desc(wishes.id));
  }),

  deleteWish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(wishes).where(eq(wishes.id, input.id));
      return { ok: true };
    }),

  listPostcards: adminProcedure.query(async () => {
    return getDb()
      .select()
      .from(postcards)
      .orderBy(desc(postcards.createdAt), desc(postcards.id));
  }),

  deletePostcard: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await getDb().delete(postcards).where(eq(postcards.id, input.id));
      return { ok: true };
    }),

  exportSubs: adminProcedure.query(async () => {
    const rows = await getDb()
      .select({ email: newsletterSubs.email })
      .from(newsletterSubs)
      .orderBy(desc(newsletterSubs.createdAt), desc(newsletterSubs.id));
    return rows.map((row) => row.email).join("\n");
  }),
});
