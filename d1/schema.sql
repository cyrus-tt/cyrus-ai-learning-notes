CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  region TEXT NOT NULL,
  industry_stage TEXT NOT NULL,
  title_original TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  summary_original TEXT NOT NULL,
  summary_zh TEXT NOT NULL,
  has_translation INTEGER NOT NULL DEFAULT 0,
  action TEXT NOT NULL,
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_platform ON news_items(platform);
CREATE INDEX IF NOT EXISTS idx_news_items_stage ON news_items(industry_stage);

CREATE TABLE IF NOT EXISTS news_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  news_item_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (news_item_id) REFERENCES news_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_news_tags_item ON news_tags(news_item_id);
CREATE INDEX IF NOT EXISTS idx_news_tags_tag ON news_tags(tag);

CREATE TABLE IF NOT EXISTS fetch_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  message TEXT
);
