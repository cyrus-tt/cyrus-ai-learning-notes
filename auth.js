/**
 * auth.js — Google Sign-In integration
 *
 * Responsibilities:
 *  1. Fetch Google Client ID from /api/auth/config
 *  2. Load Google GSI script and render sign-in button
 *  3. Check existing session via /api/auth/me on page load
 *  4. Expose window.authState and dispatch 'auth-state-changed' event
 */

const authState = {
  user: null,   // null = not logged in, object = logged in
  ready: false  // true once initial session check is complete
};

// Expose globally so other scripts (news.js) can read it
window.authState = authState;

async function initAuth() {
  injectAuthWidget();

  // 1. Check existing session
  try {
    const data = await fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json());
    if (data?.ok && data?.user) {
      authState.user = data.user;
      authState.ready = true;
      updateAuthUI();
      notifyAuthChange();
      return; // Already logged in — no need to load GSI
    }
  } catch {
    // Network error or DB unavailable — proceed to show login button
  }

  // 2. Load Google GSI and render sign-in button
  try {
    const config = await fetch("/api/auth/config").then((r) => r.json());
    if (config?.googleClientId) {
      await loadGsiScript();
      google.accounts.id.initialize({
        client_id: config.googleClientId,
        callback: handleGoogleCredential,
        auto_select: false
      });
      renderGoogleButton();
    }
  } catch (err) {
    console.warn("[auth] Google GSI init failed:", err);
  }

  authState.ready = true;
  updateAuthUI();
  notifyAuthChange();
}

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function renderGoogleButton() {
  document.querySelectorAll(".auth-google-btn").forEach((el) => {
    el.innerHTML = "";
    google.accounts.id.renderButton(el, {
      type: "standard",
      shape: "pill",
      theme: "outline",
      size: "medium",
      text: "signin_with",
      locale: "zh_CN"
    });
  });
}

async function handleGoogleCredential(response) {
  if (!response?.credential) return;

  try {
    const result = await fetch("/api/auth/google", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential })
    }).then((r) => r.json());

    if (result?.ok && result?.user) {
      authState.user = result.user;
      updateAuthUI();
      notifyAuthChange();
    } else {
      console.error("[auth] Login failed:", result?.error);
      alert("登录失败，请稍后再试");
    }
  } catch (err) {
    console.error("[auth] Login error:", err);
    alert("登录失败，请检查网络连接");
  }
}

async function handleLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // best-effort
  }

  authState.user = null;

  // Disable Google auto-select so the button appears again
  try {
    google?.accounts?.id?.disableAutoSelect?.();
  } catch {}

  updateAuthUI();
  notifyAuthChange();

  // Re-render Google button in every widget
  try {
    renderGoogleButton();
  } catch {}
}

/**
 * Inject auth widget HTML into every .header-inner on the page.
 * Widgets are injected before the existing nav (rightmost slot).
 */
function injectAuthWidget() {
  document.querySelectorAll(".header-inner").forEach((headerInner) => {
    if (headerInner.querySelector(".auth-widget")) return; // already injected

    const widget = document.createElement("div");
    widget.className = "auth-widget";
    widget.innerHTML = `
      <div class="auth-google-btn" aria-label="使用 Google 登录"></div>
      <div class="auth-user-info" hidden>
        <img class="auth-avatar" src="" alt="" width="28" height="28" />
        <span class="auth-name"></span>
        <button class="auth-logout-btn" type="button" aria-label="退出登录">退出</button>
      </div>
    `;

    widget.querySelector(".auth-logout-btn").addEventListener("click", handleLogout);
    headerInner.appendChild(widget);
  });
}

function updateAuthUI() {
  const user = authState.user;

  document.querySelectorAll(".auth-widget").forEach((widget) => {
    const btn = widget.querySelector(".auth-google-btn");
    const info = widget.querySelector(".auth-user-info");
    const avatar = widget.querySelector(".auth-avatar");
    const nameEl = widget.querySelector(".auth-name");

    if (btn) btn.hidden = !!user;
    if (info) info.hidden = !user;

    if (user && avatar) {
      avatar.src = user.picture || "";
      avatar.alt = user.name || "";
    }
    if (user && nameEl) {
      nameEl.textContent = user.name || user.email || "";
    }
  });
}

function notifyAuthChange() {
  window.dispatchEvent(
    new CustomEvent("auth-state-changed", { detail: { user: authState.user } })
  );
}

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}
