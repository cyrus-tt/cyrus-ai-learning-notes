-- Migration 004: favorites support
-- Create user_favorites table for both logged-in users and guest identifiers.

CREATE TABLE IF NOT EXISTS user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  news_id TEXT NOT NULL,
  news_title TEXT NOT NULL,
  news_summary TEXT NOT NULL DEFAULT '',
  news_url TEXT NOT NULL DEFAULT '',
  news_platform TEXT NOT NULL DEFAULT '',
  news_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE(user_id, news_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);
