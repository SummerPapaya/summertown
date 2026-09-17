CREATE TABLE IF NOT EXISTS apple_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL,
  device TEXT NOT NULL,
  day TEXT NOT NULL,
  ip TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

-- One like per photo, per device, per UTC day. This is the constraint that
-- makes repeated taps idempotent instead of inflating the counter.
CREATE UNIQUE INDEX IF NOT EXISTS apple_likes_photo_device_day_unique
  ON apple_likes (photo_id, device, day);

CREATE INDEX IF NOT EXISTS apple_likes_photo_idx ON apple_likes (photo_id);
