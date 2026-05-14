/* ═══════════════════════════════════════════════════════════════
   chat-widget.js — AI Cyrus Chat Widget
   Floating chat button + expandable panel with SSE streaming
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  // ─── Config ────────────────────────────────────────────────
  var API_URL = "/api/chat";
  var WELCOME_MSG =
    "Hey，我是 Cyrus 的 AI 分身。问我关于 AI 实践、教程、工具的任何问题。";
  var MAX_LENGTH = 500;

  // ─── State ─────────────────────────────────────────────────
  var messages = [];
  var isStreaming = false;
  var panelOpen = false;

  // ─── HTML Escape (XSS prevention) ──────────────────────────
  function esc(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ─── Build DOM ─────────────────────────────────────────────
  var root = document.createElement("div");
  root.id = "cyrus-chat";
  root.className = "chat-widget";
  root.innerHTML =
    '<button class="chat-fab" aria-label="和 AI Cyrus 聊天">' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>' +
        '<path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>' +
      "</svg>" +
    "</button>" +
    '<div class="chat-panel" hidden>' +
      '<div class="chat-header">' +
        '<span class="chat-header-title">' +
          '<span class="chat-header-dot"></span>AI Cyrus' +
        "</span>" +
        '<button class="chat-close" aria-label="关闭">×</button>' +
      "</div>" +
      '<div class="chat-messages"></div>' +
      '<form class="chat-input-form">' +
        '<input type="text" class="chat-input" placeholder="问我任何关于 AI 的问题..." maxlength="' + MAX_LENGTH + '" />' +
        '<button type="submit" class="chat-send">发送</button>' +
      "</form>" +
    "</div>";

  document.body.appendChild(root);

  // ─── Refs ──────────────────────────────────────────────────
  var fab = root.querySelector(".chat-fab");
  var panel = root.querySelector(".chat-panel");
  var closeBtn = root.querySelector(".chat-close");
  var msgArea = root.querySelector(".chat-messages");
  var form = root.querySelector(".chat-input-form");
  var input = root.querySelector(".chat-input");
  var sendBtn = root.querySelector(".chat-send");

  // ─── Toggle Panel ──────────────────────────────────────────
  function togglePanel() {
    panelOpen = !panelOpen;
    panel.hidden = !panelOpen;
    if (panelOpen) {
      // Show welcome on first open
      if (messages.length === 0) {
        addMessage("assistant", WELCOME_MSG);
      }
      input.focus();
      scrollToBottom();
    }
  }

  fab.addEventListener("click", togglePanel);
  closeBtn.addEventListener("click", togglePanel);

  // ─── Render Message ────────────────────────────────────────
  function addMessage(role, content) {
    messages.push({ role: role, content: content });
    var div = document.createElement("div");
    div.className = "chat-msg " + (role === "user" ? "chat-msg-user" : "chat-msg-ai");
    div.innerHTML = formatContent(content);
    msgArea.appendChild(div);
    scrollToBottom();
    return div;
  }

  function formatContent(text) {
    // Escape HTML first, then apply minimal formatting
    var escaped = esc(text);
    // Inline code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Line breaks
    escaped = escaped.replace(/\n/g, "<br>");
    return escaped;
  }

  function updateLastAssistantMessage(content) {
    var lastAi = msgArea.querySelector(".chat-msg-ai:last-child");
    if (lastAi) {
      lastAi.innerHTML = formatContent(content);
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  // ─── Typing Indicator ─────────────────────────────────────
  function showTyping() {
    var div = document.createElement("div");
    div.className = "chat-msg chat-msg-ai chat-typing";
    div.id = "chat-typing-indicator";
    div.innerHTML = '<span class="chat-dots"><span></span><span></span><span></span></span>';
    msgArea.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    var el = document.getElementById("chat-typing-indicator");
    if (el) el.remove();
  }

  // ─── Set streaming state ───────────────────────────────────
  function setStreaming(val) {
    isStreaming = val;
    input.disabled = val;
    sendBtn.disabled = val;
    if (!val) input.focus();
  }

  // ─── Send Message ──────────────────────────────────────────
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || isStreaming) return;

    addMessage("user", text);
    input.value = "";
    setStreaming(true);
    showTyping();

    // Build conversation for API (exclude welcome message from context if role is assistant and it's the first)
    var apiMessages = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      // Skip the welcome message (first assistant message)
      if (i === 0 && m.role === "assistant") continue;
      apiMessages.push({ role: m.role, content: m.content });
    }

    sendToAPI(apiMessages);
  });

  // ─── API Call with SSE ─────────────────────────────────────
  function sendToAPI(apiMessages) {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    })
      .then(function (response) {
        var contentType = response.headers.get("content-type") || "";

        // JSON fallback response (AI not configured)
        if (contentType.indexOf("application/json") !== -1) {
          return response.json().then(function (data) {
            removeTyping();
            if (data.fallback) {
              addMessage("assistant", data.response || data.fallback);
            } else if (data.response) {
              addMessage("assistant", data.response);
            } else {
              addMessage("assistant", "抱歉，暂时无法回复。");
            }
            setStreaming(false);
          });
        }

        // SSE stream
        removeTyping();
        var assistantContent = "";
        var assistantDiv = addMessage("assistant", "");
        // Update messages array reference
        var msgIndex = messages.length - 1;

        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";

        function readChunk() {
          return reader.read().then(function (result) {
            if (result.done) {
              // Process any remaining buffer
              if (buffer.trim()) {
                processLine(buffer);
              }
              messages[msgIndex].content = assistantContent;
              setStreaming(false);
              return;
            }

            buffer += decoder.decode(result.value, { stream: true });
            var lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (var j = 0; j < lines.length; j++) {
              processLine(lines[j]);
            }

            return readChunk();
          });
        }

        function processLine(line) {
          if (line.indexOf("data: ") === 0) {
            var data = line.slice(6);
            if (data === "[DONE]") return;
            try {
              var parsed = JSON.parse(data);
              if (parsed.response) {
                assistantContent += parsed.response;
                assistantDiv.innerHTML = formatContent(assistantContent);
                scrollToBottom();
              }
            } catch (e) {
              // Ignore malformed JSON
            }
          }
        }

        return readChunk();
      })
      .catch(function (err) {
        removeTyping();
        addMessage(
          "assistant",
          "网络错误，请稍后再试。"
        );
        setStreaming(false);
        console.error("Chat widget error:", err);
      });
  }
})();
