/* ═══════════════════════════════════════════════════════════════
   home-animations.js — Animations for homepage
   Strategy: IntersectionObserver + CSS for scroll reveals (robust),
   GSAP only for hero entrance + counter (non-scroll-dependent).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Lenis smooth scroll ───────────────────────────────────────
  if (!prefersReduced && typeof Lenis !== "undefined") {
    var lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });

    // Drive Lenis from GSAP ticker (single RAF source) if available
    if (typeof gsap !== "undefined") {
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }

    // Pause when modals open
    document.addEventListener("cmdk-open", function () { lenis.stop(); });
    document.addEventListener("cmdk-close", function () { lenis.start(); });
  }

  // ── Typed.js hero effect ──────────────────────────────────────
  var typedEl = document.getElementById("typed-output");
  if (typedEl && typeof Typed !== "undefined") {
    new Typed("#typed-output", {
      strings: [
        "教程 → 从零到上线的完整步骤",
        "工具 → 浏览器里直接体验 AI",
        "资讯 → 每日全球 AI 动态",
        "复盘 → 每天学到什么、每周干了什么"
      ],
      typeSpeed: 40,
      backSpeed: 25,
      backDelay: 2000,
      loop: true,
      showCursor: true,
      cursorChar: "█"
    });
  }

  // ── Mouse tracking glow on hero ───────────────────────────────
  var hero = document.querySelector(".home-hero");
  var mouseGlow = document.querySelector(".home-hero-mouse-glow");
  if (hero && mouseGlow && !prefersReduced && window.innerWidth > 768) {
    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      mouseGlow.style.setProperty("--mx", (e.clientX - rect.left) + "px");
      mouseGlow.style.setProperty("--my", (e.clientY - rect.top) + "px");
    });
  }

  // ── GSAP hero entrance timeline ───────────────────────────────
  if (typeof gsap !== "undefined" && !prefersReduced) {
    var heroContent = document.querySelector(".home-hero-content");
    if (heroContent) {
      var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".home-hero-badge", { y: 20, opacity: 0, duration: 0.5 })
        .from(".home-hero-title", { y: 30, opacity: 0, duration: 0.6 }, "-=0.3")
        .from(".home-hero-subtitle", { y: 20, opacity: 0, duration: 0.5 }, "-=0.3")
        .from(".home-typed-wrap", { y: 15, opacity: 0, duration: 0.4 }, "-=0.2")
        .from(".home-hero-entries", { y: 20, opacity: 0, duration: 0.5 }, "-=0.2");
    }
  }

  // ── Scroll Reveal via IntersectionObserver + CSS ──────────────
  // Elements with [data-anim] get revealed when entering viewport.
  // CSS handles the transition via .is-visible class.
  if (!prefersReduced && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

    document.querySelectorAll("[data-anim]").forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // No observer or reduced motion: show everything immediately
    document.querySelectorAll("[data-anim]").forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  // ── Stats counter animation ───────────────────────────────────
  function animateCounters() {
    var counters = document.querySelectorAll("[data-count]");
    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute("data-count"), 10);
      if (isNaN(target)) return;
      var suffix = el.getAttribute("data-suffix") || "";

      if (prefersReduced) {
        el.textContent = formatNum(target) + suffix;
        return;
      }

      var duration = 2000;
      var startTime = null;
      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(eased * target);
        el.textContent = formatNum(current) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function formatNum(n) {
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "W+";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K+";
    return n.toString();
  }

  // Trigger counter when stats section enters viewport
  var statsSection = document.querySelector(".home-stats");
  if (statsSection) {
    if (!prefersReduced && "IntersectionObserver" in window) {
      var statsObs = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          animateCounters();
          statsObs.disconnect();
        }
      }, { threshold: 0.3 });
      statsObs.observe(statsSection);
    } else {
      animateCounters();
    }
  }

})();
