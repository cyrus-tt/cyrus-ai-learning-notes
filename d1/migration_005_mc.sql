-- Mission Control tables
CREATE TABLE IF NOT EXISTS mc_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  progress_file TEXT NOT NULL,
  color TEXT NOT NULL,
  last_synced_at TEXT,
  file_hash TEXT
);

CREATE TABLE IF NOT EXISTS mc_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES mc_projects(id),
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  status_emoji TEXT,
  priority INTEGER DEFAULT 50,
  deadline TEXT,
  next_step TEXT,
  owner TEXT,
  section TEXT,
  is_cyrus_action INTEGER DEFAULT 0,
  raw_markdown TEXT,
  synced_at TEXT NOT NULL,
  edited_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mc_tasks_project ON mc_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_status ON mc_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mc_tasks_deadline ON mc_tasks(deadline);

CREATE TABLE IF NOT EXISTS mc_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  synced_at TEXT NOT NULL,
  projects_synced TEXT NOT NULL,
  tasks_added INTEGER DEFAULT 0,
  tasks_updated INTEGER DEFAULT 0,
  tasks_removed INTEGER DEFAULT 0,
  duration_ms INTEGER
);

INSERT OR IGNORE INTO mc_projects (id, name, path, progress_file, color) VALUES
  ('ec',  '公司项目开发',       '/Volumes/tyj/Cyrus/GitHub/ecom-agent-platform', 'PROGRESS.md',          '#4A9EFF'),
  ('opc', '传统企业AI赋能',     '/Volumes/tyj/Cyrus/opc',                        'PROGRESS.md',          '#FF6B6B'),
  ('xhs', '个人自媒体',         '/Volumes/tyj/Cyrus/Projects/小红书IP',           'PROGRESS.md',          '#FF4081'),
  ('int', '跳槽&个人成长',      '/Volumes/tyj/Cyrus/极限跳槽计划',                '跳槽每日任务日历.md',    '#FFB74D'),
  ('sg',  'AI产品',             '/Volumes/tyj/Cyrus/GitHub/grace-knowledge-system','PROGRESS.md',         '#81C784'),
  ('web', '个人资讯网站',        '/Volumes/tyj/Cyrus/GitHub/cyrus-ai-learning-notes','docs/D1_MIN_PLAN.md','#7C4DFF');
