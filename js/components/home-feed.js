(function() {
  // Load latest 3 TIL entries
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
        var html = '<ul class="post-list">';
        entries.slice(0, 3).forEach(function(e) {
          html += '<li><a href="/til/#' + esc(e.id || '') + '">'
            + '<span class="post-title">' + esc(e.title || '') + '</span>'
            + '<span class="post-date">' + esc(e.date || '') + '</span>'
            + '</a></li>';
        });
        html += '</ul>';
        tilContainer.innerHTML = html;
      })
      .catch(function() {
        tilContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">加载失败。</p>';
      });
  }

  // Load latest weekly digest
  var weeklyContainer = document.getElementById("weekly-latest");
  if (weeklyContainer) {
    fetch("/weekly/index.json")
      .then(function(r) { return r.json(); })
      .then(function(issues) {
        if (!Array.isArray(issues) || !issues.length) {
          weeklyContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">暂无周报。</p>';
          return;
        }
        issues.sort(function(a, b) { return (b.week || "").localeCompare(a.week || ""); });
        var html = '<ul class="post-list">';
        issues.slice(0, 2).forEach(function(issue) {
          html += '<li><a href="/weekly/' + esc(issue.file || '') + '">'
            + '<span class="post-title">Cyrus Weekly ' + esc(issue.week || '') + '</span>'
            + '<span class="post-date">' + esc(issue.dateRange || '') + '</span>'
            + '</a></li>';
        });
        html += '</ul>';
        weeklyContainer.innerHTML = html;
      })
      .catch(function() {
        weeklyContainer.innerHTML = '<p style="color:var(--muted);font-size:14px;">加载失败。</p>';
      });
  }

  function esc(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
})();
