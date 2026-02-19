(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    setupReveal();
    setupHeaderState();
    setupCardTilt();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
