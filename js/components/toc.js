(function () {
  "use strict";

  var article = document.querySelector("article, .article-body, .field-note-body");
  var target = document.getElementById("tocWidget");
  if (!article || !target) return;

  var headings = article.querySelectorAll("h2");
  if (headings.length < 3) { target.style.display = "none"; return; }

  headings.forEach(function (h, i) {
    if (!h.id) h.id = "section-" + i;
  });

  var html = '<nav class="toc-nav" aria-label="目录"><div class="toc-title">目录</div><ul>';
  headings.forEach(function (h) {
    html += '<li><a href="#' + h.id + '" class="toc-link">' + h.textContent + '</a></li>';
  });
  html += "</ul></nav>";
  target.innerHTML = html;

  var links = target.querySelectorAll(".toc-link");

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        links.forEach(function (l) { l.classList.remove("active"); });
        var active = target.querySelector('a[href="#' + entry.target.id + '"]');
        if (active) active.classList.add("active");
      }
    });
  }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });

  headings.forEach(function (h) { observer.observe(h); });
})();
