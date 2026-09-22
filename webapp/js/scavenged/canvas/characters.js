/**
 * Lightweight Canvas character/avatar renderer.
 *
 * Attempts external avatar/icon URLs first. When an asset fails to load,
 * the renderer falls back to deterministic vector silhouettes/icons.
 *
 * No framework dependency; intended for webapp scavenged canvas modules.
 */

export class CharacterRenderer {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("CharacterRenderer requires an HTMLCanvasElement");
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("2D canvas context is unavailable");
    }

    this.colors = {
      violet: options.violet || "#9b5cff",
      violetGlow: options.violetGlow || "rgba(155, 92, 255, 0.38)",
      fire: options.fire || "#ff3b30",
      fireGlow: options.fireGlow || "rgba(255, 59, 48, 0.34)",
      ink: options.ink || "#070711",
      panel: options.panel || "#0d0b18",
      grid: options.grid || "rgba(155, 92, 255, 0.10)",
      text: options.text || "#f4efff"
    };

    this.assets = new Map();
    this.devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    this.resizeObserver = null;

    this.syncSize();

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.syncSize());
      this.resizeObserver.observe(canvas);
    }
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.assets.clear();
  }

  syncSize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(rect.width || this.canvas.width || 1));
    const cssHeight = Math.max(1, Math.round(rect.height || this.canvas.height || 1));
    const width = Math.max(1, Math.round(cssWidth * this.devicePixelRatio));
    const height = Math.max(1, Math.round(cssHeight * this.devicePixelRatio));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);
    this.width = cssWidth;
    this.height = cssHeight;
  }

  /**
   * Load and cache one remote asset.
   *
   * A failed network/CORS/decoding load resolves to null. The caller then
   * renders a local vector fallback instead of leaving an empty card.
   */
  async loadAsset(key, url) {
    if (!url) return null;
    if (this.assets.has(key)) return this.assets.get(key);

    const image = new Image();
    image.decoding = "async";
    image.loading = "eager";
    image.referrerPolicy = "no-referrer";

    const promise = new Promise((resolve) => {
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
    });

    image.src = url;
    const asset = await promise;
    this.assets.set(key, asset);
    return asset;
  }

  /**
   * Render one character card. External URLs are optional.
   */
  async renderCharacter({
    id = "character",
    name = "UNKNOWN",
    avatarUrl = "",
    iconUrl = "",
    accent = "violet",
    x = 0,
    y = 0,
    width = this.width,
    height = this.height,
    silhouette = "humanoid"
  } = {}) {
    this.syncSize();

    const image = await this.loadAsset("avatar:" + id, avatarUrl);
    const icon = await this.loadAsset("icon:" + id, iconUrl);
    const accentColor = accent === "fire" ? this.colors.fire : this.colors.violet;

    this.drawCyberpunkCard(x, y, width, height, accentColor);
    this.drawBackdrop(x, y, width, height);

    if (image) {
      this.drawImageCover(image, x + 12, y + 12, width - 24, height - 54, 10);
    } else {
      this.drawSilhouette(
        x + 12,
        y + 12,
        width - 24,
        height - 54,
        silhouette,
        accentColor
      );
    }

    if (icon) {
      this.drawImageContain(icon, x + width - 42, y + height - 38, 24, 24);
    } else {
      this.drawVectorIcon(x + width - 42, y + height - 38, 24, accentColor);
    }

    this.drawLabel(name, x + 12, y + height - 27, width - 62, accentColor);
  }

  clear() {
    this.syncSize();
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawCyberpunkCard(x, y, width, height, accentColor = this.colors.violet) {
    const ctx = this.ctx;
    const cut = Math.min(16, Math.max(8, Math.round(Math.min(width, height) * 0.07)));

    ctx.save();
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

    ctx.fillStyle = this.colors.panel;
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor =
      accentColor === this.colors.fire ? this.colors.fireGlow : this.colors.violetGlow;
    ctx.shadowBlur = 10;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.colors.fire;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    this.strokeSegment(ctx, x, y + cut, x + 28, y + cut);
    this.strokeSegment(
      ctx,
      x + width - 28,
      y + height - cut,
      x + width,
      y + height - cut
    );

    ctx.restore();
  }

  drawBackdrop(x, y, width, height) {
    const ctx = this.ctx;
    ctx.save();

    ctx.beginPath();
    ctx.rect(x + 1, y + 1, width - 2, height - 2);
    ctx.clip();

    ctx.fillStyle = this.colors.ink;
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;

    for (let gx = x + 8; gx < x + width; gx += 16) {
      this.strokeSegment(ctx, gx, y, gx, y + height);
    }

    for (let gy = y + 8; gy < y + height; gy += 16) {
      this.strokeSegment(ctx, x, gy, x + width, gy);
    }

    const glow = ctx.createRadialGradient(
      x + width * 0.5,
      y + height * 0.34,
      4,
      x + width * 0.5,
      y + height * 0.34,
      Math.max(width, height) * 0.7
    );
    glow.addColorStop(0, this.colors.violetGlow);
    glow.addColorStop(0.45, "rgba(155, 92, 255, 0.07)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  drawImageCover(image, x, y, width, height, radius = 8) {
    const ctx = this.ctx;
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

    ctx.save();
    this.roundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
    ctx.restore();
  }

  drawImageContain(image, x, y, width, height) {
    const scale = Math.min(
      width / Math.max(1, image.width),
      height / Math.max(1, image.height)
    );
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (width - drawWidth) * 0.5;
    const drawY = y + (height - drawHeight) * 0.5;
    this.ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  drawSilhouette(x, y, width, height, kind = "humanoid", accentColor) {
    const ctx = this.ctx;
    const cx = x + width * 0.5;
    const top = y + height * 0.1;
    const headRadius = Math.min(width, height) * 0.16;

    ctx.save();
    ctx.beginPath();

    if (kind === "mascot") {
      this.polygon(ctx, [
        [cx - headRadius * 1.15, top + headRadius * 1.8],
        [cx - headRadius * 0.85, top + headRadius * 0.35],
        [cx - headRadius * 0.25, top],
        [cx + headRadius * 0.25, top],
        [cx + headRadius * 0.85, top + headRadius * 0.35],
        [cx + headRadius * 1.15, top + headRadius * 1.8],
        [cx + headRadius * 0.9, top + headRadius * 2.4],
        [cx - headRadius * 0.9, top + headRadius * 2.4]
      ]);
    } else if (kind === "robot") {
      const headW = headRadius * 2.2;
      const headH = headRadius * 1.7;
      this.polygon(ctx, [
        [cx - headW, top],
        [cx + headW, top],
        [cx + headW * 0.88, top + headH],
        [cx + headW * 0.48, top + headH * 1.18],
        [cx - headW * 0.48, top + headH * 1.18],
        [cx - headW * 0.88, top + headH]
      ]);
    } else {
      ctx.arc(cx, top + headRadius, headRadius, 0, Math.PI * 2);
    }

    ctx.fillStyle = this.colors.ink;
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.shadowColor =
      accentColor === this.colors.fire ? this.colors.fireGlow : this.colors.violetGlow;
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Angular hair/ears accent.
    ctx.beginPath();
    this.polygon(ctx, [
      [cx - headRadius * 0.85, top + headRadius * 2.0],
      [cx - headRadius * 1.45, top + headRadius * 2.45],
      [cx - headRadius * 1.05, top + headRadius * 1.7],
      [cx - headRadius * 0.3, top + headRadius * 1.9],
      [cx, top + headRadius * 1.5],
      [cx + headRadius * 0.3, top + headRadius * 1.9],
      [cx + headRadius * 1.05, top + headRadius * 1.7],
      [cx + headRadius * 1.45, top + headRadius * 2.45],
      [cx + headRadius * 0.85, top + headRadius * 2.0]
    ]);
    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.92;
    ctx.fill();

    ctx.beginPath();
    const shoulderY = y + height * 0.58;
    const shoulderW = width * 0.33;
    this.polygon(ctx, [
      [cx - shoulderW, y + height],
      [cx - shoulderW * 0.75, shoulderY],
      [cx, shoulderY - height * 0.04],
      [cx + shoulderW * 0.75, shoulderY],
      [cx + shoulderW, y + height]
    ]);
    ctx.fillStyle = this.colors.violet;
    ctx.globalAlpha = 0.8;
    ctx.fill();

    ctx.restore();
  }

  drawVectorIcon(x, y, size, accentColor = this.colors.fire) {
    const ctx = this.ctx;
    const cx = x + size * 0.5;
    const cy = y + size * 0.5;
    const r = size * 0.34;

    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.8;
    ctx.shadowColor =
      accentColor === this.colors.fire ? this.colors.fireGlow : this.colors.violetGlow;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    this.polygon(ctx, [
      [cx, cy - r],
      [cx + r * 0.82, cy - r * 0.45],
      [cx + r * 0.82, cy + r * 0.45],
      [cx, cy + r],
      [cx - r * 0.82, cy + r * 0.45],
      [cx - r * 0.82, cy - r * 0.45]
    ]);
    ctx.stroke();

    ctx.beginPath();
    this.strokeSegment(ctx, cx - r * 0.48, cy, cx + r * 0.48, cy);
    this.strokeSegment(ctx, cx, cy - r * 0.48, cx, cy + r * 0.48);
    ctx.restore();
  }

  drawLabel(text, x, y, maxWidth, accentColor) {
    const ctx = this.ctx;
    ctx.save();

    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.colors.text;

    const label = this.fitText(String(text), maxWidth);
    ctx.fillText(label, x, y);

    ctx.strokeStyle = accentColor;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1;
    this.strokeSegment(ctx, x, y + 11, x + Math.min(maxWidth, 42), y + 11);

    ctx.restore();
  }

  fitText(text, maxWidth) {
    if (this.ctx.measureText(text).width <= maxWidth) return text;

    let result = text;
    while (
      result.length > 1 &&
      this.ctx.measureText(result + "…").width > maxWidth
    ) {
      result = result.slice(0, -1);
    }
    return result + "…";
  }

  polygon(ctx, points) {
    if (!points.length) return;
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index][0], points[index][1]);
    }
    ctx.closePath();
  }

  strokeSegment(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }
}

export default CharacterRenderer;
