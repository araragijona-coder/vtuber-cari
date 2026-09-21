const TYPES = Object.freeze({
  capybara: Object.freeze({ body: "#a8784f", belly: "#d9b58f", accent: "#6d4a32" }),
  cariMini: Object.freeze({ body: "#d8a98e", hair: "#5b392b", glasses: "#2a2a30" })
});

export class ChibiWorldController {
  constructor(canvas, {
    width = 960,
    height = 280,
    count = 3,
    seed = 17
  } = {}) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext("2d") || null;
    this.width = Math.max(320, Number(width) || 960);
    this.height = Math.max(140, Number(height) || 280);
    this.seed = Number(seed) || 17;
    this.units = [];
    this.running = false;
    this.raf = 0;
    this.lastTime = 0;
    this.focusX = 0.5;
    this.focusY = 0.55;

    for (let i = 0; i < Math.max(0, Math.min(8, Number(count) || 0)); i++) {
      this.add(i % 2 === 0 ? "capybara" : "cariMini", i);
    }
    this.resize();
  }

  add(type = "capybara", index = this.units.length) {
    const kind = TYPES[type] ? type : "capybara";
    const r = this.#rng(index + 1);
    const angle = r * Math.PI * 2;
    const radius = 0.22 + r * 0.22;
    this.units.push({
      id: kind + "-" + Date.now() + "-" + index,
      type: kind,
      x: this.focusX + Math.cos(angle) * radius,
      y: this.focusY + Math.sin(angle) * radius * 0.62,
      speed: 0.016 + r * 0.018,
      phase: r * Math.PI * 2,
      direction: r > 0.5 ? 1 : -1,
      scale: 0.72 + r * 0.28
    });
    return this.units[this.units.length - 1];
  }

  clear() {
    this.units.length = 0;
  }

  setCount(count) {
    const desired = Math.max(0, Math.min(8, Number(count) || 0));
    while (this.units.length < desired) this.add(this.units.length % 2 ? "cariMini" : "capybara", this.units.length);
    this.units.length = desired;
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, Math.round(rect.width || 960));
    this.height = Math.max(140, Math.round(rect.height || 280));
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running || !this.ctx) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.#tick);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  #tick = now => {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.#update(dt, now / 1000);
    this.#draw(now / 1000);
    this.raf = requestAnimationFrame(this.#tick);
  };

  #update(dt, t) {
    for (const unit of this.units) {
      const dx = unit.x - this.focusX;
      const dy = (unit.y - this.focusY) / 0.62;
      const distance = Math.hypot(dx, dy);
      if (distance > 0.46) unit.direction *= -1;

      const tangentX = -dy / Math.max(0.001, distance);
      const tangentY = dx / Math.max(0.001, distance);
      const drift = Math.sin(t * 0.45 + unit.phase) * 0.14;
      unit.x += (tangentX * unit.speed + drift * 0.002) * unit.direction * dt * 60;
      unit.y += (tangentY * unit.speed * 0.62) * unit.direction * dt * 60;

      unit.x = Math.max(0.08, Math.min(0.92, unit.x));
      unit.y = Math.max(0.16, Math.min(0.88, unit.y));
    }
  }

  #draw(t) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, "#101725");
    gradient.addColorStop(1, "#182235");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#1f6c4f";
    ctx.fillRect(0, this.height * 0.64, this.width, this.height * 0.36);

    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = (this.width / 8) * i;
      ctx.beginPath(); ctx.moveTo(x, this.height * 0.64); ctx.lineTo(x - 40, this.height); ctx.stroke();
    }

    this.#drawCariMarker();

    for (const unit of this.units) {
      const x = unit.x * this.width;
      const y = unit.y * this.height;
      this.#drawUnit(unit, x, y, unit.scale, t);
    }

    ctx.fillStyle = "rgba(7,10,15,.72)";
    ctx.fillRect(10, 10, 235, 26);
    ctx.fillStyle = "#eef2f7";
    ctx.font = "12px sans-serif";
    ctx.fillText("Chibis locales · sin IA · movimiento determinista", 18, 28);
  }

  #drawCariMarker() {
    const ctx = this.ctx;
    const x = this.focusX * this.width;
    const y = this.focusY * this.height;

    ctx.fillStyle = "#d7a488";
    ctx.beginPath();
    ctx.arc(x, y - 20, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5b392b";
    ctx.beginPath();
    ctx.arc(x, y - 28, 19, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2a2a30";
    ctx.strokeRect(x - 14, y - 21, 11, 7);
    ctx.strokeRect(x + 3, y - 21, 11, 7);

    ctx.fillStyle = "#dfe7ef";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Cari", x, y + 22);
    ctx.textAlign = "left";
  }

  #drawUnit(unit, x, y, scale, t) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 4 + unit.phase) * 2);
    ctx.scale(scale, scale);

    if (unit.type === "capybara") {
      const palette = TYPES.capybara;
      ctx.fillStyle = "rgba(0,0,0,.16)";
      ctx.beginPath();
      ctx.ellipse(0, 18, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.body;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.belly;
      ctx.beginPath();
      ctx.ellipse(6, 3, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.body;
      ctx.beginPath();
      ctx.arc(22, -8, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.accent;
      ctx.beginPath();
      ctx.arc(27, -8, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1d1714";
      ctx.beginPath();
      ctx.arc(23, -11, 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(30, -11, 1.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const palette = TYPES.cariMini;
      ctx.fillStyle = "rgba(0,0,0,.16)";
      ctx.beginPath();
      ctx.ellipse(0, 17, 17, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3e6b7c";
      ctx.fillRect(-13, -2, 26, 21);

      ctx.fillStyle = palette.body;
      ctx.beginPath();
      ctx.arc(0, -12, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.hair;
      ctx.beginPath();
      ctx.arc(0, -18, 14, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = palette.glasses;
      ctx.strokeRect(-10, -15, 8, 6);
      ctx.strokeRect(2, -15, 8, 6);
      ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(2, -12); ctx.stroke();

      ctx.strokeStyle = "#3d2830";
      ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(0, -3); ctx.lineTo(4, -5); ctx.stroke();
    }

    ctx.restore();
  }

  #rng(index) {
    let value = (this.seed + index * 101) % 9973;
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  }
}
