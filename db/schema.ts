import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* Wishes — appended to the Windbell Isle Pavilion */

export const wishes = sqliteTable(
  "wishes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    text: text("text").notNull(),
    accent: text("accent").notNull(),
    /** 'approved' | 'pending' | 'rejected'. Default = approved (auto-passed
     * moderation). Rows that match the keyword blacklist are stored as
     * 'pending' until reviewed in /town-admin. */
    status: text("status").notNull().default("approved"),
    /** Used for outbox-style dedup: same clientId is idempotent. */
    clientId: text("client_id"),
    ip: text("ip"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("wishes_created_at_idx").on(t.createdAt, t.id),
    index("wishes_status_idx").on(t.status),
    uniqueIndex("wishes_client_id_unique").on(t.clientId),
  ],
);

export type Wish = typeof wishes.$inferSelect;
export type InsertWish = typeof wishes.$inferInsert;

/* Postcards — pinned on the Town Journal wall */

export const postcards = sqliteTable(
  "postcards",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    message: text("message").notNull(),
    signature: text("signature").notNull(),
    doodle: text("doodle").notNull(),
    status: text("status").notNull().default("approved"),
    clientId: text("client_id"),
    ip: text("ip"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("postcards_created_at_idx").on(t.createdAt, t.id),
    index("postcards_status_idx").on(t.status),
    uniqueIndex("postcards_client_id_unique").on(t.clientId),
  ],
);

export type Postcard = typeof postcards.$inferSelect;
export type InsertPostcard = typeof postcards.$inferInsert;

/* Newsletter subscriptions — captured but not yet wired into an email
 * pipeline. Stored verbatim; downstream jobs will pick them up. */

export const newsletterSubs = sqliteTable(
  "newsletter_subs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("newsletter_subs_email_unique").on(t.email)],
);

export type NewsletterSub = typeof newsletterSubs.$inferSelect;
export type InsertNewsletterSub = typeof newsletterSubs.$inferInsert;

/* Footprints — legacy "x visitors" counter (a single IP per UTC day). Kept
 * alongside the new page_visits table so the Town can keep its existing
 * social-proof wording while we migrate. */

export const footprints = sqliteTable(
  "footprints",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ip: text("ip").notNull(),
    day: text("day").notNull(), // YYYY-MM-DD, UTC
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("footprints_ip_day_unique").on(t.ip, t.day)],
);

export type Footprint = typeof footprints.$inferSelect;
export type InsertFootprint = typeof footprints.$inferInsert;

/* Page visits — high-fidelity counter powering the public VisitCounter
 * component. visitorHash is sha256(ip + UA) so we never store raw IPs. */

export const pageVisits = sqliteTable(
  "page_visits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** sha256(ip + "|" + userAgent) — daily-bucketed UV counter keys off this. */
    visitorHash: text("visitor_hash").notNull(),
    path: text("path").notNull(),
    userAgent: text("user_agent"),
    /** Epoch milliseconds; indexed for daily / monthly rollups. */
    visitedAt: integer("visited_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("pv_visited_at_idx").on(t.visitedAt),
    index("pv_visitor_hash_idx").on(t.visitorHash),
  ],
);

export type PageVisit = typeof pageVisits.$inferSelect;
export type InsertPageVisit = typeof pageVisits.$inferInsert;

/* Apple photos — binary blobs now live in R2 (`PHOTOS` bucket).
 * D1 row keeps metadata + a public URL. */

export const applePhotos = sqliteTable(
  "apple_photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(),
    description: text("description").notNull().default(""),
    imageKey: text("image_key").notNull(),
    imageUrl: text("image_url").notNull(),
    videoKey: text("video_key"),
    videoUrl: text("video_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("apple_photos_date_unique").on(t.date)],
);

export type ApplePhoto = typeof applePhotos.$inferSelect;
export type InsertApplePhoto = typeof applePhotos.$inferInsert;

/* Rate-limit buckets (fallback). In production we use an in-memory bucket
 * inside the Worker; this table exists so migrations stay honest if we
 * ever want persistent or cross-region limits. */

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    bucket: text("bucket").notNull(),
    count: integer("count").notNull().default(0),
    resetAt: integer("reset_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("rate_limits_bucket_unique").on(t.bucket)],
);
