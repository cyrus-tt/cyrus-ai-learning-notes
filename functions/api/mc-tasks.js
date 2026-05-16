import { checkMcAuth } from "./_lib/mc-auth.js";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8", ...corsHeaders },
  });
}

// ---------------------------------------------------------------------------
// GET /api/mc-tasks
// ---------------------------------------------------------------------------
export async function onRequestGet(context) {
  const { request, env } = context;

  if (!checkMcAuth(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const db = env?.DB;
  if (!db) {
    return json({ ok: false, error: "db_not_configured" }, 500);
  }

  const url = new URL(request.url);
  const filterProject = url.searchParams.get("project") || null;
  const filterStatus = url.searchParams.get("status") || null;
  const filterCyrus = url.searchParams.get("cyrus") || null;

  try {
    // Build WHERE clauses dynamically
    const conditions = [];
    const bindings = [];

    if (filterProject) {
      conditions.push("t.project_id = ?");
      bindings.push(filterProject);
    }
    if (filterStatus) {
      conditions.push("t.status = ?");
      bindings.push(filterStatus);
    }
    if (filterCyrus === "1") {
      conditions.push("t.is_cyrus_action = 1");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query tasks with project join
    const taskQuery = `
      SELECT
        t.id, t.project_id, t.code, t.title, t.status, t.status_emoji,
        t.priority, t.deadline, t.next_step, t.owner, t.section,
        t.is_cyrus_action, t.raw_markdown, t.synced_at, t.edited_at,
        t.pinned_at,
        p.name AS project_name, p.color AS project_color
      FROM mc_tasks t
      LEFT JOIN mc_projects p ON t.project_id = p.id
      ${whereClause}
      ORDER BY
        CASE WHEN t.deadline IS NULL THEN 1 ELSE 0 END ASC,
        t.deadline ASC,
        t.priority ASC
    `;

    const taskResult = await db
      .prepare(taskQuery)
      .bind(...bindings)
      .all();

    const tasks = (taskResult?.results || []).map((row) => ({
      id: row.id,
      project_id: row.project_id,
      code: row.code,
      title: row.title,
      status: row.status,
      status_emoji: row.status_emoji,
      priority: row.priority,
      deadline: row.deadline,
      next_step: row.next_step,
      owner: row.owner,
      section: row.section,
      is_cyrus_action: row.is_cyrus_action,
      raw_markdown: row.raw_markdown,
      synced_at: row.synced_at,
      edited_at: row.edited_at,
      pinned_at: row.pinned_at,
      project_name: row.project_name,
      project_color: row.project_color,
    }));

    // Query all projects
    const projectResult = await db
      .prepare("SELECT id AS project_id, name, color, last_synced_at, file_hash FROM mc_projects")
      .all();

    const projects = (projectResult?.results || []).map((row) => ({
      project_id: row.project_id,
      name: row.name,
      color: row.color,
      last_synced_at: row.last_synced_at,
      file_hash: row.file_hash,
    }));

    // Get last sync timestamp
    const syncRow = await db
      .prepare("SELECT synced_at FROM mc_sync_log ORDER BY synced_at DESC LIMIT 1")
      .first();

    return json({
      ok: true,
      tasks,
      projects,
      last_sync: syncRow?.synced_at || null,
    });
  } catch (error) {
    return json(
      { ok: false, error: "db_read_failed", message: String(error?.message || "") },
      500
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/mc-tasks
// ---------------------------------------------------------------------------
export async function onRequestPatch(context) {
  const { request, env } = context;

  if (!checkMcAuth(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const db = env?.DB;
  if (!db) {
    return json({ ok: false, error: "db_not_configured" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const taskId = String(body?.id || "").trim();
  if (!taskId) {
    return json({ ok: false, error: "missing_task_id" }, 400);
  }

  // Build SET clause from allowed fields
  const allowedFields = [
    "status", "priority", "next_step", "owner", "is_cyrus_action",
    "title", "deadline", "pinned_at"
  ];
  const setClauses = [];
  const setBindings = [];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      setClauses.push(`${field} = ?`);
      setBindings.push(body[field]);
    }
  }

  if (setClauses.length === 0) {
    return json({ ok: false, error: "no_fields_to_update" }, 400);
  }

  // Always set edited_at to mark as locally edited
  const now = new Date().toISOString();
  setClauses.push("edited_at = ?");
  setBindings.push(now);

  // Add WHERE binding
  setBindings.push(taskId);

  try {
    const result = await db
      .prepare(`UPDATE mc_tasks SET ${setClauses.join(", ")} WHERE id = ?`)
      .bind(...setBindings)
      .run();

    if ((result?.meta?.changes || 0) === 0) {
      return json({ ok: false, error: "task_not_found" }, 404);
    }

    return json({ ok: true, edited_at: now });
  } catch (error) {
    return json(
      { ok: false, error: "db_update_failed", message: String(error?.message || "") },
      500
    );
  }
}

// ---------------------------------------------------------------------------
// OPTIONS preflight
// ---------------------------------------------------------------------------
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
