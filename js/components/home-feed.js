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
          var title = item.titleZh || item.title || '';
          // 数据里的字段是 sourceUrl，不是 url —— 之前写成 item.url，
          // 结果首页每条资讯都链到 '#'，点了没反应。
          var href = safeUrl(item.sourceUrl || item.url);
          var summary = cleanSummary(item.summary, title);
          var meta = [item.sourceName, item.date].filter(Boolean).join(' · ');

          html += '<div style="padding:14px 0;border-bottom:1px solid var(--line-soft);">'
            + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">'
            + (href
                ? '<a href="' + esc(href) + '" target="_blank" rel="noopener" style="font-size:15px;font-weight:500;color:var(--ink);text-decoration:none;line-height:1.4;flex:1;">' + esc(title) + '</a>'
                : '<span style="font-size:15px;font-weight:500;color:var(--ink);line-height:1.4;flex:1;">' + esc(title) + '</span>')
            + '<span style="font-size:12px;font-weight:600;color:var(--accent);white-space:nowrap;padding:2px 8px;background:var(--accent-soft);border-radius:999px;">' + (item.aiScore || '—') + '</span>'
            + '</div>'
            + (summary
                ? '<p style="font-size:13px;color:var(--muted);line-height:1.55;margin:6px 0 0;">' + esc(summary) + '</p>'
                : '')
            + (meta
                ? '<p style="font-size:12px;color:var(--muted);margin:6px 0 0;">' + esc(meta) + '</p>'
                : '')
            + '</div>';
        });
        newsContainer.innerHTML = html;
      })
      .catch(function() {
        newsContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">加载失败。</p>';
      });
  }

  // 只放行 http(s)，其它一律当没链接处理（数据是自动抓的，别把 javascript: 直接塞进 href）
  function safeUrl(u) {
    if (!u) return '';
    return /^https?:\/\//i.test(u) ? u : '';
  }

  // 部分 RSS 源（HN / Reddit / 9to5mac）的 summary 就是一段样板：
  // 「文章网址：… 评论网址：… 积分：」「由 /u/xxx 提交 [链接] [评论]」。
  // 采集脚本已经在源头清了，这里再兜一层，防止旧数据糊在首页上。
  function cleanSummary(raw, title) {
    var t = String(raw || '');
    t = t.replace(/(文章网址|评论网址|原文网址)\s*[:：]\s*\S+/g, ' ');
    t = t.replace(/(article|comments?)\s*url\s*[:：]\s*\S+/gi, ' ');
    t = t.replace(/积分\s*[:：]?\s*\d*/g, ' ');
    t = t.replace(/points\s*[:：]\s*\d+/gi, ' ');
    t = t.replace(/#\s*comments?\s*[:：]?\s*\d*/gi, ' ');
    t = t.replace(/由\s*\/u\/\S+\s*提交/g, ' ');
    t = t.replace(/submitted by\s*\/u\/\S+/gi, ' ');
    t = t.replace(/\[(链接|评论|link|comments?)\]/gi, ' ');
    t = t.replace(/https?:\/\/\S+/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    t = t.replace(/^[·•\-—、,，:：]+|[·•\-—、,，:：]+$/g, '').trim();
    // 清完只剩标题本身（或没剩什么）就别显示了，省得同一句话出现两遍
    if (!t || t === title || t.length < 8) return '';
    return t.length > 120 ? t.slice(0, 119) + '…' : t;
  }

  function esc(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
})();
