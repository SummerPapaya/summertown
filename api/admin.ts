import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
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

/** Copy an R2 object so a photo can be re-dated without losing its media. */
async function copyObject(
  bucket: R2Bucket,
  from: string,
  to: string,
): Promise<void> {
  if (!from || from === to) return;
  const obj = await bucket.get(from);
  if (!obj) return;
  await bucket.put(to, await obj.arrayBuffer(), {
    httpMetadata: obj.httpMetadata,
  });
}

/** Build a public R2 URL. Set `R2_PUBLIC_HOST` (an R2 custom domain) to serve
 * objects straight from R2; otherwise they stream through the Worker's
 * `/photos/*` route, which needs no extra DNS. */
function publicUrl(env: Env, key: string): string {
  const host = (env as unknown as { R2_PUBLIC_HOST?: string }).R2_PUBLIC_HOST;
  if (host) return `https://${host}/${key}`;
  return `/photos/${key}`;
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
        /* `id` makes an edit follow the row instead of the date, which is what
         * lets an entry be *moved* into an empty day (a catch-up 即刻 post that
         * landed on the wrong one, say). Without it the row is matched by
         * date, so changing the date would create a second entry. */
        id: z.number().int().positive().optional(),
        date: dateString,
        description: z.string().max(500).default(""),
        /* Optional so an edit can change only the description: when omitted,
         * the existing R2 object for that date is kept. Required in practice
         * when creating a new date (guarded below). */
        image: imageDataUrl.optional(),
        video: videoDataUrl.optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb(ctx.env);
      const env = ctx.env;
      const imageKey = `apples/${input.date}/image`;
      const videoKey = `apples/${input.date}/video`;
      const thumbKey = `apples/${input.date}/thumb`;

      const byId = input.id
        ? await db.query.applePhotos.findFirst({
            where: eq(applePhotos.id, input.id),
          })
        : undefined;
      const existing =
        byId ??
        (await db.query.applePhotos.findFirst({
          where: eq(applePhotos.date, input.date),
        }));

      if (!existing && !input.image) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A photo is required when adding a new date",
        });
      }

      /* Moving to a taken day would silently duplicate the album entry. */
      if (existing && existing.date !== input.date) {
        const clash = await db.query.applePhotos.findFirst({
          where: eq(applePhotos.date, input.date),
        });
        if (clash) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `${input.date} already has an apple — move or delete it first`,
          });
        }
      }

      /* Re-upload only what was supplied; untouched media keeps its object —
       * or, when the date changed, is copied to the new day's key. */
      let finalImageKey = existing?.imageKey ?? imageKey;
      let finalVideoKey = existing?.videoKey ?? null;
      if (input.image) {
        await uploadDataUrl(env.PHOTOS, imageKey, input.image, "image/jpeg");
        finalImageKey = imageKey;
      } else if (existing && existing.date !== input.date && existing.imageKey) {
        await copyObject(env.PHOTOS, existing.imageKey, imageKey);
        finalImageKey = imageKey;
      }
      if (input.video) {
        await uploadDataUrl(env.PHOTOS, videoKey, input.video, "video/quicktime");
        finalVideoKey = videoKey;
      } else if (existing && existing.date !== input.date && existing.videoKey) {
        await copyObject(env.PHOTOS, existing.videoKey, videoKey);
        finalVideoKey = videoKey;
      }
      /* Hand-uploaded photos have no small copy (the browser would have to
       * re-encode them); the album falls back to the full image for those.
       * Imported and re-dated entries keep or carry their thumbnail. */
      let finalThumbKey = existing?.thumbKey ?? null;
      if (existing && existing.date !== input.date && existing.thumbKey) {
        await copyObject(env.PHOTOS, existing.thumbKey, thumbKey);
        finalThumbKey = thumbKey;
      }

      const values = {
        date: input.date,
        description: input.description,
        imageKey: finalImageKey,
        imageUrl: publicUrl(env, finalImageKey),
        thumbKey: finalThumbKey,
        thumbUrl: finalThumbKey ? publicUrl(env, finalThumbKey) : null,
        videoKey: finalVideoKey,
        videoUrl: finalVideoKey ? publicUrl(env, finalVideoKey) : null,
        updatedAt: new Date(),
      };

      /* SQLite has no native `ON CONFLICT … DO UPDATE`, so we do a small
       * upsert by hand — keeps the surface portable between D1 and local
       * better-sqlite3 drivers. */
      let row;
      if (existing) {
        await db
          .update(applePhotos)
          .set(values)
          .where(eq(applePhotos.id, existing.id));
        [row] = await db
          .select()
          .from(applePhotos)
          .where(eq(applePhotos.id, existing.id))
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

  /* Run the 即刻 import immediately. The daily Cron Trigger does this too,
   * but waiting a day to find out whether the token works is miserable.
   * `probe: true` imports nothing — it reports what the API returned (above
   * all, whether a Live Photo clip is present) so field names can be checked
   * against a live account. */
  syncJike: adminProcedure
    .input(
      z
        .object({
          probe: z.boolean().optional(),
          /** Back-fill stop date; needs JIKE_ACCESS_TOKEN. */
          until: dateString.optional(),
          maxPages: z.number().int().positive().max(200).optional(),
          video: z.boolean().optional(),
          /** Start a back-fill over from the newest post, ignoring the saved
           * paging cursor. */
          fresh: z.boolean().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input, ctx }) => {
      const { syncJikeApples } = await import("./cron/jikeSync");
      return syncJikeApples(ctx.env, {
        probe: input?.probe === true,
        until: input?.until,
        maxPages: input?.maxPages,
        video: input?.video,
        fresh: input?.fresh === true,
      });
    }),

  /* --- Moderation queue --- */

  listPending: adminProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env);
    const [pendingWishes, pendingPostcards] = await Promise.all([
      db
        .select({
          id: wishes.id,
          text: wishes.text,
          accent: wishes.accent,
          createdAt: wishes.createdAt,
          status: wishes.status,
        })
        .from(wishes)
        .where(eq(wishes.status, "pending"))
        .orderBy(desc(wishes.createdAt)),
      db
        .select({
          id: postcards.id,
          message: postcards.message,
          signature: postcards.signature,
          doodle: postcards.doodle,
          createdAt: postcards.createdAt,
          status: postcards.status,
        })
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

  /* Reject every row currently held for moderation — a one-tap "clear the
   * queue". Rejected rows stay in the table (auditable) but are hidden from
   * both the public wall and the Pending tab. */
  clearPending: adminProcedure.mutation(async ({ ctx }) => {
    const db = getDb(ctx.env);
    await Promise.all([
      db.update(wishes).set({ status: "rejected" }).where(eq(wishes.status, "pending")),
      db.update(postcards).set({ status: "rejected" }).where(eq(postcards.status, "pending")),
    ]);
    return { ok: true as const };
  }),

  listWishes: adminProcedure.query(async ({ ctx }) => {
    return getDb(ctx.env)
      .select({
        id: wishes.id,
        text: wishes.text,
        accent: wishes.accent,
        createdAt: wishes.createdAt,
      })
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
      .select({
        id: postcards.id,
        message: postcards.message,
        signature: postcards.signature,
        doodle: postcards.doodle,
        createdAt: postcards.createdAt,
      })
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
