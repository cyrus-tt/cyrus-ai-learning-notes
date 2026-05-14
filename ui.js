(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Theme
  const savedTheme = localStorage.getItem("cy_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cy_theme", next);
  }

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // Sticky nav shadow on scroll
  const nav = document.querySelector(".site-nav");
  if (nav) {
    let ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          nav.classList.toggle("scrolled", window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Terminal typing animation
  const termScript = [
    { t: "prompt", user: "cyrus", host: "xhs", path: "~", cmd: "whoami" },
    { t: "out", text: "Cyrus — AI 炼金术士" },
    { t: "prompt", user: "cyrus", host: "xhs", path: "~", cmd: "cat bio.txt" },
    { t: "out", text: "hi，我是 Cyrus 宇。" },
    { t: "out", text: "一个对 AI 好奇、热爱的朋友。" },
    { t: "out", text: "欢迎一起学习，抓住 AI 时代红利。" },
    { t: "prompt", user: "cyrus", host: "xhs", path: "~", cmd: "ls ./notes" },
    { t: "out-html", text: '<span class="jn-term-dim">drwxr-xr-x</span>  <span class="jn-term-str">ai_news/</span>       <span class="jn-term-dim">1,284 条</span>' },
    { t: "out-html", text: '<span class="jn-term-dim">drwxr-xr-x</span>  <span class="jn-term-str">ai_resources/</span>  <span class="jn-term-dim">47 条</span>' },
    { t: "prompt", user: "cyrus", host: "xhs", path: "~", cmd: "./start.sh" },
    { t: "out-html", text: '<span class="jn-term-ok">✓</span> 先看资讯，再拿干货执行。' },
  ];

  let termTimer = null;
  function startTerminal() {
    const host = document.getElementById("termOutput");
    if (!host || reduceMotion) return;
    if (termTimer) clearTimeout(termTimer);
    host.innerHTML = "";

    let i = 0;
    function step() {
      if (i >= termScript.length) {
        const lines = host.querySelectorAll(".jn-term-line");
        if (lines.length) {
          const last = lines[lines.length - 1];
          if (!last.querySelector(".cursor")) {
            last.insertAdjacentHTML("beforeend", '<span class="cursor"></span>');
          }
        }
        return;
      }
      const ev = termScript[i++];
      const line = document.createElement("span");
      line.className = "jn-term-line";
      if (ev.t === "prompt") {
        line.innerHTML = `<span class="jn-term-user">${ev.user}@${ev.host}</span><span class="jn-term-dim">:${ev.path}</span><span class="jn-term-prompt">$</span> ${ev.cmd}`;
      } else if (ev.t === "out") {
        line.innerHTML = `<span>${ev.text}</span>`;
      } else if (ev.t === "out-html") {
        line.innerHTML = ev.text;
      }
      host.appendChild(line);
      host.scrollTop = host.scrollHeight;
      const delay = ev.t === "prompt" ? 700 : 420;
      termTimer = setTimeout(step, delay);
    }
    step();
  }

  // Start terminal on index page
  if (document.getElementById("termOutput")) {
    startTerminal();
  }

  // Scroll-reveal observer
  if (!reduceMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(
      ".fade-up, .mg-entry, .mg-disp, .digest-card, .card-grid, " +
      ".content, .about-project-card, .about-timeline li, .about-quote, " +
      ".consulting-card, .mg-page-hero, .filter-toolbar"
    ).forEach(function (el) {
      el.classList.add("reveal");
      observer.observe(el);
    });

    window.addEventListener("cyrus:cards-rendered", function () {
      document.querySelectorAll(".card-animate").forEach(function (el) {
        observer.observe(el);
      });
    });
  }
})();
