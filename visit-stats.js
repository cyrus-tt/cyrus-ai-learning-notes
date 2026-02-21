(() => {
  const STATS_ELEMENT_ID = "visitStats";
  const STORAGE_PREFIX = "cyrus:visit";
  const SAFE_PATH_PATTERN = /^\/[a-zA-Z0-9\-._~/]*$/;

  function safeGetLocalStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSetLocalStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors (private mode / blocked storage).
    }
  }

  function sanitizePath(pathname) {
    const raw = String(pathname || "/").trim();
    const noQuery = raw.split("?")[0].split("#")[0] || "/";
    const normalized = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
    const compact = normalized.replace(/\/{2,}/g, "/").slice(0, 120);

    if (!SAFE_PATH_PATTERN.test(compact)) {
      return "/";
    }
    return compact || "/";
  }

  function getUtcDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatCount(value) {
    const number = Number.parseInt(String(value ?? "0"), 10);
    if (!Number.isFinite(number) || number < 0) {
      return "--";
    }
    return number.toLocaleString("zh-CN");
  }

  async function fetchVisitStats(path, shouldRecord) {
    const params = new URLSearchParams({
      path,
      record: shouldRecord ? "1" : "0"
    });
    const response = await fetch(`/api/visits?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`visit stats request failed: ${response.status}`);
    }

    return response.json();
  }

  async function setupVisitStats() {
    const el = document.getElementById(STATS_ELEMENT_ID);
    if (!el) {
      return;
    }

    const path = sanitizePath(window.location.pathname);
    const dateKey = getUtcDateKey();
    const storageKey = `${STORAGE_PREFIX}:${path}:${dateKey}`;
    const shouldRecord = safeGetLocalStorage(storageKey) !== "1";

    try {
      const payload = await fetchVisitStats(path, shouldRecord);
      if (payload?.available) {
        el.textContent = `访问统计：总访问 ${formatCount(payload.totalVisits)} ｜ 今日 ${formatCount(payload.todayVisits)}`;
        if (shouldRecord) {
          safeSetLocalStorage(storageKey, "1");
        }
      } else {
        el.textContent = "访问统计：暂不可用";
      }
    } catch {
      el.textContent = "访问统计：加载失败";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupVisitStats);
  } else {
    setupVisitStats();
  }
})();
