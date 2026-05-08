(function() {
  var container = document.getElementById("til-list");
  if (!container) return;

  fetch("/til/entries.json")
    .then(function(r) { return r.json(); })
    .then(function(entries) {
      if (!Array.isArray(entries) || !entries.length) {
        container.innerHTML = '<p style="color:var(--muted)">暂无 TIL 条目。</p>';
        return;
      }

      entries.sort(function(a, b) {
        return (b.date || "").localeCompare(a.date || "");
      });

      container.innerHTML = entries.map(function(e) {
        var body = escapeHtml(e.body || "").replace(/`([^`]+)`/g, '<code>$1</code>');
        var tags = (e.tags || []).map(function(t) {
          return '<span class="til-tag">' + escapeHtml(t) + '</span>';
        }).join("");
        var source = e.source ? '<p class="til-source">来源：' + escapeHtml(e.source) + '</p>' : '';

        return '<article class="til-entry" id="' + escapeHtml(e.id || '') + '">'
          + '<p class="til-date">' + escapeHtml(e.date || '') + '</p>'
          + '<h2 class="til-title">' + escapeHtml(e.title || '') + '</h2>'
          + '<p class="til-body">' + body + '</p>'
          + '<div class="til-tags">' + tags + '</div>'
          + source
          + '</article>';
      }).join("");

      var countEl = document.getElementById("til-count");
      if (countEl) countEl.textContent = "共 " + entries.length + " 条";
    })
    .catch(function() {
      container.innerHTML = '<p style="color:var(--muted)">加载失败，请刷新重试。</p>';
    });

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
})();
