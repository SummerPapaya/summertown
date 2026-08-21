import {
  mysqlTable,
  serial,
  varchar,
  mediumtext,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const wishes = mysqlTable("wishes", {
  id: serial("id").primaryKey(),
  text: varchar("text", { length: 120 }).notNull(),
  accent: varchar("accent", { length: 9 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Wish = typeof wishes.$inferSelect;
export type InsertWish = typeof wishes.$inferInsert;

export const postcards = mysqlTable("postcards", {
  id: serial("id").primaryKey(),
  message: varchar("message", { length: 280 }).notNull(),
  signature: varchar("signature", { length: 60 }).notNull(),
  doodle: varchar("doodle", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Postcard = typeof postcards.$inferSelect;
export type InsertPostcard = typeof postcards.$inferInsert;

export const newsletterSubs = mysqlTable("newsletter_subs", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 190 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewsletterSub = typeof newsletterSubs.$inferSelect;
export type InsertNewsletterSub = typeof newsletterSubs.$inferInsert;

export const footprints = mysqlTable(
  "footprints",
  {
    id: serial("id").primaryKey(),
    ip: varchar("ip", { length: 45 }).notNull(),
    day: varchar("day", { length: 10 }).notNull(), // YYYY-MM-DD, UTC
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("footprints_ip_day_unique").on(table.ip, table.day)],
);

export type Footprint = typeof footprints.$inferSelect;
export type InsertFootprint = typeof footprints.$inferInsert;

export const applePhotos = mysqlTable("apple_photos", {
  id: serial("id").primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  description: varchar("description", { length: 500 }).notNull().default(""),
  image: mediumtext("image").notNull(), // base64 data URL
  video: mediumtext("video"), // base64 data URL for live-photo motion
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
});

export type ApplePhoto = typeof applePhotos.$inferSelect;
export type InsertApplePhoto = typeof applePhotos.$inferInsert;
