CREATE TABLE IF NOT EXISTS custom_watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  added_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(platform, username)
);

CREATE INDEX IF NOT EXISTS idx_cw_platform ON custom_watchlist(platform);
CREATE INDEX IF NOT EXISTS idx_cw_added ON custom_watchlist(added_at DESC);
