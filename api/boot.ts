import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import type { ApiEnv } from "./lib/types";
import { handleVisit, handleStats } from "./visit";

type Bindings = ApiEnv;

const app = new Hono<{ Bindings: Bindings }>();

/* 5 MB covers everything we expect except Apple-photo binaries, which now
 * stream through R2 (handled in api/admin.ts and never hits this route). */
app.use("/api/*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));

/* tRPC over fetch — works on Workers + Node with the same handler. */
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: (opts) => createContext(opts, c.env, c.executionCtx),
  });
});

/* Bare Hono routes for the visit counter (low overhead, no tRPC). */
app.post("/api/visit", (c) => handleVisit(c));
app.get("/api/stats/site", (c) => handleStats(c));

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

/* Static assets — produced by `vite build` into `dist/`. Bindings.STATIC
 * is the Workers Static Assets binding declared in wrangler.toml `[assets]`. */
app.get("*", async (c) => {
  const { env } = c;
  const url = new URL(c.req.url);
  const asset = await env.STATIC.get(url.pathname);
  if (asset) return asset;
  // SPA fallback for client-side routes
  const fallback = await env.STATIC.get("/index.html");
  return fallback ?? new Response("Not Found", { status: 404 });
});

export default app;
