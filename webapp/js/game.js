(() => {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const speedEl = document.getElementById("speed");
  const fpsEl = document.getElementById("fps");
  const hintEl = document.getElementById("hint");
  const ctx = canvas.getContext("2d", { alpha: false });

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    lastTime: 0,
    frameCount: 0,
    fpsTimer: 0,
    fps: 0,
    speed: 520,
    playerX: 0.5,
    targetX: 0.5,
    pointerActive: false,
    hintTimer: 2.5
  };

  function tg() {
    return window.Telegram && window.Telegram.WebApp
      ? window.Telegram.WebApp
      : null;
  }

  function applyTelegramTheme() {
    const webApp = tg();
    if (!webApp) return;

    const root = document.documentElement;
    const p = webApp.themeParams || {};
    root.style.setProperty("--bg", p.bg_color || "#0e1116");
    root.style.setProperty("--fg", p.text_color || "#ffffff");
    root.style.setProperty("--accent", p.button_color || "#4cc9f0");
    root.style.setProperty("--muted", p.hint_color || "rgba(255,255,255,.72)");
    root.style.setProperty(
      "--hud-bg",
      p.secondary_bg_color ? hexToRgba(p.secondary_bg_color, 0.76) : "rgba(8,11,16,.58)"
    );
  }

  function hexToRgba(value, alpha) {
    const hex = String(value).replace("#", "");
    if (hex.length !== 3 && hex.length !== 6) {
      return "rgba(8,11,16," + alpha + ")";
    }
    const full = hex.length === 3
      ? hex.split("").map(function (c) { return c + c; }).join("")
      : hex;
    const n = Number.parseInt(full, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function setTargetFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    state.targetX = clamp01((clientX - rect.left) / rect.width);
  }

  function pointerDown(event) {
    state.pointerActive = true;
    setTargetFromClientX(event.clientX);
    hintEl.classList.add("hidden");
    event.preventDefault();
  }

  function pointerMove(event) {
    if (!state.pointerActive) return;
    setTargetFromClientX(event.clientX);
    event.preventDefault();
  }

  function pointerUp(event) {
    state.pointerActive = false;
    event.preventDefault();
  }

  function keyDown(event) {
    const key = String(event.key).toLowerCase();
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" &&
        key !== "a" && key !== "d") {
      return;
    }

    const direction =
      event.key === "ArrowLeft" || key === "a" ? -1 : 1;
    state.targetX = clamp01(state.targetX + direction * 0.08);
    hintEl.classList.add("hidden");
    event.preventDefault();
  }

  function lerp(current, target, amount) {
    return current + (target - current) * amount;
  }

  function drawBackground(timeSeconds) {
    const w = state.width;
    const h = state.height;

    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, "#5b7fa3");
    sky.addColorStop(1, "#b9d7e6");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const water = ctx.createLinearGradient(0, h * 0.28, 0, h);
    water.addColorStop(0, "#397b97");
    water.addColorStop(1, "#0e354e");
    ctx.fillStyle = water;
    ctx.fillRect(0, h * 0.28, w, h * 0.72);

    drawHorizon(w, h);
    drawMovingWater(w, h, timeSeconds);
    drawTrack(w, h);
  }

  function drawHorizon(w, h) {
    const horizon = h * 0.30;
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.fillRect(0, horizon - 1, w, 2);

    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.beginPath();
    ctx.moveTo(w * 0.15, horizon + 8);
    ctx.quadraticCurveTo(w * 0.50, horizon - 8, w * 0.85, horizon + 8);
    ctx.lineTo(w * 0.85, horizon + 18);
    ctx.quadraticCurveTo(w * 0.50, horizon + 4, w * 0.15, horizon + 18);
    ctx.closePath();
    ctx.fill();
  }

  function drawMovingWater(w, h, timeSeconds) {
    const baseY = h * 0.34;
    const spacing = Math.max(16, h * 0.035);
    const scroll = (timeSeconds * state.speed * 0.42) % spacing;

    ctx.lineWidth = 1;
    for (let y = baseY - spacing + scroll; y < h; y += spacing) {
      const t = clamp01((y - baseY) / (h - baseY));
      const amplitude = 3 + t * 12;
      ctx.strokeStyle = "rgba(190,238,255," + (0.10 + t * 0.18) + ")";
      ctx.beginPath();

      const step = Math.max(18, w / 18);
      for (let x = 0; x <= w; x += step) {
        const wave =
          Math.sin(x * 0.025 + timeSeconds * 3.2 + y * 0.035) * amplitude;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  }

  function drawTrack(w, h) {
    const horizon = h * 0.30;
    const left = w * 0.28;
    const right = w * 0.72;
    const bottomLeft = -w * 0.08;
    const bottomRight = w * 1.08;

    ctx.fillStyle = "rgba(38,44,48,.64)";
    ctx.beginPath();
    ctx.moveTo(left, horizon);
    ctx.lineTo(right, horizon);
    ctx.lineTo(bottomRight, h);
    ctx.lineTo(bottomLeft, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, horizon);
    ctx.lineTo(bottomLeft, h);
    ctx.moveTo(right, horizon);
    ctx.lineTo(bottomRight, h);
    ctx.stroke();

    for (let lane = 1; lane <= 2; lane += 1) {
      const topX = left + (right - left) * lane / 3;
      const bottomX = bottomLeft + (bottomRight - bottomLeft) * lane / 3;
      ctx.strokeStyle = "rgba(255,255,255,.20)";
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.beginPath();
      ctx.moveTo(topX, horizon);
      ctx.lineTo(bottomX, h);
      ctx.stroke();
    }
  }

  function drawPlayer() {
    const w = state.width;
    const h = state.height;
    const x = state.playerX * w;
    const y = h * 0.78;
    const scale = Math.max(1, Math.min(w, h) / 390);
    const bodyW = 46 * scale;
    const bodyH = 70 * scale;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath();
    ctx.ellipse(0, bodyH * 0.60, bodyW * 0.75, bodyH * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff4d7d";
    ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

    ctx.fillStyle = "#ffd4df";
    ctx.fillRect(-bodyW * 0.25, -bodyH * 0.20, bodyW * 0.50, bodyH * 0.26);

    ctx.fillStyle = "#252936";
    ctx.fillRect(-bodyW * 0.44, bodyH * 0.18, bodyW * 0.18, bodyH * 0.27);
    ctx.fillRect(bodyW * 0.26, bodyH * 0.18, bodyW * 0.18, bodyH * 0.27);

    ctx.restore();
  }

  function update(dt) {
    const smoothing = 1 - Math.exp(-dt * 12);
    state.playerX = lerp(state.playerX, state.targetX, smoothing);
    state.hintTimer = Math.max(0, state.hintTimer - dt);
    if (state.hintTimer <= 0) hintEl.classList.add("hidden");
  }

  function render(now) {
    drawBackground(now / 1000);
    drawPlayer();
  }

  function loop(now) {
    if (!state.lastTime) state.lastTime = now;

    const dt = Math.min(
      0.05,
      Math.max(0, (now - state.lastTime) / 1000)
    );
    state.lastTime = now;

    update(dt);
    render(now);

    state.frameCount += 1;
    state.fpsTimer += dt;

    if (state.fpsTimer >= 0.5) {
      state.fps = state.frameCount / state.fpsTimer;
      state.frameCount = 0;
      state.fpsTimer = 0;
      speedEl.textContent = "SPEED " + Math.round(state.speed).toString().padStart(3, "0");
      fpsEl.textContent = "FPS " + Math.round(state.fps).toString().padStart(2, "0");
    }

    requestAnimationFrame(loop);
  }

  function initTelegram() {
    const webApp = tg();
    if (!webApp) return;

    try {
      webApp.ready();
      webApp.expand();

      if (typeof webApp.disableVerticalSwipes === "function") {
        webApp.disableVerticalSwipes();
      }

      webApp.onEvent("themeChanged", applyTelegramTheme);
    } catch (error) {
      console.warn("Telegram WebApp initialization warning:", error);
    }

    applyTelegramTheme();
  }

  window.addEventListener("resize", resize, { passive: true });
  canvas.addEventListener("pointerdown", pointerDown, { passive: false });
  canvas.addEventListener("pointermove", pointerMove, { passive: false });
  window.addEventListener("pointerup", pointerUp, { passive: false });
  window.addEventListener("pointercancel", pointerUp, { passive: false });
  window.addEventListener("keydown", keyDown, { passive: false });

  resize();
  initTelegram();
  requestAnimationFrame(loop);
})();
