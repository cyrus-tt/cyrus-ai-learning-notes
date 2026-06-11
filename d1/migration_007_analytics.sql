-- migration_007_analytics.sql
-- 背景：visits.js 用 db.exec() 跑多行 DDL，D1 exec 按行执行导致每次都抛错，
-- page_visits 表从未建成；UTM 此前只存访客 localStorage，无服务端数据。
-- 本 migration 把 schema 收归 migration 管理，运行时不再建表。

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

CREATE TABLE IF NOT EXISTS utm_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utm_source TEXT NOT NULL,
  utm_medium TEXT,
  utm_campaign TEXT,
  landing TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(utm_source, utm_campaign, landing, visit_date, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_utm_events_source_date ON utm_events(utm_source, visit_date);
CREATE INDEX IF NOT EXISTS idx_utm_events_created_at ON utm_events(created_at DESC);
