/**
 * Lightweight combat canvas renderer for Telegram Mini Apps.
 *
 * Asset policy:
 * - Only manifest entries with status === "verified" are eligible.
 * - Candidate/catalog-only entries are never loaded automatically.
 * - The renderer uses one animation loop, cached ImageBitmap objects and
 *   optional OffscreenCanvas background caching to keep the hot path small.
 *
 * Expected manifest shape:
 * webapp/assets/scavenged_art/ASSET_MANIFEST.json
 */

const PALETTE = Object.freeze({
  violet: "#8b00ff",
  fire: "#ff1a1a",
  ink: "#070711",
  panel: "#0d0b18",
  text: "#f4efff"
});

const VERIFIED_STATUSES = new Set(["verified", "validated", "imported-verified"]);

export class CombatCanvasRenderer {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("CombatCanvasRenderer requires an HTMLCanvasElement");
    }

    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) throw new Error("2D canvas context is unavailable");

    this.canvas = canvas;
    this.ctx = ctx;
    this.palette = { ...PALETTE, ...(options.palette || {}) };
    this.dpr = 1;
    this.width = 1;
    this.height = 1;
    this.running = false;
    this.raf = 0;
    this.lastFrame = 0;
    this.frameInterval = 1000 / Math.max(15, Math.min(60, options.fps || 30));
    this.assets = new Map();
    this.manifest = null;
    this.background = null;
    this.backgroundSource = null;
    this.hudDirty = true;
    this.state = {
      player: null,
      enemy: null,
      background: null,
      status: "READY"
    };

    this.resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => this.resize());

    this.resizeObserver?.observe(canvas);
    this.resize();
  }

  destroy() {
    this.stop();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.assets.clear();
    this.background = null;
    this.backgroundSource = null;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || this.canvas.width || 1));
    const height = Math.max(1, Math.round(rect.height || this.canvas.height || 1));
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    const pixelWidth = Math.round(width * this.dpr);
    const pixelHeight = Math.round(height * this.dpr);

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.background = null;
    }

    this.width = width;
    this.height = height;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.hudDirty = true;
  }

  async loadManifest(manifestOrUrl) {
    const manifest =
      typeof manifestOrUrl === "string"
        ? await fetch(manifestOrUrl, { cache: "force-cache" }).then((r) => {
            if (!r.ok) throw new Error(`Manifest HTTP ${r.status}`);
            return r.json();
          })
        : manifestOrUrl;

    if (!manifest || manifest.policy !== "license-verified-only") {
      throw new Error("Asset manifest does not satisfy license-verified-only policy");
    }

    this.manifest = manifest;
    return manifest;
  }

  /**
   * Only physically imported/verified files can enter the runtime.
   * Candidate URLs are deliberately ignored.
   */
  eligibleAssets(bucket) {
    const candidates = Array.isArray(this.manifest?.candidates)
      ? this.manifest.candidates
      : [];

    return candidates.filter(
      (asset) =>
        (!bucket || asset.bucket === bucket) &&
        VERIFIED_STATUSES.has(asset.status) &&
        typeof asset.local_path === "string" &&
        asset.local_path.length > 0
    );
  }

  async loadVerifiedAsset(asset) {
    if (!asset || !VERIFIED_STATUSES.has(asset.status) || !asset.local_path) {
      throw new Error("Refused non-verified asset");
    }

    const key = asset.local_path;
    if (this.assets.has(key)) return this.assets.get(key);

    const response = await fetch(key, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Asset HTTP ${response.status}: ${key}`);

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    this.assets.set(key, bitmap);
    return bitmap;
  }

  async setBackground(asset) {
    const bitmap = await this.loadVerifiedAsset(asset);
    this.background = bitmap;
    this.backgroundSource = asset.local_path;
    this.hudDirty = true;
  }

  setState(next = {}) {
    this.state = { ...this.state, ...next };
    this.hudDirty = true;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame((time) => this.frame(time));
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  frame(timestamp) {
    if (!this.running) return;

    if (
      timestamp - this.lastFrame >= this.frameInterval ||
      this.lastFrame === 0
    ) {
      this.lastFrame = timestamp;
      this.render();
    }

    this.raf = requestAnimationFrame((time) => this.frame(time));
  }

  render() {
    this.resize();

    const ctx = this.ctx;
    const { width, height } = this;

    ctx.clearRect(0, 0, width, height);
    this.drawBackground();
    this.drawArenaGrid();
    this.drawCharacterCard(this.state.player, 16, 16, width * 0.34, height - 32, "violet");
    this.drawCharacterCard(
      this.state.enemy,
      width - width * 0.34 - 16,
      16,
      width * 0.34,
      height - 32,
      "fire"
    );
    this.drawHud();
  }

  drawBackground() {
    const ctx = this.ctx;
    const { width, height } = this;

    ctx.fillStyle = this.palette.ink;
    ctx.fillRect(0, 0, width, height);

    if (!this.background) return;

    const sourceAspect = this.background.width / Math.max(1, this.background.height);
    const targetAspect = width / Math.max(1, height);
    let sx = 0;
    let sy = 0;
    let sw = this.background.width;
    let sh = this.background.height;

    if (sourceAspect > targetAspect) {
      sw = this.background.height * targetAspect;
      sx = (this.background.width - sw) * 0.5;
    } else {
      sh = this.background.width / targetAspect;
      sy = (this.background.height - sh) * 0.5;
    }

    ctx.globalAlpha = 0.74;
    ctx.drawImage(this.background, sx, sy, sw, sh, 0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  drawArenaGrid() {
    const ctx = this.ctx;
    const { width, height } = this;

    ctx.save();
    ctx.strokeStyle = "rgba(139, 0, 255, 0.10)";
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawCharacterCard(character, x, y, width, height, accent) {
    const ctx = this.ctx;
    const color = accent === "fire" ? this.palette.fire : this.palette.violet;

    ctx.save();
    this.cutPanelPath(x, y, width, height, 14);
    ctx.fillStyle = "rgba(13, 11, 24, 0.88)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const innerX = x + 10;
    const innerY = y + 10;
    const innerW = width - 20;
    const innerH = height - 52;

    if (character?.image) {
      this.drawCover(character.image, innerX, innerY, innerW, innerH);
    } else {
      this.drawPlaceholder(innerX, innerY, innerW, innerH, color);
    }

    ctx.fillStyle = this.palette.text;
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(
      this.fitText(character?.name || "EMPTY", innerW - 12),
      innerX + 6,
      y + height - 25
    );

    ctx.restore();
  }

  drawPlaceholder(x, y, width, height, color) {
    const ctx = this.ctx;
    const cx = x + width * 0.5;
    const cy = y + height * 0.4;
    const radius = Math.min(width, height) * 0.13;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - radius * 1.8, cy + radius * 2.4);
    ctx.quadraticCurveTo(cx, cy + radius * 0.8, cx + radius * 1.8, cy + radius * 2.4);
    ctx.stroke();

    ctx.restore();
  }

  drawHud() {
    const ctx = this.ctx;
    const { width } = this;

    ctx.save();
    ctx.fillStyle = "rgba(7, 7, 17, 0.82)";
    ctx.fillRect(0, this.height - 28, width, 28);

    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.palette.violet;
    ctx.fillText("CARI COMBAT", 10, this.height - 14);

    ctx.fillStyle = this.palette.fire;
    ctx.fillText(this.state.status || "READY", width - 82, this.height - 14);
    ctx.restore();
  }

  drawCover(image, x, y, width, height) {
    const sourceAspect = image.width / Math.max(1, image.height);
    const targetAspect = width / Math.max(1, height);

    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;

    if (sourceAspect > targetAspect) {
      sw = image.height * targetAspect;
      sx = (image.width - sw) * 0.5;
    } else {
      sh = image.width / targetAspect;
      sy = (image.height - sh) * 0.5;
    }

    this.ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  cutPanelPath(x, y, width, height, cut) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + cut, y);
    ctx.lineTo(x + width - cut, y);
    ctx.lineTo(x + width, y + cut);
    ctx.lineTo(x + width, y + height - cut);
    ctx.lineTo(x + width - cut, y + height);
    ctx.lineTo(x + cut, y + height);
    ctx.lineTo(x, y + height - cut);
    ctx.lineTo(x, y + cut);
    ctx.closePath();
  }

  fitText(text, maxWidth) {
    let value = String(text);
    while (value.length > 1 && this.ctx.measureText(value + "…").width > maxWidth) {
      value = value.slice(0, -1);
    }
    return value.length < String(text).length ? value + "…" : value;
  }
}

export default CombatCanvasRenderer;
