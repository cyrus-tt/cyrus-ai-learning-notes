/**
 * favorites.js - 收藏管理器
 *
 * 能力：
 * 1) 本地收藏（未登录可用）
 * 2) 登录后自动同步至 /api/favorites
 * 3) 提供收藏按钮状态更新与列表渲染方法
 */

class FavoritesManager {
  constructor(options = {}) {
    this.storageKey = options.storageKey || "ai-note:favorites:v1";
    this.guestIdKey = options.guestIdKey || "ai-note:guest-id";
    this.apiBase = options.apiBase || "/api/favorites";
    this.maxItems = Number.isFinite(options.maxItems) ? Math.max(20, options.maxItems) : 500;
    this.favorites = [];
    this.listeners = new Set();
    this.syncing = false;

    this.handleAuthChange = this.handleAuthChange.bind(this);
  }

  /**
   * 初始化：读取本地收藏，并在登录态下尝试同步。
   */
  async init() {
    this.favorites = this.loadLocalFavorites();
    this.bindAuthEvents();

    if (this.isLoggedIn()) {
      await this.syncAfterLogin();
    }

    this.notifyUpdate("init");
    return this.getFavorites();
  }

  bindAuthEvents() {
    window.addEventListener("auth-state-changed", this.handleAuthChange);
  }

  destroy() {
    window.removeEventListener("auth-state-changed", this.handleAuthChange);
    this.listeners.clear();
  }

  async handleAuthChange() {
    if (this.isLoggedIn()) {
      await this.syncAfterLogin();
      this.notifyUpdate("login_sync");
      return;
    }

    this.favorites = this.loadLocalFavorites();
    this.notifyUpdate("logout_local");
  }

  isLoggedIn() {
    return Boolean(window.authState?.user?.id);
  }

  getFavorites() {
    return this.favorites.map((item) => ({ ...item }));
  }

  getFavoriteCount() {
    return this.favorites.length;
  }

  hasFavorite(newsId) {
    const key = this.normalizeNewsId(newsId);
    if (!key) return false;
    return this.favorites.some((item) => item.newsId === key);
  }

  async toggleFavorite(newsItem) {
    const favorite = this.normalizeFavorite(newsItem);
    if (!favorite) {
      throw new Error("invalid_favorite_item");
    }

    if (this.hasFavorite(favorite.newsId)) {
      return this.removeFavorite(favorite.newsId);
    }

    return this.addFavorite(favorite);
  }

  async addFavorite(newsItem) {
    const favorite = this.normalizeFavorite(newsItem);
    if (!favorite) {
      throw new Error("invalid_favorite_item");
    }

    const index = this.favorites.findIndex((item) => item.newsId === favorite.newsId);
    if (index >= 0) {
      this.favorites[index] = {
        ...this.favorites[index],
        ...favorite,
        createdAt: this.favorites[index].createdAt || favorite.createdAt
      };
    } else {
      this.favorites.unshift(favorite);
      if (this.favorites.length > this.maxItems) {
        this.favorites = this.favorites.slice(0, this.maxItems);
      }
    }

    this.saveLocalFavorites();
    this.notifyUpdate("add");

    if (this.isLoggedIn()) {
      try {
        await this.saveServerFavorite(favorite);
      } catch (error) {
        this.reportError(error, "add_sync");
      }
    }

    return favorite;
  }

  async removeFavorite(newsId) {
    const key = this.normalizeNewsId(newsId);
    if (!key) {
      throw new Error("invalid_news_id");
    }

    const prevLength = this.favorites.length;
    this.favorites = this.favorites.filter((item) => item.newsId !== key);

    if (this.favorites.length === prevLength) {
      return { removed: false, newsId: key };
    }

    this.saveLocalFavorites();
    this.notifyUpdate("remove");

    if (this.isLoggedIn()) {
      try {
        await this.deleteServerFavorite(key);
      } catch (error) {
        this.reportError(error, "remove_sync");
      }
    }

    return { removed: true, newsId: key };
  }

  /**
   * 登录后自动同步：
   * - 先拉取服务器收藏
   * - 与本地合并去重
   * - 把本地新增项补写回服务器
   */
  async syncAfterLogin() {
    if (this.syncing) return;
    this.syncing = true;

    try {
      const local = this.loadLocalFavorites();
      const server = await this.fetchServerFavorites();
      const merged = this.mergeFavorites(local, server);

      const serverSet = new Set(server.map((item) => item.newsId));
      const needsUpload = merged.filter((item) => !serverSet.has(item.newsId));

      for (const item of needsUpload) {
        try {
          await this.saveServerFavorite(item);
        } catch (error) {
          this.reportError(error, "sync_upload");
        }
      }

      const latestServer = await this.fetchServerFavorites();
      this.favorites = this.mergeFavorites(merged, latestServer);
      this.saveLocalFavorites();
    } catch (error) {
      this.reportError(error, "sync_after_login");
      this.favorites = this.loadLocalFavorites();
    } finally {
      this.syncing = false;
    }
  }

  subscribe(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyUpdate(reason = "update") {
    const snapshot = this.getFavorites();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot, reason);
      } catch {
        // ignore listener errors
      }
    });

    window.dispatchEvent(
      new CustomEvent("favorites-updated", {
        detail: {
          reason,
          favorites: snapshot
        }
      })
    );
  }

  /**
   * UI 方法：更新所有收藏按钮状态。
   * 约定：按钮需包含 data-favorite-id 或 data-favorite-news-id。
   */
  updateFavoriteButtons(root = document) {
    const nodes = root.querySelectorAll("[data-favorite-id], [data-favorite-news-id]");
    nodes.forEach((el) => {
      const rawId = el.getAttribute("data-favorite-id") || el.getAttribute("data-favorite-news-id") || "";
      const id = this.normalizeNewsId(rawId);
      const active = id ? this.hasFavorite(id) : false;

      el.classList.toggle("is-favorited", active);
      el.setAttribute("aria-pressed", active ? "true" : "false");
      el.setAttribute("data-favorited", active ? "1" : "0");

      const activeText = el.getAttribute("data-favorited-text") || "已收藏";
      const inactiveText = el.getAttribute("data-unfavorited-text") || "收藏";
      if (el.tagName === "BUTTON") {
        const label = active ? activeText : inactiveText;
        if (el.textContent && (el.textContent.trim() === activeText || el.textContent.trim() === inactiveText)) {
          el.textContent = label;
        }
      }
    });
  }

  /**
   * UI 方法：渲染收藏列表。
   * 默认渲染为简单列表；可传入 renderItem 进行自定义模板。
   */
  renderFavorites(container, renderItem) {
    if (!container) return;

    const items = this.getFavorites();
    if (!items.length) {
      container.innerHTML = "<p class=\"favorites-empty\">暂无收藏内容</p>";
      return;
    }

    if (typeof renderItem === "function") {
      container.innerHTML = items.map((item, index) => renderItem(item, index)).join("");
      return;
    }

    container.innerHTML = items
      .map(
        (item) => `
          <article class="favorite-item" data-favorite-id="${this.escapeHtml(item.newsId)}">
            <h4 class="favorite-title">
              <a href="${this.escapeHtml(item.newsUrl || "#")}" target="_blank" rel="noopener noreferrer">
                ${this.escapeHtml(item.newsTitle || "未命名资讯")}
              </a>
            </h4>
            <p class="favorite-meta">${this.escapeHtml(item.newsPlatform || "未知平台")} · ${this.escapeHtml(item.newsDate || "")}</p>
            <p class="favorite-summary">${this.escapeHtml(item.newsSummary || "")}</p>
          </article>
        `
      )
      .join("");
  }

  mergeFavorites(listA, listB) {
    const merged = new Map();
    [...listA, ...listB].forEach((raw) => {
      const item = this.normalizeFavorite(raw);
      if (!item) return;

      const prev = merged.get(item.newsId);
      if (!prev) {
        merged.set(item.newsId, item);
        return;
      }

      const prevTs = Date.parse(prev.createdAt || "") || 0;
      const curTs = Date.parse(item.createdAt || "") || 0;
      merged.set(item.newsId, curTs >= prevTs ? item : prev);
    });

    return Array.from(merged.values())
      .sort((a, b) => (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0))
      .slice(0, this.maxItems);
  }

  normalizeFavorite(raw) {
    if (!raw || typeof raw !== "object") return null;

    const newsId = this.normalizeNewsId(raw.newsId || raw.news_id || raw.id || raw.sourceUrl || raw.newsUrl);
    const newsTitle = String(raw.newsTitle || raw.news_title || raw.title || raw.titleZh || raw.titleOriginal || "")
      .trim()
      .slice(0, 300);

    if (!newsId || !newsTitle) {
      return null;
    }

    const createdAt = this.normalizeIsoTime(raw.createdAt || raw.created_at);

    return {
      newsId,
      newsTitle,
      newsSummary: String(raw.newsSummary || raw.news_summary || raw.summary || raw.summaryZh || "")
        .trim()
        .slice(0, 5000),
      newsUrl: String(raw.newsUrl || raw.news_url || raw.sourceUrl || "").trim().slice(0, 2000),
      newsPlatform: String(raw.newsPlatform || raw.news_platform || raw.platform || "").trim().slice(0, 64),
      newsDate: String(raw.newsDate || raw.news_date || raw.date || "").trim().slice(0, 32),
      createdAt
    };
  }

  normalizeNewsId(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.slice(0, 200);
  }

  normalizeIsoTime(value) {
    if (!value) return new Date().toISOString();
    const parsed = Date.parse(String(value));
    if (Number.isNaN(parsed)) return new Date().toISOString();
    return new Date(parsed).toISOString();
  }

  async fetchServerFavorites() {
    if (!this.isLoggedIn()) {
      return [];
    }

    const response = await fetch(this.apiBase, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-guest-id": this.getGuestId()
      }
    });

    if (!response.ok) {
      throw new Error(await this.readApiError(response, "load_favorites_failed"));
    }

    const payload = await response.json();
    if (!payload?.ok || !Array.isArray(payload.items)) {
      return [];
    }

    return payload.items.map((item) => this.normalizeFavorite(item)).filter(Boolean);
  }

  async saveServerFavorite(item) {
    const response = await fetch(this.apiBase, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "x-guest-id": this.getGuestId()
      },
      body: JSON.stringify({
        news_id: item.newsId,
        news_title: item.newsTitle,
        news_summary: item.newsSummary,
        news_url: item.newsUrl,
        news_platform: item.newsPlatform,
        news_date: item.newsDate,
        created_at: item.createdAt
      })
    });

    if (!response.ok) {
      throw new Error(await this.readApiError(response, "save_favorite_failed"));
    }
  }

  async deleteServerFavorite(newsId) {
    const url = `${this.apiBase}?news_id=${encodeURIComponent(newsId)}`;
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "x-guest-id": this.getGuestId()
      }
    });

    if (!response.ok) {
      throw new Error(await this.readApiError(response, "delete_favorite_failed"));
    }
  }

  async readApiError(response, fallback) {
    try {
      const payload = await response.json();
      if (payload?.message) return payload.message;
      if (payload?.error) return payload.error;
    } catch {
      // ignore
    }
    return `${fallback}: http_${response.status}`;
  }

  loadLocalFavorites() {
    const raw = this.safeGetLocalStorage(this.storageKey);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => this.normalizeFavorite(item)).filter(Boolean);
    } catch {
      return [];
    }
  }

  saveLocalFavorites() {
    this.safeSetLocalStorage(this.storageKey, JSON.stringify(this.favorites));
  }

  getGuestId() {
    let guestId = this.safeGetLocalStorage(this.guestIdKey);
    if (guestId && /^[a-zA-Z0-9_-]{8,64}$/.test(guestId)) {
      return guestId;
    }

    guestId = this.generateGuestId();
    this.safeSetLocalStorage(this.guestIdKey, guestId);
    return guestId;
  }

  generateGuestId() {
    const now = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 14);
    return `${now}_${rand}`;
  }

  safeGetLocalStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  safeSetLocalStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore storage errors
    }
  }

  reportError(error, context) {
    if (window.ErrorHandler?.handleApiError) {
      window.ErrorHandler.handleApiError(error, context);
      return;
    }
    console.error(`[favorites:${context}]`, error);
  }

  escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value || "");
    return div.innerHTML;
  }
}

window.FavoritesManager = FavoritesManager;
