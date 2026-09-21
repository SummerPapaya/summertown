-- Guest book for the apple album: nickname (required), email (optional),
-- body, and an optional photo the comment is about.
CREATE TABLE IF NOT EXISTS apple_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER,
  -- denormalised copy of the photo's date so the comment still reads
  -- sensibly if the photo is ever deleted
  photo_date TEXT,
  nickname TEXT NOT NULL,
  email TEXT,
  body TEXT NOT NULL,
  -- 'approved' | 'pending' | 'rejected'; only 'approved' is public
  status TEXT NOT NULL DEFAULT 'approved',
  client_id TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS apple_comments_status_created_idx
  ON apple_comments (status, created_at);

CREATE INDEX IF NOT EXISTS apple_comments_photo_idx
  ON apple_comments (photo_id);

-- Idempotency: a retried submit carrying the same client id is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS apple_comments_client_id_unique
  ON apple_comments (client_id);
