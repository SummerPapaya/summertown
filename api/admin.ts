import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { createRouter, adminProcedure } from "./middleware";
import { getDb } from "./queries/connection";
import { applePhotos, newsletterSubs, postcards, wishes } from "@db/schema";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" });

/* Apple-photo uploads now stream to R2. The D1 row keeps metadata plus a
 * public URL; the original data URL never reaches D1. */
const MAX_DATA_URL_LENGTH = 8 * 1024 * 1024; // ~8 MB

const imageDataUrl = z
  .string()
  .startsWith("data:image/", { message: "image must be an image data URL" })
  .max(MAX_DATA_URL_LENGTH, { message: "image payload too large" });

const videoDataUrl = z
  .string()
  .startsWith("data:video/", { message: "video must be a video data URL" })
  .max(MAX_DATA_URL_LENGTH, { message: "video payload too large" });

async function uploadDataUrl(
  bucket: R2Bucket,
  key: string,
  dataUrl: string,
  contentType?: string,
): Promise<void> {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("invalid data url");
  const base64 = dataUrl.slice(comma + 1);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: contentType ?? "application/octet-stream" },
  });
}

/** Build a public R2 URL. Configure R2 custom domain in production; the
 * `r2.dev` subdomain here is a placeholder that works out of the box. */
function publicUrl(env: Env, key: string): string {
  const host = (env as unknown as { R2_PUBLIC_HOST?: string }).R2_PUBLIC_HOST;
  if (host) return `https://${host}/${key}`;
  // Fallback: serve through the Worker. Cheap for low traffic; swap for
  // custom domain once Apple Admin traffic justifies it.
  return `https://photos.r2.local/${key}`;
}

export const adminRouter = createRouter({
  listSubs: adminProcedure.query(async ({ ctx }) => {
    return getDb(ctx.env)
      .select()
      .from(newsletterSubs)
      .orderBy(desc(newsletterSubs.createdAt), desc(newsletterSubs.id));
  }),

  exportSubs: adminProcedure.query(async ({ ctx }) => {
    const rows = await getDb(ctx.env)
      .select({ email: newsletterSubs.email })
      .from(newsletterSubs)
      .orderBy(desc(newsletterSubs.createdAt), desc(newsletterSubs.id));
    return rows.map((row) => row.email).join("\n");
  }),

  listApplePhotos: adminProcedure.query(async ({ ctx }) => {
    return getDb(ctx.env)
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
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      const env = ctx.env;
      const imageKey = `apples/${input.date}/image`;
      const videoKey = `apples/${input.date}/video`;

      await uploadDataUrl(env.PHOTOS, imageKey, input.image, "image/jpeg");
      if (input.video) {
        await uploadDataUrl(env.PHOTOS, videoKey, input.video, "video/quicktime");
      }

      const values = {
        date: input.date,
        description: input.description,
        imageKey,
        imageUrl: publicUrl(env, imageKey),
        videoKey: input.video ? videoKey : null,
        videoUrl: input.video ? publicUrl(env, videoKey) : null,
        updatedAt: new Date(),
      };

      /* SQLite has no native `ON CONFLICT … DO UPDATE`, so we do a small
       * upsert by hand — keeps the surface portable between D1 and local
       * better-sqlite3 drivers. */
      const existing = await db.query.applePhotos.findFirst({
        where: eq(applePhotos.date, input.date),
      });
      let row;
      if (existing) {
        await db
          .update(applePhotos)
          .set(values)
          .where(eq(applePhotos.date, input.date));
        [row] = await db
          .select()
          .from(applePhotos)
          .where(eq(applePhotos.date, input.date))
          .limit(1);
      } else {
        [row] = await db.insert(applePhotos).values(values).returning();
      }
      return row;
    }),

  deleteApplePhoto: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb(ctx.env).delete(applePhotos).where(eq(applePhotos.id, input.id));
      return { ok: true };
    }),

  /* --- Moderation queue --- */

  listPending: adminProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env);
    const [pendingWishes, pendingPostcards] = await Promise.all([
      db
        .select()
        .from(wishes)
        .where(eq(wishes.status, "pending"))
        .orderBy(desc(wishes.createdAt)),
      db
        .select()
        .from(postcards)
        .where(eq(postcards.status, "pending"))
        .orderBy(desc(postcards.createdAt)),
    ]);
    return { wishes: pendingWishes, postcards: pendingPostcards };
  }),

  approveWish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb(ctx.env)
        .update(wishes)
        .set({ status: "approved" })
        .where(eq(wishes.id, input.id));
      return { ok: true };
    }),

  rejectWish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb(ctx.env)
        .update(wishes)
        .set({ status: "rejected" })
        .where(eq(wishes.id, input.id));
      return { ok: true };
    }),

  approvePostcard: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb(ctx.env)
        .update(postcards)
        .set({ status: "approved" })
        .where(eq(postcards.id, input.id));
      return { ok: true };
    }),

  rejectPostcard: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb(ctx.env)
        .update(postcards)
        .set({ status: "rejected" })
        .where(eq(postcards.id, input.id));
      return { ok: true };
    }),

  bulkApprove: adminProcedure
    .input(
      z.object({
        kind: z.enum(["wish", "postcard"]),
        ids: z.array(z.number().int().positive()).min(1).max(100),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      const table = input.kind === "wish" ? wishes : postcards;
      await db
        .update(table)
        .set({ status: "approved" })
        .where(inArray(table.id, input.ids));
      return { ok: true, count: input.ids.length };
    }),

  listWishes: adminProcedure.query(async ({ ctx }) => {
    return getDb(ctx.env)
      .select()
      .from(wishes)
      .orderBy(desc(wishes.createdAt), desc(wishes.id));
  }),

  deleteWish: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb(ctx.env).delete(wishes).where(eq(wishes.id, input.id));
      return { ok: true };
    }),

  listPostcards: adminProcedure.query(async ({ ctx }) => {
    return getDb(ctx.env)
      .select()
      .from(postcards)
      .orderBy(desc(postcards.createdAt), desc(postcards.id));
  }),

  deletePostcard: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await getDb(ctx.env).delete(postcards).where(eq(postcards.id, input.id));
      return { ok: true };
    }),
});
