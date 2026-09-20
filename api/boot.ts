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

/* ---- Per-page link cards ------------------------------------------------
 * WeChat, iMessage, Slack & co. read the <meta> tags out of the *server*
 * response; they never run our JS. So a client-side <head> tweak is invisible
 * to them, and every page would otherwise share the town's card from
 * index.html. A deep link has no file behind it, which means this Worker is
 * the only place that sees the request — the swap happens here.
 *
 * Note that the platforms cache card metadata per URL, so a changed card can
 * take a while to show up on a link that has already been shared. */
type LinkCard = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

const LINK_CARDS: Record<string, LinkCard> = {
  "/apple-album": {
    title: "An Apple A Day - 苹果相册",
    description: "一天一颗小苹果，来自夏天镇的果园 · Daily apple photos from Summer Town.",
    image: "/og/apple-album.png",
    imageAlt: "An Apple A Day — a polaroid of the Apple Cottage",
  },
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* Rewrites the card by walking the <meta> tags one at a time. Matching a whole
 * tag (rather than expecting `name="…" content="…"` side by side) matters: the
 * bundler happily wraps a long tag across lines, which silently defeats a
 * naive regex. */
function withCard(html: string, card: LinkCard, pathname: string, origin: string): string {
  const title = escapeAttr(card.title);
  const values: Record<string, string> = {
    title,
    description: escapeAttr(card.description),
    "og:title": title,
    "og:description": escapeAttr(card.description),
    "og:image": escapeAttr(new URL(card.image, origin).toString()),
    "og:image:alt": escapeAttr(card.imageAlt),
    "og:url": escapeAttr(new URL(pathname, origin).toString()),
    "twitter:title": title,
    "twitter:description": escapeAttr(card.description),
    "twitter:image": escapeAttr(new URL(card.image, origin).toString()),
  };

  return html
    .replace(/<meta\b[^>]*>/gi, (tag) => {
      const key = /\b(?:property|name)\s*=\s*"([^"]+)"/i.exec(tag)?.[1];
      const value = key === undefined ? undefined : values[key.toLowerCase()];
      if (value === undefined) return tag;
      if (/\bcontent\s*=\s*"/i.test(tag)) {
        return tag.replace(/(\bcontent\s*=\s*")[^"]*(")/i, (_m, before: string, after: string) => before + value + after);
      }
      return tag.replace(/(\s*\/?>)$/, (_m, end: string) => ` content="${value}"${end}`);
    })
    /* <title> is what the crawler falls back to, and what the tab shows. */
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
}

/* The Magic Room is its own static sub-app inside the assets directory at
 * `magic-room/`. The bare path matches no file, and the assets layer would
 * hand it to this Worker, where the SPA fallback below would render the town
 * map instead of the room — redirect it to the sub-app's index first. The
 * `_redirects` file does the same job at the assets layer; this is the
 * belt-and-braces copy. */
// Preserve any query string so the sub-app can pick up ?lang= (used by the
// DetailCard entry to mirror the town's current language).
app.get("/magic-room", (c) => c.redirect(`/magic-room/${new URL(c.req.url).search}`, 301));

/* Static assets — produced by `vite build` into `dist/public/`. Requests that
 * match a real file (`/`, `/assets/*`, `/logo.svg`, …) are served by the
 * assets layer *before* this Worker runs, so this handler only sees paths with
 * no matching file: `/api/*` (handled above) and client-side routes such as
 * `/town-admin` or `/apple-album`.
 *
 * `env.STATIC` is a Workers Static Assets binding — a Fetcher, so it exposes
 * `fetch()`, not `get()`. Delegating with fetch() returns 404 for an unmatched
 * path; we then serve `/index.html` so the SPA router can resolve the deep
 * link. (Without this, deep links 500 instead of rendering.) */
app.get("*", async (c) => {
  const res = await c.env.STATIC.fetch(c.req.raw);
  if (res.status !== 404) return res;

  const indexUrl = new URL("/index.html", c.req.url).toString();
  const index = await c.env.STATIC.fetch(new Request(indexUrl));

  const pathname = c.req.path.replace(/\/+$/, "") || "/";
  const card = LINK_CARDS[pathname];
  if (!card || !index.ok) return index;

  const headers = new Headers(index.headers);
  /* The body is rewritten, and the runtime has already undone any content
   * encoding, so every validator for the original file has to go. */
  for (const stale of ["content-length", "content-encoding", "etag", "last-modified"]) {
    headers.delete(stale);
  }
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(withCard(await index.text(), card, pathname, new URL(c.req.url).origin), {
    status: 200,
    headers,
  });
});

export default app;
