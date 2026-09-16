/* Minimal read-only client for 即刻 (Jike) — an *unofficial*, reverse-engineered
 * mobile API (`api.ruguoapp.com`). Only two calls are made:
 *
 *   1. `/1.0/users/profile`          → resolve the signed-in user's UUID-shaped
 *                                      `username` (Chinese nicknames do not work)
 *   2. `/1.0/personalUpdate/single`  → that user's own timeline, paged by
 *                                      `loadMoreKey`
 *
 * Nothing here posts, likes, comments or follows, and every failure is
 * contained: if the API starts rejecting us the cron simply becomes a no-op
 * and the rest of the site is unaffected.
 *
 * Tokens come from the `JIKE_ACCESS_TOKEN` / `JIKE_REFRESH_TOKEN` secrets, or
 * from the `settings` table when a previous run refreshed them (a Worker
 * cannot rewrite its own secrets).
 */

const BASE = "https://api.ruguoapp.com/1.0";

export interface JikeTokens {
  accessToken: string;
  refreshToken: string;
}

/** Loose env access — these bindings are secrets, not generated Worker types. */
function secrets(env: unknown): Record<string, string | undefined> {
  return env as Record<string, string | undefined>;
}

export function readTokensFromEnv(env: unknown): Partial<JikeTokens> & {
  username?: string;
  deviceId?: string;
} {
  const e = secrets(env);
  return {
    accessToken: e.JIKE_ACCESS_TOKEN,
    refreshToken: e.JIKE_REFRESH_TOKEN,
    username: e.JIKE_USERNAME,
    deviceId: e.JIKE_DEVICE_ID,
  };
}

function buildHeaders(env: unknown, tokens: JikeTokens): Record<string, string> {
  const e = secrets(env);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "x-jike-access-token": tokens.accessToken,
    "x-jike-refresh-token": tokens.refreshToken,
    /* Gateway fields the mobile app sends. Overridable via secrets in case
     * 即刻 starts rejecting the defaults. */
    "x-jike-app-id": e.JIKE_APP_ID ?? "XeITUMa6kGKF",
    "app-buildno": e.JIKE_BUILD_NO ?? "2241",
    applicationid: e.JIKE_BUNDLE_ID ?? "com.ruguoapp.jike",
    /* Their own web client sends this; a token taken from web.okjike.com is
     * issued to it. Override with JIKE_PLATFORM if you use a mobile token. */
    platform: e.JIKE_PLATFORM ?? "web",
    "os-version": "23",
    model: "iPhone",
    resolution: "1170x2532",
    "user-agent": e.JIKE_USER_AGENT ?? "okhttp/4.9.0",
  };
  if (e.JIKE_DEVICE_ID) headers["x-jike-device-id"] = e.JIKE_DEVICE_ID;
  return headers;
}

async function call<T>(
  env: unknown,
  path: string,
  body: unknown,
  tokens: JikeTokens,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(env, tokens),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`jike ${path} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface JikePicture {
  picUrl?: string;
  middlePicUrl?: string;
  smallPicUrl?: string;
  thumbnailUrl?: string;
  format?: string;
  /* Live Photos carry the clip somewhere on the picture object. Its shape is
   * undocumented and has changed between app versions, so it is typed loosely
   * and searched by field name instead (see `liveVideoUrl`). */
  livePhoto?: unknown;
}

export interface JikePost {
  id?: string;
  content?: string;
  createdAt?: string;
  actionTime?: string;
  pictures?: JikePicture[];
  /* Same undocumented shape — present on some Live Photo posts. */
  livePhoto?: unknown;
  video?: unknown;
}

/** Pick the picture URL to store.
 *
 * `middlePicUrl` is the 1500 px rendition (~260 KB) against ~3.2 MB for the
 * untouched original — indistinguishable in the album, and it is the
 * difference between megabytes and gigabytes once months are back-filled. */
export function bestPictureUrl(pic: JikePicture): string | null {
  return (
    pic.middlePicUrl ??
    pic.picUrl ??
    pic.smallPicUrl ??
    pic.thumbnailUrl ??
    null
  );
}

/** The 400 px rendition used by the calendar grid and the polaroid board.
 *
 * 即刻 already ships one (`smallPicUrl`, ~11–34 KB); the grid renders at
 * ~190 px, so handing it the 1500 px copy would burn ~7× the data for no
 * visible gain — which matters a lot once a whole year is back-filled. */
export function thumbPictureUrl(pic: JikePicture): string | null {
  if (pic.smallPicUrl) return pic.smallPicUrl;
  if (pic.thumbnailUrl) return pic.thumbnailUrl;
  const base = pic.picUrl;
  if (!base || base.includes("?")) return null;
  return `${base}?imageMogr2/auto-orient/thumbnail/400x400%3E/quality/80/interlace/1`;
}

/* --- Live Photo ------------------------------------------------------- */

const VIDEO_KEY = /(video|live|mov|mp4|clip)/i;
const IMAGE_KEY = /(thumb|pic|image|cover|poster|avatar)/i;

/** Depth-first hunt for the first http(s) URL, preferring video-ish keys.
 * Deliberately shape-agnostic: the field moves between app versions. */
function findUrl(value: unknown, depth = 0): string | null {
  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findUrl(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === "object" && depth < 4) {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec);
    for (const key of keys) {
      if (!VIDEO_KEY.test(key)) continue;
      const hit = findUrl(rec[key], depth + 1);
      if (hit) return hit;
    }
    for (const key of keys) {
      if (IMAGE_KEY.test(key)) continue;
      const hit = findUrl(rec[key], depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * The Live Photo clip for a post, when 即刻 exposes one.
 *
 * Returns null for ordinary stills — the caller then simply stores the photo.
 * Note that 即刻 returns no playable URL for real videos (those need a
 * separate media endpoint), so this only ever fires for Live Photos.
 */
export function liveVideoUrl(post: JikePost): string | null {
  const pic = post.pictures?.[0];
  return (
    findUrl(pic?.livePhoto) ??
    findUrl(post.livePhoto) ??
    findUrl(pic) ??
    null
  );
}

/** Resolve the signed-in user's `username` (a UUID, not the display name). */
export async function getMyUsername(
  env: unknown,
  tokens: JikeTokens,
): Promise<string | null> {
  const data = await call<{ user?: { username?: string } }>(
    env,
    "/users/profile",
    {},
    tokens,
  );
  return data?.user?.username ?? null;
}

/** YYYY-MM-DD in Asia/Shanghai — the album's timezone. */
function dayOf(iso: string | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Page through the signed-in user's own posts, newest first.
 *
 * `untilDate` stops the walk once a post older than that day shows up, which
 * is what makes a full history back-fill affordable: everything newer than
 * the target is collected, nothing beyond it is fetched.
 */
export async function listMyPosts(
  env: unknown,
  tokens: JikeTokens,
  username: string,
  maxPages = 2,
  pageSize = 20,
  untilDate?: string,
): Promise<JikePost[]> {
  const out: JikePost[] = [];
  let loadMoreKey: unknown = null;

  for (let page = 0; page < maxPages; page++) {
    const res = await call<{ data?: JikePost[]; loadMoreKey?: unknown }>(
      env,
      "/personalUpdate/single",
      { username, limit: pageSize, loadMoreKey },
      tokens,
    );
    const rows = res?.data ?? [];
    out.push(...rows);
    if (!res?.loadMoreKey || rows.length === 0) break;

    const reachedTarget = untilDate
      ? rows.some((r) => {
          const day = dayOf(r.createdAt ?? r.actionTime);
          return Boolean(day) && day! < untilDate;
        })
      : false;
    if (reachedTarget) break;

    loadMoreKey = res.loadMoreKey;
  }
  return out;
}

/* --- Public profile (no login) ---------------------------------------- */

const PROFILE_HOST = "https://m.okjike.com";
const BROWSER_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/**
 * Read a user's own timeline from the public mobile web page.
 *
 * `m.okjike.com/users/<uuid>` is server-rendered and embeds the newest ~10
 * posts as JSON under `__NEXT_DATA__.props.pageProps.posts`, pictures and
 * Live Photo clips included. That makes the whole access-token dance
 * unnecessary for our own feed; the authenticated API remains available as a
 * fallback whenever `JIKE_ACCESS_TOKEN` is set.
 */
export async function listPostsFromProfile(
  username: string,
): Promise<JikePost[]> {
  const res = await fetch(
    `${PROFILE_HOST}/users/${encodeURIComponent(username)}`,
    { headers: { "user-agent": BROWSER_UA, accept: "text/html" } },
  );
  if (!res.ok) throw new Error(`jike profile → HTTP ${res.status}`);

  const html = await res.text();
  const match = html.match(/id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("jike profile: __NEXT_DATA__ missing");

  const data = JSON.parse(match[1]) as {
    props?: { pageProps?: { posts?: unknown } };
  };
  const posts = data.props?.pageProps?.posts;
  if (!Array.isArray(posts)) throw new Error("jike profile: no posts array");

  return posts
    .filter(
      (p): p is Record<string, unknown> =>
        Boolean(p) && typeof p === "object",
    )
    .map((p) => ({
      id: typeof p.id === "string" ? p.id : undefined,
      content: typeof p.content === "string" ? p.content : "",
      createdAt: typeof p.createdAt === "string" ? p.createdAt : undefined,
      actionTime: typeof p.actionTime === "string" ? p.actionTime : undefined,
      pictures: Array.isArray(p.pictures)
        ? (p.pictures as JikePicture[])
        : undefined,
      livePhoto: p.livePhoto,
      video: p.video,
    }));
}

/** Try to exchange the refresh token for a new access token.
 * The exact path has moved between app versions, so a couple of historical
 * spellings are attempted before giving up. */
export async function refreshTokens(
  env: unknown,
  tokens: JikeTokens,
): Promise<JikeTokens | null> {
  if (!tokens.refreshToken) return null;
  const paths = ["/auth/refresh", "/appAuthTokens/refresh"];
  for (const path of paths) {
    try {
      const res: Response = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: buildHeaders(env, tokens),
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        data?: { accessToken?: string; refreshToken?: string };
        accessToken?: string;
        refreshToken?: string;
      };
      const next: JikeTokens = {
        accessToken:
          body.data?.accessToken ??
          body.accessToken ??
          res.headers.get("x-jike-access-token") ??
          tokens.accessToken,
        refreshToken:
          body.data?.refreshToken ?? body.refreshToken ?? tokens.refreshToken,
      };
      if (next.accessToken !== tokens.accessToken) return next;
    } catch {
      /* try the next spelling */
    }
  }
  return null;
}
