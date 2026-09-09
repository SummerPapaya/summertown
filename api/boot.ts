import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import type { ApiEnv } from "./lib/types";
import { handleVisit, handleStats } from "./visit";

const app = new Hono<ApiEnv>();

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

/* R2 objects are private by default. Serve them through the Worker so the
 * Apple album needs no R2 custom domain — set R2_PUBLIC_HOST to bypass. */
app.get("/photos/*", async (c) => {
  const key = c.req.path.slice("/photos/".length);
  if (!key) return c.json({ error: "Not Found" }, 404);
  const object = await c.env.PHOTOS.get(key);
  if (!object) return c.json({ error: "Not Found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

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
