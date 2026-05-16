-- Mission Control v2: add pinned_at for "Pin to Today" feature
ALTER TABLE mc_tasks ADD COLUMN pinned_at TEXT;
