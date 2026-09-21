-- Replies for the apple-album guest book.
-- parent_id points at the top-level comment being answered (replies to a
-- reply are re-pointed to the root in the API, keeping threads two levels
-- deep). is_admin marks replies posted from /town-admin so the front end
-- can badge them "管理员 / Admin" instead of showing a plain nickname.
ALTER TABLE apple_comments ADD COLUMN parent_id INTEGER;
ALTER TABLE apple_comments ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS apple_comments_parent_idx
  ON apple_comments (parent_id);
