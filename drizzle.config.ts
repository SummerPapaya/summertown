import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Cloudflare D1 credentials are read at migrate/ push time. In CI they come
// from the CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID
// secrets; locally copy `.dev.vars.example` to `.dev.vars` and export them
// before running `npm run db:*`.
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? "",
    token: process.env.CLOUDFLARE_API_TOKEN ?? "",
  },
  verbose: true,
  strict: true,
});
