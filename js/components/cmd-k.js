(function () {
  "use strict";

  var API_URL = "/api/chat";
  var overlay, input, results, mode;
  var isOpen = false;
  var abortCtrl = null;

  function esc(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function build() {
    overlay = document.createElement("div");
    overlay.className = "cmdk-overlay";
    overlay.innerHTML =
      '<div class="cmdk-container">' +
        '<div class="cmdk-input-wrap">' +
          '<svg class="cmdk-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
          '<input class="cmdk-input" placeholder="搜索、提问、导航… (AI 驱动)" autocomplete="off" />' +
          '<kbd class="cmdk-kbd">ESC</kbd>' +
        '</div>' +
        '<div class="cmdk-body">' +
          '<div class="cmdk-hints">' +
            '<span class="cmdk-hint" data-q="这个网站有什么内容？">网站导览</span>' +
            '<span class="cmdk-hint" data-q="推荐一篇适合入门的教程">推荐教程</span>' +
            '<span class="cmdk-hint" data-q="最近有什么 AI 新闻值得关注？">AI 热点</span>' +
            '<span class="cmdk-hint" data-q="Cyrus 是谁？做过什么项目？">关于 Cyrus</span>' +
          '</div>' +
          '<div class="cmdk-results" hidden></div>' +
          '<div class="cmdk-ai-answer" hidden></div>' +
        '</div>' +
        '<div class="cmdk-footer">' +
          '<span>⌘K 唤起</span>' +
          '<span>↵ AI 回答</span>' +
          '<span>ESC 关闭</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    input = overlay.querySelector(".cmdk-input");
    results = overlay.querySelector(".cmdk-results");
    mode = overlay.querySelector(".cmdk-ai-answer");

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); e.preventDefault(); }
    });

    input.addEventListener("input", debounce(onInput, 300));

    overlay.querySelector(".cmdk-input-wrap").addEventListener("submit", function (e) { e.preventDefault(); });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && input.value.trim()) {
        e.preventDefault();
        askAI(input.value.trim());
      }
    });

    overlay.querySelectorAll(".cmdk-hint").forEach(function (hint) {
      hint.addEventListener("click", function () {
        var q = hint.getAttribute("data-q");
        input.value = q;
        askAI(q);
      });
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments, ctx = this;
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function open() {
    if (!overlay) build();
    isOpen = true;
    overlay.classList.add("open");
    input.value = "";
    results.hidden = true;
    mode.hidden = true;
    overlay.querySelector(".cmdk-hints").hidden = false;
    input.focus();
    document.body.style.overflow = "hidden";
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  function onInput() {
    var q = input.value.trim();
    if (!q) {
      results.hidden = true;
      overlay.querySelector(".cmdk-hints").hidden = false;
      mode.hidden = true;
      return;
    }
    overlay.querySelector(".cmdk-hints").hidden = true;
    quickSearch(q);
  }

  function quickSearch(q) {
    var pages = [
      { title: "首页", url: "/", keys: "home 首页" },
      { title: "AI Playground · 动手实验", url: "/playground.html", keys: "playground 实验 动手" },
      { title: "实验室 · Field Notes", url: "/field-notes/", keys: "field notes 教程 实验室" },
      { title: "AI 资讯", url: "/news.html", keys: "news 资讯 新闻" },
      { title: "关于 Cyrus", url: "/about.html", keys: "about 关于 cyrus" },
      { title: "Claude Code Skill 完全指南", url: "/field-notes/claude-code-skills-guide/", keys: "claude code skill 技能" },
      { title: "n8n + Ollama 本地 AI 管道", url: "/field-notes/n8n-ollama-local-pipeline/", keys: "n8n ollama 管道 本地" },
      { title: "Cloudflare Pages 零成本建站", url: "/field-notes/cloudflare-pages-guide/", keys: "cloudflare pages 建站" },
      { title: "TIL · Today I Learned", url: "/til/", keys: "til today learned 学到" },
      { title: "周报 · Cyrus Weekly", url: "/weekly/", keys: "weekly 周报" },
    ];

    var lower = q.toLowerCase();
    var matched = pages.filter(function (p) {
      return p.title.toLowerCase().indexOf(lower) !== -1 || p.keys.indexOf(lower) !== -1;
    });

    if (matched.length > 0) {
      results.hidden = false;
      mode.hidden = true;
      results.innerHTML = matched.map(function (p) {
        return '<a class="cmdk-result" href="' + p.url + '">' +
          '<span class="cmdk-result-title">' + esc(p.title) + '</span>' +
          '<span class="cmdk-result-url">' + p.url + '</span>' +
        '</a>';
      }).join("");
    } else {
      results.hidden = true;
    }
  }

  function askAI(q) {
    if (abortCtrl) { abortCtrl.abort(); }
    abortCtrl = new AbortController();

    overlay.querySelector(".cmdk-hints").hidden = true;
    results.hidden = true;
    mode.hidden = false;
    mode.innerHTML =
      '<div class="cmdk-ai-header">' +
        '<span class="cmdk-ai-label">AI Cyrus</span>' +
        '<span class="cmdk-ai-status">思考中…</span>' +
      '</div>' +
      '<div class="cmdk-ai-content"><span class="chat-dots"><span></span><span></span><span></span></span></div>';

    var pageContext = "";
    var article = document.querySelector("article, .article-body, .field-note-body");
    if (article) {
      pageContext = "\n\n当前页面内容（用户正在阅读）:\n" + article.textContent.slice(0, 2000);
    }

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: q + pageContext }]
      }),
      signal: abortCtrl.signal,
    })
    .then(function (res) {
      var ct = res.headers.get("content-type") || "";
      if (ct.indexOf("application/json") !== -1) {
        return res.json().then(function (data) {
          mode.querySelector(".cmdk-ai-content").innerHTML = esc(data.response || "暂时无法回答");
          mode.querySelector(".cmdk-ai-status").textContent = "完成";
        });
      }

      var content = "";
      var contentEl = mode.querySelector(".cmdk-ai-content");
      var statusEl = mode.querySelector(".cmdk-ai-status");
      statusEl.textContent = "回答中…";
      contentEl.innerHTML = "";

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      function read() {
        return reader.read().then(function (r) {
          if (r.done) {
            if (buffer.trim()) processLine(buffer);
            statusEl.textContent = "完成";
            return;
          }
          buffer += decoder.decode(r.value, { stream: true });
          var lines = buffer.split("\n");
          buffer = lines.pop() || "";
          lines.forEach(processLine);
          return read();
        });
      }

      function processLine(line) {
        if (line.indexOf("data: ") !== 0) return;
        var data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          var p = JSON.parse(data);
          if (p.response) {
            content += p.response;
            contentEl.innerHTML = formatMarkdown(content);
          }
        } catch (e) {}
      }

      return read();
    })
    .catch(function (err) {
      if (err.name === "AbortError") return;
      mode.querySelector(".cmdk-ai-content").innerHTML = '<span style="color:var(--accent)">请求失败，请稍后再试</span>';
      mode.querySelector(".cmdk-ai-status").textContent = "错误";
    });
  }

  function formatMarkdown(text) {
    var s = esc(text);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\n/g, "<br>");
    return s;
  }

  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (isOpen) close(); else open();
    }
  });

  var trigger = document.getElementById("cmdkTrigger");
  if (trigger) trigger.addEventListener("click", open);
})();
