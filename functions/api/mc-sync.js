import { checkMcAuth } from "./_lib/mc-auth.js";
import { corsHeaders, handleOptions } from "./_lib/cors.js";

function json(body, status = 200, request = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", ...(request ? corsHeaders(request) : {}) },
  });
}

// ---------------------------------------------------------------------------
// POST /api/mc-sync
// ---------------------------------------------------------------------------
export async function onRequestPost(context) {
  const { request, env } = context;

  // Auth
  if (!checkMcAuth(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401, request);
  }

  const db = env?.DB;
  if (!db) {
    return json({ ok: false, error: "db_not_configured" }, 500, request);
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, request);
  }

  const projects = body?.projects;
  if (!Array.isArray(projects) || projects.length === 0) {
    return json({ ok: false, error: "missing_projects_array" }, 400, request);
  }

  const now = new Date().toISOString();
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalRemoved = 0;

  try {
    for (const proj of projects) {
      const projectId = String(proj.project_id || "").trim();
      if (!projectId) continue;

      const fileHash = String(proj.file_hash || "").trim();
      const tasks = Array.isArray(proj.tasks) ? proj.tasks : [];

      // ------------------------------------------------------------------
      // 1. Upsert mc_projects row
      // ------------------------------------------------------------------
      await db
        .prepare(
          `UPDATE mc_projects SET last_synced_at = ?, file_hash = ? WHERE id = ?`
        )
        .bind(now, fileHash, projectId)
        .run();

      // ------------------------------------------------------------------
      // 2. Get existing task IDs for this project
      // ------------------------------------------------------------------
      const existingRows = await db
        .prepare("SELECT id, edited_at FROM mc_tasks WHERE project_id = ?")
        .bind(projectId)
        .all();

      const existingMap = new Map();
      for (const row of existingRows.results || []) {
        existingMap.set(row.id, row.edited_at);
      }

      const incomingIds = new Set();

      // ------------------------------------------------------------------
      // 3. Upsert incoming tasks (batched)
      // ------------------------------------------------------------------
      const upsertStmts = [];

      for (const task of tasks) {
        const taskId = String(task.id || "").trim();
        if (!taskId) continue;
        incomingIds.add(taskId);

        const isExisting = existingMap.has(taskId);
        const hasLocalEdit = isExisting && existingMap.get(taskId) != null;

        if (hasLocalEdit) {
          // Task was locally edited -- only update fields that don't
          // conflict with user edits. We skip status/priority/next_step
          // because the user may have changed them locally.
          // We still update title, deadline, owner, section, raw_markdown
          // since those come from the source of truth (PROGRESS.md).
          // NOTE: pinned_at is a user-only field, never touched here.
          upsertStmts.push(
            db
              .prepare(
                `UPDATE mc_tasks SET
                   title = ?, status_emoji = ?, deadline = ?,
                   owner = ?, section = ?, is_cyrus_action = ?,
                   raw_markdown = ?, synced_at = ?
                 WHERE id = ?`
              )
              .bind(
                String(task.title || ""),
                String(task.status_emoji || ""),
                task.deadline || null,
                String(task.owner || ""),
                String(task.section || ""),
                task.is_cyrus_action ? 1 : 0,
                String(task.raw_markdown || ""),
                now,
                taskId
              )
          );
          totalUpdated++;
        } else if (isExisting) {
          // Existing row, no local edits -- UPDATE all sync fields but
          // DO NOT touch pinned_at (user-only column, must be preserved).
          // Reset edited_at = NULL to keep semantics consistent with the
          // previous INSERT OR REPLACE behaviour.
          upsertStmts.push(
            db
              .prepare(
                `UPDATE mc_tasks SET
                   project_id = ?, code = ?, title = ?, status = ?,
                   status_emoji = ?, priority = ?, deadline = ?,
                   next_step = ?, owner = ?, section = ?,
                   is_cyrus_action = ?, raw_markdown = ?,
                   synced_at = ?, edited_at = NULL
                 WHERE id = ?`
              )
              .bind(
                projectId,
                String(task.code || ""),
                String(task.title || ""),
                String(task.status || "active"),
                String(task.status_emoji || ""),
                typeof task.priority === "number" ? task.priority : 99,
                task.deadline || null,
                String(task.next_step || ""),
                String(task.owner || ""),
                String(task.section || ""),
                task.is_cyrus_action ? 1 : 0,
                String(task.raw_markdown || ""),
                now,
                taskId
              )
          );
          totalUpdated++;
        } else {
          // Brand-new task -- INSERT a fresh row.
          upsertStmts.push(
            db
              .prepare(
                `INSERT INTO mc_tasks
                   (id, project_id, code, title, status, status_emoji,
                    priority, deadline, next_step, owner, section,
                    is_cyrus_action, raw_markdown, synced_at, edited_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
              )
              .bind(
                taskId,
                projectId,
                String(task.code || ""),
                String(task.title || ""),
                String(task.status || "active"),
                String(task.status_emoji || ""),
                typeof task.priority === "number" ? task.priority : 99,
                task.deadline || null,
                String(task.next_step || ""),
                String(task.owner || ""),
                String(task.section || ""),
                task.is_cyrus_action ? 1 : 0,
                String(task.raw_markdown || ""),
                now,
                now
              )
          );
          totalAdded++;
        }
      }

      // ------------------------------------------------------------------
      // 4. Mark removed tasks as done (only if not locally edited)
      // ------------------------------------------------------------------
      const removeStmts = [];
      for (const [existingId, editedAt] of existingMap) {
        if (!incomingIds.has(existingId) && editedAt == null) {
          removeStmts.push(
            db
              .prepare(
                `UPDATE mc_tasks SET status = 'done', synced_at = ? WHERE id = ?`
              )
              .bind(now, existingId)
          );
          totalRemoved++;
        }
      }

      // ------------------------------------------------------------------
      // 5. Execute all statements in batch
      // ------------------------------------------------------------------
      const allStmts = [...upsertStmts, ...removeStmts];
      if (allStmts.length > 0) {
        // D1 batch limit is not documented to be capped, but let's chunk
        // at 50 to be safe with large payloads.
        const CHUNK = 50;
        for (let i = 0; i < allStmts.length; i += CHUNK) {
          await db.batch(allStmts.slice(i, i + CHUNK));
        }
      }
    }

    // ------------------------------------------------------------------
    // 6. Log the sync
    // ------------------------------------------------------------------
    await db
      .prepare(
        `INSERT INTO mc_sync_log (synced_at, projects_synced, tasks_added, tasks_updated, tasks_removed)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(now, JSON.stringify(projects.map(p => p.project_id)), totalAdded, totalUpdated, totalRemoved)
      .run();

    return json({
      ok: true,
      added: totalAdded,
      updated: totalUpdated,
      removed: totalRemoved,
      synced_at: now,
    }, 200, request);
  } catch (error) {
    return json(
      { ok: false, error: "sync_failed", message: String(error?.message || "") },
      500, request
    );
  }
}

// ---------------------------------------------------------------------------
// OPTIONS preflight
// ---------------------------------------------------------------------------
export async function onRequestOptions(context) {
  return handleOptions(context.request);
}
