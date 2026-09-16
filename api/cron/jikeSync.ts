/* Daily import of the owner's own 即刻 (Jike) posts into the Apple album.
 *
 * Rules:
 *  - Only the owner's own timeline is read (never a keyword search across the
 *    platform, which has no legitimate API). With no token configured that is
 *    the public profile page; with `JIKE_ACCESS_TOKEN` set, the app API.
 *  - A post qualifies when its text contains 🍎 or "#一颗苹果".
 *  - The album is one photo per day. A post whose own day is already taken is
 *    *not* thrown away: catch-up posts ("补发昨天" / "昨天的苹果") are filed
 *    under the day they belong to, and anything left over spills into the
 *    nearest empty day before it. Only when there is no gap to fill is the
 *    post skipped — and even then it stays eligible for a later run.
 *  - Live Photos: when the response carries the clip it is copied into R2 as
 *    well, and the album renders it (it already plays video + shows a LIVE
 *    badge whenever `video_url` is set).
 *  - Images/video are copied into R2 rather than hot-linked, because platform
 *    CDN URLs expire and block hot-linking.
 *
 * Back-filling months of history does not fit in one invocation: a Worker on
 * the free plan gets 50 subrequests, and every image, clip and D1 statement
 * spends one. So the walk is streamed — import what fits, stash the
 * `loadMoreKey` cursor, resume on the next call. Imports de-duplicate on the
 * post id, which makes re-reading a page harmless.
 *
 * Any failure is swallowed and logged: a broken import must never take the
 * site down.
 */

import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { applePhotos, settings } from "@db/schema";
import {
  bestPictureUrl,
  fetchPersonalPage,
  listPostsFromProfile,
  liveVideoUrl,
  readTokensFromEnv,
  refreshTokens,
  thumbPictureUrl,
  type JikePost,
  type JikeTokens,
} from "../lib/jike";

/** A post qualifies if it carries either the apple emoji or the hashtag. */
const MARKERS = ["🍎", "#一颗苹果"];

const SOURCE = "jike";
const MAX_PAGES = 2;
const PAGE_SIZE = 20;

/** Workers on the free plan allow 50 subrequests per invocation; leave a
 * little head-room for the D1 statements around the loop. */
const MAX_CALLS = 45;

const CURSOR_KEY = "jike_cursor";

/** The owner's 即刻 id. It is public (it is what `okjk.co` links resolve to),
 * and only the matching public timeline is ever read. Override with the
 * `JIKE_USERNAME` secret if it ever changes. */
const DEFAULT_JIKE_USERNAME = "9443A20E-7209-418B-8E97-371F227C702B";

/** How far back a post may be re-dated when its own day is taken. */
const BACKFILL_WINDOW_DAYS = 3;

export interface SyncOptions {
  /** Return the raw shape of matched posts so the field names can be checked
   * against a live account (used once, to confirm Live Photo support). */
  probe?: boolean;
  /** Back-fill stop date (YYYY-MM-DD): keep walking back until posts older
   * than this day show up. Requires `JIKE_ACCESS_TOKEN` — the public profile
   * page only ever carries the newest ~10 posts. */
  until?: string;
  /** Page cap for the authenticated walk (20 posts per page). The call budget
   * usually bites first. */
  maxPages?: number;
  /** Live Photo clips run ~5 MB each; a months-long back-fill can skip them
   * and keep only the stills. */
  video?: boolean;
  /** Ignore the saved cursor and start paging from the newest post again. */
  fresh?: boolean;
}

export interface SyncSample {
  id: string | null;
  postDate: string | null;
  albumDate: string | null;
  content: string;
  picture: unknown;
  liveVideoUrl: string | null;
}

/** What the run could see, so a `imported: 0` result is self-explaining. */
export interface SyncDiag {
  mode: "api" | "profile";
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  hasDeviceId: boolean;
  username: string;
  pages: number;
  calls: number;
}

export interface SyncResult {
  ok: boolean;
  fetched: number;
  matched: number;
  imported: number;
  /** Posts filed into an earlier, empty day instead of their own date. */
  backfilled: number;
  /** Posts that came with a Live Photo clip. */
  live: number;
  skipped: number;
  reason?: string;
  /** Stopped on the call budget rather than running out of posts: call again
   * to continue where this left off. */
  stoppedEarly?: boolean;
  samples?: SyncSample[];
  diag?: SyncDiag;
}

/** YYYY-MM-DD in Asia/Shanghai — the album's timezone. */
function shanghaiDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
}

function postDate(post: JikePost): string | null {
  return shanghaiDate(post.createdAt ?? post.actionTime);
}

function matches(post: JikePost): boolean {
  const text = post.content ?? "";
  return MARKERS.some((m) => text.includes(m));
}

/** Oldest first, so a catch-up posted before the real one still finds its
 * own day free. */
function oldestFirst(posts: JikePost[]): JikePost[] {
  return posts.slice().sort(
    (a, b) =>
      Date.parse(a.createdAt ?? a.actionTime ?? "") -
      Date.parse(b.createdAt ?? b.actionTime ?? ""),
  );
}

function shiftDays(date: string, delta: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + delta * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Nearest empty day strictly before `date`, within the backfill window. */
function nearestFreeBefore(
  date: string,
  taken: ReadonlySet<string>,
  window = BACKFILL_WINDOW_DAYS,
): string | null {
  for (let back = 1; back <= window; back++) {
    const candidate = shiftDays(date, -back);
    if (!taken.has(candidate)) return candidate;
  }
  return null;
}

/** Catch-up posts usually say so out loud. Longest match wins. */
const CATCHUP_HINTS: { re: RegExp; back: number }[] = [
  { re: /前[天日]|大前天/, back: 2 },
  {
    re: /昨[天日]|昨儿|补[发更记卡上]|补一张|迟到的|落下的/,
    back: 1,
  },
];

/**
 * Pick the album day for a post.
 *
 * Normally that is the day it was published. When that day already holds an
 * apple we assume a back-fill and look backwards; when the post itself says
 * "昨天" / "补发" we honour that even if its own day is still free.
 */
function pickAlbumDate(
  post: JikePost,
  taken: ReadonlySet<string>,
): string | null {
  const own = postDate(post);
  if (!own) return null;

  if (taken.has(own)) return nearestFreeBefore(own, taken);

  const text = post.content ?? "";
  for (const hint of CATCHUP_HINTS) {
    if (!hint.re.test(text)) continue;
    const target = shiftDays(own, -hint.back);
    if (!taken.has(target)) return target;
    return nearestFreeBefore(own, taken) ?? own;
  }
  return own;
}

async function getSetting(db: ReturnType<typeof getDb>, key: string) {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row?.value ?? null;
}

async function putSetting(
  db: ReturnType<typeof getDb>,
  key: string,
  value: string,
) {
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

async function delSetting(db: ReturnType<typeof getDb>, key: string) {
  await db.delete(settings).where(eq(settings.key, key));
}

function parseCursor(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Keep a probe payload small: clip long strings, cap arrays/objects. */
function trimDeep(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 3).map((v) => trimDeep(v, depth + 1));
  }
  if (value && typeof value === "object" && depth < 3) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = trimDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

/** Download a URL into R2, returning the object key. Null when the response
 * is not the media type we asked for. */
async function copyToR2(
  bucket: { put: (k: string, v: ArrayBuffer, o?: unknown) => Promise<unknown> },
  url: string,
  key: string,
  kind: "image" | "video",
  host?: string,
): Promise<{ key: string; url: string } | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const headerType = res.headers.get("content-type") ?? "";
  const looksRight =
    kind === "image"
      ? headerType.startsWith("image/")
      : headerType.startsWith("video/") ||
        /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
  if (!looksRight) return null;

  /* Trust the file extension before the header: 即刻 serves Live Photo clips
   * as `.mp4` but labels them `video/quicktime`, which some browsers refuse
   * to play. */
  const ext = (
    url.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1] ?? ""
  ).toLowerCase();
  const fromExt =
    ext === "mp4" || ext === "m4v"
      ? "video/mp4"
      : ext === "mov"
        ? "video/quicktime"
        : ext === "webm"
          ? "video/webm"
          : null;
  const contentType =
    (kind === "video" ? fromExt : null) ??
    (headerType && headerType !== "application/octet-stream" ? headerType : null) ??
    (kind === "image" ? "image/jpeg" : "video/mp4");

  await bucket.put(key, await res.arrayBuffer(), {
    httpMetadata: { contentType },
  });
  return {
    key,
    url: host ? `https://${host}/${key}` : `/photos/${key}`,
  };
}

export async function syncJikeApples(
  env: unknown,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const result: SyncResult = {
    ok: false,
    fetched: 0,
    matched: 0,
    imported: 0,
    backfilled: 0,
    live: 0,
    skipped: 0,
  };

  const db = getDb(env as never);
  const fromEnv = readTokensFromEnv(env);

  /* Tokens are optional: without them the public profile page is scraped
   * instead, which never expires. Persisted tokens win when they exist —
   * they are the ones a previous run refreshed. */
  const stored = {
    accessToken: await getSetting(db, "jike_access_token"),
    refreshToken: await getSetting(db, "jike_refresh_token"),
  };
  let tokens: JikeTokens = {
    accessToken: stored.accessToken ?? fromEnv.accessToken ?? "",
    refreshToken: stored.refreshToken ?? fromEnv.refreshToken ?? "",
  };
  const username =
    (await getSetting(db, "jike_username")) ??
    fromEnv.username ??
    DEFAULT_JIKE_USERNAME;
  if (!username) {
    result.reason = "no 即刻 username — set the JIKE_USERNAME secret";
    return result;
  }
  if (opts.until && !tokens.accessToken) {
    result.reason =
      "back-fill needs JIKE_ACCESS_TOKEN — the public page only has the newest ~10 posts";
    return result;
  }
  /* A probe is a dry run: it reports what the source handed back without
   * writing anything to R2 or D1. */
  const dryRun = opts.probe === true;
  const wantVideo = opts.video !== false;
  const until = opts.until;
  /* Only a back-fill walks far enough to need a cursor; the daily sync always
   * starts from the newest post. */
  const useCursor = Boolean(until);

  const e = env as unknown as {
    PHOTOS: { put: (k: string, v: ArrayBuffer, o?: unknown) => Promise<unknown> };
    R2_PUBLIC_HOST?: string;
  };
  /* Set R2_PUBLIC_HOST (an R2 custom domain) to serve objects straight from
   * R2; otherwise they stream through the Worker's `/photos/*` route. */
  const host = e.R2_PUBLIC_HOST;
  const samples: SyncSample[] = [];

  let calls = 0;
  const diag: SyncDiag = {
    mode: tokens.accessToken ? "api" : "profile",
    hasAccessToken: Boolean(tokens.accessToken),
    hasRefreshToken: Boolean(tokens.refreshToken),
    hasDeviceId: Boolean(fromEnv.deviceId),
    username,
    pages: 0,
    calls: 0,
  };
  result.diag = diag;

  const rows = await db
    .select({ date: applePhotos.date, sourceId: applePhotos.sourceId })
    .from(applePhotos);
  calls++;
  const taken = new Set(rows.map((r) => r.date));
  const knownIds = new Set(
    rows.map((r) => r.sourceId).filter((v): v is string => Boolean(v)),
  );

  type Outcome = "imported" | "skipped" | "budget";

  const handle = async (post: JikePost): Promise<Outcome> => {
    const id = post.id;
    const date = pickAlbumDate(post, taken);
    const pic = post.pictures?.[0];
    const url = pic ? bestPictureUrl(pic) : null;
    const clipUrl = wantVideo ? liveVideoUrl(post) : null;

    if (opts.probe) {
      samples.push({
        id: id ?? null,
        postDate: postDate(post),
        albumDate: date,
        content: (post.content ?? "").slice(0, 160),
        picture: trimDeep(pic),
        liveVideoUrl: clipUrl,
      });
    }

    if (!id || !date || !url || knownIds.has(id)) {
      result.skipped++;
      return "skipped";
    }
    if (dryRun) {
      /* Keep the report honest about where the next real run would put
       * each post, but touch nothing. */
      taken.add(date);
      return "skipped";
    }
    /* Reserve room for the still plus its thumbnail before starting, so a
     * post is never stored half-finished. */
    if (calls + 3 > MAX_CALLS) return "budget";

    const image = await copyToR2(
      e.PHOTOS,
      url,
      `apples/${date}/image`,
      "image",
      host,
    );
    calls++;
    if (!image) {
      result.skipped++;
      return "skipped";
    }
    /* A 400 px copy for the grid; the 1500 px one is only ever pulled
     * when a photo is opened. Cheap insurance against a year of photos
     * costing a visitor a gigabyte. */
    const thumbUrl = pic ? thumbPictureUrl(pic) : null;
    let thumb: { key: string; url: string } | null = null;
    if (thumbUrl && calls + 2 <= MAX_CALLS) {
      calls++;
      thumb = await copyToR2(
        e.PHOTOS,
        thumbUrl,
        `apples/${date}/thumb`,
        "image",
        host,
      );
    }
    let clip: { key: string; url: string } | null = null;
    if (clipUrl && calls + 1 <= MAX_CALLS) {
      calls++;
      clip = await copyToR2(
        e.PHOTOS,
        clipUrl,
        `apples/${date}/video`,
        "video",
        host,
      );
    }

    await db.insert(applePhotos).values({
      date,
      description: (post.content ?? "").slice(0, 500),
      imageKey: image.key,
      imageUrl: image.url,
      thumbKey: thumb?.key ?? null,
      thumbUrl: thumb?.url ?? null,
      videoKey: clip?.key ?? null,
      videoUrl: clip?.url ?? null,
      source: SOURCE,
      sourceId: id,
    });
    calls++;
    taken.add(date);
    knownIds.add(id);
    result.imported++;
    if (date !== postDate(post)) result.backfilled++;
    if (clip) result.live++;
    return "imported";
  };

  /* One retry after a refresh — access tokens expire every few weeks. */
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await putSetting(db, "jike_username", username);
      calls++;

      let stopped = false;
      let finished = false;

      if (!tokens.accessToken) {
        const posts = await listPostsFromProfile(username);
        calls++;
        result.fetched += posts.length;
        const batch = oldestFirst(posts.filter(matches));
        result.matched += batch.length;
        for (const post of batch) {
          if ((await handle(post)) === "budget") {
            stopped = true;
            break;
          }
        }
        finished = true;
      } else {
        const maxPages = opts.maxPages ?? MAX_PAGES;
        let key: unknown =
          useCursor && !opts.fresh
            ? parseCursor(await getSetting(db, CURSOR_KEY))
            : null;
        if (useCursor && opts.fresh) await delSetting(db, CURSOR_KEY);

        for (let page = 0; page < maxPages; page++) {
          if (calls + 4 > MAX_CALLS) {
            stopped = true;
            break;
          }
          const res = await fetchPersonalPage(
            env,
            tokens,
            username,
            PAGE_SIZE,
            key,
          );
          calls++;
          diag.pages++;

          const pagePosts = res.data ?? [];
          result.fetched += pagePosts.length;
          const batch = oldestFirst(
            pagePosts.filter((p) => {
              if (!matches(p)) return false;
              const day = postDate(p);
              return !until || !day || day >= until;
            }),
          );
          result.matched += batch.length;

          for (const post of batch) {
            if ((await handle(post)) === "budget") {
              stopped = true;
              break;
            }
          }

          if (stopped) {
            /* Resume from the page we were reading: already-imported posts
             * de-duplicate on their id. */
            if (useCursor && !dryRun) {
              await putSetting(db, CURSOR_KEY, JSON.stringify(key ?? null));
              calls++;
            }
            break;
          }

          const reached = until
            ? pagePosts.some((p) => {
                const day = postDate(p);
                return Boolean(day) && day! < until;
              })
            : false;
          if (reached || !res.loadMoreKey || pagePosts.length === 0) {
            finished = true;
            break;
          }
          key = res.loadMoreKey;
          if (useCursor && !dryRun) {
            await putSetting(db, CURSOR_KEY, JSON.stringify(key ?? null));
            calls++;
          }
        }
      }

      if (stopped) result.stoppedEarly = true;
      if (finished && useCursor && !dryRun) {
        await delSetting(db, CURSOR_KEY);
        calls++;
      }
      if (opts.probe) result.samples = samples;
      diag.calls = calls;
      result.ok = true;
      return result;
    } catch (err) {
      if (attempt === 0) {
        const next = await refreshTokens(env, tokens);
        if (next) {
          tokens = next;
          await putSetting(db, "jike_access_token", next.accessToken);
          if (next.refreshToken !== tokens.refreshToken) {
            await putSetting(db, "jike_refresh_token", next.refreshToken);
          }
          continue;
        }
      }
      diag.calls = calls;
      result.reason = err instanceof Error ? err.message : String(err);
      console.warn("jike sync failed:", err);
      return result;
    }
  }
  return result;
}
