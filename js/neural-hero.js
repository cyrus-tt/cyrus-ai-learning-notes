/* ═══════════════════════════════════════════════════════════════
   neural-hero.js — p5.js neural network generative art hero
   Instance mode sketch, mounted on #hero-canvas
   ═══════════════════════════════════════════════════════════════ */

const neuralHero = (p) => {
  const ACCENT = [232, 69, 14]; // #e8450e
  const BG = [17, 17, 24];     // #111118 — subtle blue tint for dark-mode contrast
  const CONNECT_DIST = 150;
  const MOUSE_RADIUS = 120;
  const MAX_PULSES = 5;
  const DRIFT_SPEED = 0.3;

  let nodes = [];
  let pulses = [];
  let nodeCount;
  let reducedMotion = false;
  let staticDrawn = false;

  // ── Helpers ──

  function isMobile() {
    return p.windowWidth < 768;
  }

  function heroHeight() {
    return isMobile() ? 280 : 400;
  }

  // ── Node class ──

  class Node {
    constructor() {
      this.x = p.random(p.width);
      this.y = p.random(p.height);
      this.vx = p.random(-DRIFT_SPEED, DRIFT_SPEED);
      this.vy = p.random(-DRIFT_SPEED, DRIFT_SPEED);
      this.baseSize = p.random(2, 4);
      this.brightness = p.random(0.3, 0.7);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Wrap around edges
      if (this.x < -20) this.x = p.width + 20;
      if (this.x > p.width + 20) this.x = -20;
      if (this.y < -20) this.y = p.height + 20;
      if (this.y > p.height + 20) this.y = -20;

      // Mouse attraction
      let mx = p.mouseX;
      let my = p.mouseY;
      if (mx > 0 && mx < p.width && my > 0 && my < p.height) {
        let dx = mx - this.x;
        let dy = my - this.y;
        let dist = p.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 1) {
          this.x += dx * 0.003;
          this.y += dy * 0.003;
        }
      }
    }

    draw(highlight) {
      let alpha = this.brightness * 255;
      let size = this.baseSize;
      if (highlight) {
        alpha = 255;
        size = this.baseSize * 1.6;
      }
      p.noStroke();
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], alpha);
      p.ellipse(this.x, this.y, size, size);
    }
  }

  // ── Pulse class ──

  class Pulse {
    constructor(a, b) {
      this.a = a;
      this.b = b;
      this.t = 0;
      this.speed = p.random(0.008, 0.02);
      this.alive = true;
    }

    update() {
      this.t += this.speed;
      if (this.t >= 1) this.alive = false;
    }

    draw() {
      let x = p.lerp(this.a.x, this.b.x, this.t);
      let y = p.lerp(this.a.y, this.b.y, this.t);
      p.noStroke();
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 220);
      p.ellipse(x, y, 4, 4);
      // glow
      p.fill(ACCENT[0], ACCENT[1], ACCENT[2], 60);
      p.ellipse(x, y, 10, 10);
    }
  }

  // ── p5 lifecycle ──

  p.setup = () => {
    let container = p.canvas.parentElement;
    let w = container.offsetWidth;
    let h = heroHeight();
    p.createCanvas(w, h);
    p.frameRate(30);

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    nodeCount = isMobile() ? 30 : p.floor(p.random(50, 71));
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node());
    }
  };

  p.draw = () => {
    // Reduced motion: draw one static frame
    if (reducedMotion) {
      if (!staticDrawn) {
        drawFrame(false);
        staticDrawn = true;
      }
      return;
    }
    drawFrame(true);
  };

  function drawFrame(animated) {
    p.background(BG[0], BG[1], BG[2]);

    // Determine which nodes are near mouse
    let mx = p.mouseX;
    let my = p.mouseY;
    let mouseInCanvas = mx > 0 && mx < p.width && my > 0 && my < p.height;

    // Update nodes
    if (animated) {
      for (let node of nodes) {
        node.update();
      }
    }

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let dist = p.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          let alpha = p.map(dist, 0, CONNECT_DIST, 40, 0);

          // Brighten connections near mouse
          if (mouseInCanvas) {
            let midX = (nodes[i].x + nodes[j].x) / 2;
            let midY = (nodes[i].y + nodes[j].y) / 2;
            let mouseDist = p.dist(mx, my, midX, midY);
            if (mouseDist < MOUSE_RADIUS) {
              alpha = p.map(mouseDist, 0, MOUSE_RADIUS, 90, alpha);
            }
          }

          p.stroke(ACCENT[0], ACCENT[1], ACCENT[2], alpha);
          p.strokeWeight(0.8);
          p.line(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
        }
      }
    }

    // Draw nodes
    for (let node of nodes) {
      let highlight = false;
      if (mouseInCanvas) {
        let d = p.dist(mx, my, node.x, node.y);
        if (d < MOUSE_RADIUS) highlight = true;
      }
      node.draw(highlight);
    }

    // Pulses
    if (animated) {
      // Spawn new pulses
      if (pulses.length < MAX_PULSES && p.random() < 0.03) {
        let a = nodes[p.floor(p.random(nodes.length))];
        // Find a nearby node to pulse to
        let candidates = [];
        for (let node of nodes) {
          if (node === a) continue;
          let d = p.dist(a.x, a.y, node.x, node.y);
          if (d < CONNECT_DIST) candidates.push(node);
        }
        if (candidates.length > 0) {
          let b = candidates[p.floor(p.random(candidates.length))];
          pulses.push(new Pulse(a, b));
        }
      }

      // Update and draw pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].update();
        if (!pulses[i].alive) {
          pulses.splice(i, 1);
        } else {
          pulses[i].draw();
        }
      }
    }
  }

  p.windowResized = () => {
    let container = p.canvas.parentElement;
    let w = container.offsetWidth;
    let h = heroHeight();
    p.resizeCanvas(w, h);

    // Recalculate node count for responsive
    let targetCount = isMobile() ? 30 : p.floor(p.random(50, 71));
    if (targetCount < nodes.length) {
      nodes.length = targetCount;
    } else {
      while (nodes.length < targetCount) {
        nodes.push(new Node());
      }
    }

    // Re-draw static frame if reduced motion
    if (reducedMotion) {
      staticDrawn = false;
    }
  };
};

// Mount when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const target = document.getElementById('hero-canvas');
  if (target) {
    new p5(neuralHero, target);
  }
});
