PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS fetch_runs (
  run_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  message TEXT
);

CREATE INDEX IF NOT EXISTS idx_fetch_runs_finished_at ON fetch_runs(finished_at DESC);

CREATE TABLE IF NOT EXISTS latest_news (
  source_url TEXT PRIMARY KEY,
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
  date TEXT NOT NULL,
  content_tags_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_latest_news_published_at ON latest_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_latest_news_platform ON latest_news(platform);
CREATE INDEX IF NOT EXISTS idx_latest_news_stage ON latest_news(industry_stage);

CREATE TABLE IF NOT EXISTS news_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
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
  date TEXT NOT NULL,
  content_tags_json TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (run_id) REFERENCES fetch_runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_news_snapshots_run_id ON news_snapshots(run_id);
CREATE INDEX IF NOT EXISTS idx_news_snapshots_published_at ON news_snapshots(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_snapshots_platform ON news_snapshots(platform);
CREATE INDEX IF NOT EXISTS idx_news_snapshots_stage ON news_snapshots(industry_stage);

CREATE TABLE IF NOT EXISTS page_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(path, visit_date, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_page_visits_path ON page_visits(path);
CREATE INDEX IF NOT EXISTS idx_page_visits_path_date ON page_visits(path, visit_date);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at ON page_visits(created_at DESC);
