import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

/**
 * Returns a Drizzle client bound to the request's D1 instance. We build a
 * new client per request instead of a global singleton because the D1
 * binding only lives on the request env.
 */
export function getDb(env: Env): DrizzleD1Database<typeof fullSchema> {
  return drizzle(env.DB, { schema: fullSchema });
}

export type DbClient = ReturnType<typeof getDb>;
