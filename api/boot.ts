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

/* Static assets — produced by `vite build` into `dist/public/`. Requests that
 * match a real file (`/`, `/assets/*`, `/logo.svg`, …) are served by the
 * assets layer *before* this Worker runs, so this handler only sees paths with
 * no matching file: `/api/*` (handled above) and client-side routes such as
 * `/town-admin` or `/apple-admin`.
 *
 * `env.STATIC` is a Workers Static Assets binding — a Fetcher, so it exposes
 * `fetch()`, not `get()`. Delegating with fetch() returns 404 for an unmatched
 * path; we then serve `/index.html` so the SPA router can resolve the deep
 * link. (Without this, deep links 500 instead of rendering.) */
app.get("*", async (c) => {
  const res = await c.env.STATIC.fetch(c.req.raw);
  if (res.status !== 404) return res;
  const indexUrl = new URL("/index.html", c.req.url).toString();
  return c.env.STATIC.fetch(new Request(indexUrl));
});

export default app;
