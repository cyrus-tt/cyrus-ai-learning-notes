-- Migration 003: Google auth support
-- Run in Cloudflare D1 console or via wrangler d1 execute

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,         -- Google sub (user ID)
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  picture TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,     -- x, xhs, youtube
  username TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  added_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, platform, username),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_uw_user_id ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_uw_platform ON user_watchlist(platform);
CREATE INDEX IF NOT EXISTS idx_uw_added ON user_watchlist(added_at DESC);
