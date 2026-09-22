/**
 * Scavenged mechanic: capped delta-time arcade loop.
 * Conceptual provenance: dependency-free Canvas shooters using requestAnimationFrame.
 */
export class ArcadeLoop {
  constructor({ update, render, now = performance.now.bind(performance) }) {
    this.update = update; this.render = render; this.now = now;
    this.running = false; this.last = 0; this.raf = 0;
  }

  start() {
    if (this.running) return;
    this.running = true; this.last = this.now();
    const frame = timestamp => {
      if (!this.running) return;
      const dt = Math.min(0.05, Math.max(0, (timestamp - this.last) / 1000));
      this.last = timestamp; this.update(dt); this.render(dt);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
