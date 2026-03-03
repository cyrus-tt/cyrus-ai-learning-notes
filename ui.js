(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function setupAmbientUI() {
    if (!document.body) {
      return;
    }

    if (!document.querySelector(".bg-aurora")) {
      const aurora = document.createElement("div");
      aurora.className = "bg-aurora";
      aurora.setAttribute("aria-hidden", "true");
      document.body.prepend(aurora);
    }

    if (!document.querySelector(".scroll-progress")) {
      const progress = document.createElement("div");
      progress.className = "scroll-progress";
      progress.setAttribute("aria-hidden", "true");

      const bar = document.createElement("div");
      bar.className = "scroll-progress__bar";
      progress.append(bar);

      document.body.prepend(progress);
    }

    if (desktopPointer && !reduceMotion && !document.querySelector(".cursor-glow")) {
      const glow = document.createElement("div");
      glow.className = "cursor-glow";
      glow.setAttribute("aria-hidden", "true");
      document.body.prepend(glow);
    }
  }

  function setupScrollProgress() {
    const bar = document.querySelector(".scroll-progress__bar");
    if (!bar) {
      return;
    }

    let rafId = 0;

    const update = () => {
      rafId = 0;
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop || 0;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max <= 4 ? 1 : Math.min(1, Math.max(0, scrollTop / max));
      bar.style.width = `${(progress * 100).toFixed(2)}%`;
    };

    const onScroll = () => {
      if (rafId) {
        return;
      }
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  function setupCursorGlow() {
    const glow = document.querySelector(".cursor-glow");
    if (!glow) {
      return;
    }

    const halfSize = 260;
    let rafId = 0;
    let targetX = -9999;
    let targetY = -9999;

    const render = () => {
      rafId = 0;
      glow.style.transform = `translate3d(${(targetX - halfSize).toFixed(1)}px, ${(targetY - halfSize).toFixed(1)}px, 0)`;
    };

    const onMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (rafId) {
        return;
      }
      rafId = requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener(
      "mouseleave",
      () => {
        glow.style.transform = "translate3d(-9999px, -9999px, 0)";
      },
      { passive: true }
    );
    window.addEventListener(
      "blur",
      () => {
        glow.style.transform = "translate3d(-9999px, -9999px, 0)";
      },
      { passive: true }
    );
  }

  function setupReveal() {
    const targets = Array.from(
      document.querySelectorAll(".hero, .entry-grid, .soft-panel, .filter-toolbar, .card-grid, .legal-panel, .site-footer")
    );

    targets.forEach((el, index) => {
      el.classList.add("reveal");
      el.style.setProperty("--reveal-delay", `${Math.min(index * 65, 380)}ms`);
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    targets.forEach((el) => observer.observe(el));
  }

  function setupHeaderState() {
    const header = document.querySelector(".site-header");
    if (!header) {
      return;
    }

    const onScroll = () => {
      header.classList.toggle("scrolled", window.scrollY > 16);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupCardTilt() {
    if (reduceMotion) {
      return;
    }

    const bindCardTilt = (card) => {
      if (card.dataset.tiltBound === "true") {
        return;
      }
      card.dataset.tiltBound = "true";

      let rafId = 0;

      const reset = () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--glow-x", "50%");
        card.style.setProperty("--glow-y", "50%");
      };

      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        if (rafId) {
          cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
          const rx = (px - 0.5) * 7;
          const ry = (0.5 - py) * 7;

          card.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
          card.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
          card.style.setProperty("--glow-x", `${(px * 100).toFixed(1)}%`);
          card.style.setProperty("--glow-y", `${(py * 100).toFixed(1)}%`);
        });
      });

      card.addEventListener("pointerleave", reset);
      card.addEventListener("pointercancel", reset);
    };

    const refreshTiltTargets = () => {
      document.querySelectorAll(".entry-card, .card").forEach(bindCardTilt);
    };

    refreshTiltTargets();
    window.addEventListener("cyrus:cards-rendered", refreshTiltTargets);
  }

  function setup() {
    setupAmbientUI();
    setupReveal();
    setupHeaderState();
    setupCardTilt();
    setupScrollProgress();
    setupCursorGlow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
