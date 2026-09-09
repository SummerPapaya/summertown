-- Initial D1 schema for summertown, located: apac.
-- Idempotent: every statement uses IF NOT EXISTS so this can be re-run.

CREATE TABLE IF NOT EXISTS wishes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  text        TEXT    NOT NULL,
  accent      TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'approved',
  client_id   TEXT,
  ip          TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS wishes_created_at_idx ON wishes(created_at, id);
CREATE INDEX IF NOT EXISTS wishes_status_idx     ON wishes(status);
CREATE UNIQUE INDEX IF NOT EXISTS wishes_client_id_unique ON wishes(client_id)
  WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS postcards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  message     TEXT    NOT NULL,
  signature   TEXT    NOT NULL,
  doodle      TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'approved',
  client_id   TEXT,
  ip          TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS postcards_created_at_idx ON postcards(created_at, id);
CREATE INDEX IF NOT EXISTS postcards_status_idx     ON postcards(status);
CREATE UNIQUE INDEX IF NOT EXISTS postcards_client_id_unique ON postcards(client_id)
  WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS newsletter_subs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subs_email_unique ON newsletter_subs(email);

CREATE TABLE IF NOT EXISTS footprints (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip          TEXT    NOT NULL,
  day         TEXT    NOT NULL, -- YYYY-MM-DD UTC
  created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS footprints_ip_day_unique ON footprints(ip, day);

CREATE TABLE IF NOT EXISTS page_visits (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash  TEXT    NOT NULL,
  path          TEXT    NOT NULL,
  user_agent    TEXT,
  visited_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pv_visited_at_idx    ON page_visits(visited_at);
CREATE INDEX IF NOT EXISTS pv_visitor_hash_idx ON page_visits(visitor_hash);

CREATE TABLE IF NOT EXISTS apple_photos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  date         TEXT    NOT NULL,
  description  TEXT    NOT NULL DEFAULT '',
  image_key    TEXT    NOT NULL,
  image_url    TEXT    NOT NULL,
  video_key    TEXT,
  video_url    TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS apple_photos_date_unique ON apple_photos(date);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket    TEXT    NOT NULL,
  count     INTEGER NOT NULL DEFAULT 0,
  reset_at  INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_bucket_unique ON rate_limits(bucket);
