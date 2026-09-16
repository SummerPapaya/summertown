ALTER TABLE apple_photos ADD COLUMN source TEXT;
ALTER TABLE apple_photos ADD COLUMN source_id TEXT;
ALTER TABLE apple_photos ADD COLUMN thumb_key TEXT;
ALTER TABLE apple_photos ADD COLUMN thumb_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS apple_photos_source_id_unique ON apple_photos (source_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
