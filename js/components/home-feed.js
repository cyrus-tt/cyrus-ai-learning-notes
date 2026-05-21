(function() {
  // Load latest 5 TIL entries with body text
  var tilContainer = document.getElementById("til-latest");
  if (tilContainer) {
    fetch("/til/entries.json")
      .then(function(r) { return r.json(); })
      .then(function(entries) {
        if (!Array.isArray(entries) || !entries.length) {
          tilContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">暂无 TIL。</p>';
          return;
        }
        entries.sort(function(a, b) { return (b.date || "").localeCompare(a.date || ""); });
        var html = '';
        entries.slice(0, 5).forEach(function(e) {
          html += '<div style="padding:16px 0;border-bottom:1px solid var(--line-soft);">'
            + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;">'
            + '<strong style="font-size:15px;font-weight:500;color:var(--ink);">' + esc(e.title || '') + '</strong>'
            + '<span style="font-size:12px;font-family:var(--font-mono);color:var(--muted-2);white-space:nowrap;">' + esc(e.date || '') + '</span>'
            + '</div>'
            + '<p style="font-size:14px;color:var(--muted);line-height:1.65;margin:8px 0 0;">' + esc(e.body || '') + '</p>';
          if (e.tags && e.tags.length) {
            html += '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">';
            e.tags.forEach(function(t) {
              html += '<span style="font-size:11px;color:var(--accent);background:var(--accent-soft);padding:2px 8px;border-radius:999px;">' + esc(t) + '</span>';
            });
            html += '</div>';
          }
          html += '</div>';
        });
        tilContainer.innerHTML = html;
      })
      .catch(function() {
        tilContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">加载失败。</p>';
      });
  }

  // Load top 5 news items inline
  var newsContainer = document.getElementById("news-latest");
  if (newsContainer) {
    fetch("/data/news.json")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var items = (data && data.items) || [];
        if (!items.length) {
          newsContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">暂无资讯。</p>';
          return;
        }
        items.sort(function(a, b) { return (b.aiScore || 0) - (a.aiScore || 0); });
        var html = '';
        items.slice(0, 5).forEach(function(item) {
          var summary = (item.summary || '').slice(0, 120);
          if ((item.summary || '').length > 120) summary += '…';
          html += '<div style="padding:14px 0;border-bottom:1px solid var(--line-soft);">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">'
            + '<a href="' + esc(item.url || '#') + '" target="_blank" rel="noopener" style="font-size:15px;font-weight:500;color:var(--ink);text-decoration:none;line-height:1.4;flex:1;">' + esc(item.title || '') + '</a>'
            + '<span style="font-size:12px;font-weight:600;color:var(--accent);white-space:nowrap;padding:2px 8px;background:var(--accent-soft);border-radius:999px;">' + (item.aiScore || '—') + '</span>'
            + '</div>'
            + '<p style="font-size:13px;color:var(--muted);line-height:1.55;margin:6px 0 0;">' + esc(summary) + '</p>'
            + '</div>';
        });
        newsContainer.innerHTML = html;
      })
      .catch(function() {
        newsContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">加载失败。</p>';
      });
  }

  function esc(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
})();
