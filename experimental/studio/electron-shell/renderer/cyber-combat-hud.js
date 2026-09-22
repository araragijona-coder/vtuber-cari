// Experimental local Canvas HUD for scene/overlay use.
// It is intentionally independent from capture, FFmpeg and game telemetry.
// A caller may provide { player_hp, enemy_hp } through setGameState().
export class CyberCombatCanvas {
  constructor(canvasId, options = {}) {
    this.canvas = typeof canvasId === "string"
      ? document.getElementById(canvasId)
      : canvasId;
    if (!this.canvas) {
      this.ctx = null;
      this.enabled = false;
      return;
    }

    this.ctx = this.canvas.getContext("2d", { alpha: true });
    this.enabled = Boolean(this.ctx);
    this.heightCss = Math.max(80, Number(options.heightCss) || 300);
    this.maxParticles = Math.max(0, Number(options.maxParticles) || 30);
    this.particles = [];
    this.state = {
      player_hp: 100,
      enemy_hp: 100
    };
    this.lastCssWidth = 0;
    this.destroyed = false;

    this.onResize = () => this.resize();
    window.addEventListener("resize", this.onResize, { passive: true });
    this.resize();
  }

  resize() {
    if (!this.enabled || this.destroyed) return;

    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width || window.innerWidth));
    const cssHeight = this.heightCss;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    this.lastCssWidth = cssWidth;
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);

    // setTransform replaces the previous transform instead of accumulating
    // scale() calls after every window resize.
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setGameState(nextState = {}) {
    this.state = {
      ...this.state,
      player_hp: clampPercent(nextState.player_hp ?? this.state.player_hp),
      enemy_hp: clampPercent(nextState.enemy_hp ?? this.state.enemy_hp)
    };
  }

  spawnSparks() {
    while (this.particles.length < this.maxParticles) {
      this.particles.push({
        x: this.lastCssWidth * Math.random(),
        y: this.heightCss * Math.random(),
        speed: Math.random() * 8 + 4,
        size: Math.random() * 2 + 1,
        hue: Math.random() > 0.5 ? "violet" : "red"
      });
    }
  }

  render(gameState = this.state) {
    if (!this.enabled || this.destroyed) return;

    this.setGameState(gameState);
    const width = this.lastCssWidth || Math.max(1, this.canvas.clientWidth);
    const height = this.heightCss;

    this.ctx.clearRect(0, 0, width, height);

    this.ctx.fillStyle = "rgba(10, 10, 15, 0.92)";
    this.ctx.fillRect(0, 0, width, height);

    this.spawnSparks();
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.x -= particle.speed;

      if (particle.x < -particle.size * 10) {
        this.particles.splice(index, 1);
        continue;
      }

      this.ctx.fillStyle = particle.hue === "violet" ? "#8b00ff" : "#ff1a1a";
      this.ctx.fillRect(
        particle.x,
        particle.y,
        particle.size * 10,
        particle.size
      );
    }

    this.drawHUDBox(
      20,
      20,
      140,
      80,
      "#8b00ff",
      "PLAYER",
      this.state.player_hp
    );

    this.drawHUDBox(
      Math.max(180, width - 160),
      20,
      140,
      80,
      "#ff1a1a",
      "ENEMY",
      this.state.enemy_hp
    );
  }

  drawHUDBox(x, y, w, h, borderColor, title, hp) {
    this.ctx.fillStyle = "rgba(15, 15, 25, 0.80)";
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x + 10, y);
    this.ctx.lineTo(x + w, y);
    this.ctx.lineTo(x + w, y + h - 10);
    this.ctx.lineTo(x + w - 10, y + h);
    this.ctx.lineTo(x, y + h);
    this.ctx.lineTo(x, y + 10);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "10px monospace";
    this.ctx.fillText(title, x + 12, y + 20);

    this.ctx.fillStyle = "#330000";
    this.ctx.fillRect(x + 12, y + 35, w - 24, 10);

    this.ctx.fillStyle = borderColor;
    this.ctx.fillRect(
      x + 12,
      y + 35,
      (w - 24) * (clampPercent(hp) / 100),
      10
    );
  }

  destroy() {
    if (this.destroyed) return;
    window.removeEventListener("resize", this.onResize);
    this.destroyed = true;
    this.particles.length = 0;
    this.ctx = null;
  }
}

function clampPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
}
