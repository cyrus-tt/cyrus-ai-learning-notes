(function () {
  "use strict";

  var API_URL = "/api/chat";
  var popover = null;
  var resultEl = null;
  var abortCtrl = null;
  var active = false;

  function esc(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function createPopover() {
    popover = document.createElement("div");
    popover.className = "explain-popover";
    popover.innerHTML =
      '<div class="explain-actions">' +
        '<button data-action="explain" class="explain-btn">💡 解释</button>' +
        '<button data-action="simplify" class="explain-btn">🎯 简化</button>' +
        '<button data-action="deepen" class="explain-btn">🔬 深入</button>' +
      '</div>' +
      '<div class="explain-result" hidden></div>';
    document.body.appendChild(popover);

    popover.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.getAttribute("data-action");
      var sel = window.getSelection();
      var text = sel.toString().trim();
      if (!text) return;
      runAction(action, text);
    });

    resultEl = popover.querySelector(".explain-result");
  }

  function showPopover(x, y) {
    if (!popover) createPopover();
    popover.style.left = Math.min(x, window.innerWidth - 320) + "px";
    popover.style.top = (y + window.scrollY + 8) + "px";
    popover.classList.add("visible");
    resultEl.hidden = true;
    popover.querySelector(".explain-actions").hidden = false;
    active = true;
  }

  function hidePopover() {
    if (!popover) return;
    popover.classList.remove("visible");
    active = false;
    if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
  }

  function runAction(action, text) {
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    var prompts = {
      explain: "请用通俗易懂的方式解释以下内容，像教朋友一样，简洁直接：\n\n" + text,
      simplify: "请用最简单的语言重新表述以下内容，初中生也能懂，一两句话说完：\n\n" + text,
      deepen: "请深入解释以下内容的技术细节、原理和背景知识，帮助读者建立更深的理解：\n\n" + text,
    };

    popover.querySelector(".explain-actions").hidden = true;
    resultEl.hidden = false;
    resultEl.innerHTML = '<span class="chat-dots"><span></span><span></span><span></span></span>';

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompts[action] }]
      }),
      signal: abortCtrl.signal,
    })
    .then(function (res) {
      var ct = res.headers.get("content-type") || "";
      if (ct.indexOf("application/json") !== -1) {
        return res.json().then(function (data) {
          resultEl.innerHTML = esc(data.response || "暂时无法回答");
        });
      }

      var content = "";
      resultEl.innerHTML = "";

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      function read() {
        return reader.read().then(function (r) {
          if (r.done) {
            if (buffer.trim()) processLine(buffer);
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
            var s = esc(content);
            s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
            s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
            s = s.replace(/\n/g, "<br>");
            resultEl.innerHTML = s;
          }
        } catch (e) {}
      }

      return read();
    })
    .catch(function (err) {
      if (err.name === "AbortError") return;
      resultEl.innerHTML = '<span style="color:var(--accent)">请求失败</span>';
    });
  }

  document.addEventListener("mouseup", function (e) {
    if (popover && popover.contains(e.target)) return;

    setTimeout(function () {
      var sel = window.getSelection();
      var text = sel.toString().trim();

      if (text.length > 5 && text.length < 2000) {
        var range = sel.getRangeAt(0);
        var rect = range.getBoundingClientRect();
        showPopover(rect.left, rect.bottom);
      } else if (active) {
        hidePopover();
      }
    }, 10);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && active) hidePopover();
  });
})();
