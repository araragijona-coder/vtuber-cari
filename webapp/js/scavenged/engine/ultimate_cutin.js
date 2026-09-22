(() => {
  "use strict";

  const DURATION_MS = 1500;
  const GLITCH_MS = 260;

  const state = {
    active: false,
    overlay: null,
    media: null,
    timerId: null,
    resolve: null,
    onImpact: null
  };

  function getWebApp() {
    return window.Telegram?.WebApp || null;
  }

  function triggerHaptics() {
    const feedback = getWebApp()?.HapticFeedback;
    if (!feedback) return;

    try {
      feedback.impactOccurred?.("heavy");
    } catch (_error) {
      // Hardware APIs are optional outside Telegram.
    }

    try {
      feedback.notificationOccurred?.("warning");
    } catch (_error) {
      // Hardware APIs are optional outside Telegram.
    }
  }

  function getCombatRenderer() {
    return window.CariCombat || null;
  }

  function freezeCanvas(frozen) {
    try {
      getCombatRenderer()?.setFrozen?.(Boolean(frozen));
    } catch (_error) {
      // The cut-in must never break combat if the renderer is unavailable.
    }

    const canvas = getCombatRenderer()?.canvas || document.getElementById("combat-canvas");
    if (canvas) {
      canvas.classList.toggle("cari-ultimate-canvas-frozen", Boolean(frozen));
    }
  }

  function injectStyles() {
    if (document.getElementById("cari-ultimate-cutin-styles")) return;

    const style = document.createElement("style");
    style.id = "cari-ultimate-cutin-styles";
    style.textContent = [
      "#cari-ultimate-cutin{position:fixed;inset:0;z-index:50000;display:flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(4,5,10,.94);opacity:0;visibility:hidden;pointer-events:none}",
      "#cari-ultimate-cutin.cari-ultimate-cutin-active{opacity:1;visibility:visible;pointer-events:auto}",
      "#cari-ultimate-cutin .cari-ultimate-media{display:block;width:100%;height:100%;object-fit:contain;image-rendering:auto;background:#030408}",
      "#cari-ultimate-cutin .cari-ultimate-fallback{font:900 clamp(38px,12vw,120px)/1 system-ui,sans-serif;letter-spacing:.12em;color:#39ff14;text-shadow:0 0 12px #39ff14,0 0 40px rgba(57,255,20,.7);transform:skewX(-8deg);text-align:center;padding:24px}",
      "#cari-ultimate-cutin .cari-ultimate-caption{position:absolute;left:5vw;right:5vw;bottom:9vh;font:800 clamp(14px,3.5vw,26px)/1.1 system-ui,sans-serif;letter-spacing:.18em;text-align:center;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.7),0 0 18px rgba(57,255,20,.8)}",
      "#cari-ultimate-cutin .cari-ultimate-scanlines{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(255,255,255,0) 0,rgba(255,255,255,0) 3px,rgba(255,255,255,.08) 4px,rgba(255,255,255,0) 7px);mix-blend-mode:screen;opacity:.55}",
      "#cari-ultimate-cutin.cari-ultimate-cutin-glitch{animation:cari-ultimate-glitch .26s steps(2,end)}",
      "#cari-ultimate-cutin.cari-ultimate-cutin-glitch .cari-ultimate-media,#cari-ultimate-cutin.cari-ultimate-cutin-glitch .cari-ultimate-fallback{filter:hue-rotate(130deg) saturate(2) contrast(1.4)}",
      "@keyframes cari-ultimate-glitch{0%{transform:translate3d(0,0,0);filter:none}18%{transform:translate3d(-9px,0,0);filter:contrast(1.8)}42%{transform:translate3d(8px,0,0);filter:hue-rotate(90deg)}67%{transform:translate3d(-5px,2px,0);filter:brightness(1.8)}100%{transform:translate3d(0,0,0);filter:none}}",
      ".cari-ultimate-canvas-frozen{image-rendering:pixelated}",
      "@media (prefers-reduced-motion:reduce){#cari-ultimate-cutin.cari-ultimate-cutin-glitch{animation-duration:.01ms}}"
    ].join("");
    document.head.appendChild(style);
  }

  function createOverlay() {
    let overlay = document.getElementById("cari-ultimate-cutin");
    if (overlay) return overlay;

    overlay = document.createElement("section");
    overlay.id = "cari-ultimate-cutin";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = [
      '<div class="cari-ultimate-media-slot"></div>',
      '<div class="cari-ultimate-fallback" hidden>ULTIMATE</div>',
      '<div class="cari-ultimate-caption">ULTIMATE ACTIVATED</div>',
      '<div class="cari-ultimate-scanlines" aria-hidden="true"></div>'
    ].join("");

    document.body.appendChild(overlay);
    return overlay;
  }

  function normalizeMediaUrl(url) {
    if (typeof url !== "string") return "";
    return url.trim();
  }

  function isWebm(url) {
    return /\.webm(?:[?#].*)?$/i.test(url);
  }

  function isGif(url) {
    return /\.gif(?:[?#].*)?$/i.test(url);
  }

  function clearMedia() {
    const slot = state.overlay?.querySelector(".cari-ultimate-media-slot");
    if (slot) slot.replaceChildren();
    state.media = null;
  }

  function mountMedia(url, alt) {
    const slot = state.overlay.querySelector(".cari-ultimate-media-slot");
    const fallback = state.overlay.querySelector(".cari-ultimate-fallback");
    clearMedia();

    if (!url) {
      fallback.hidden = false;
      return null;
    }

    fallback.hidden = true;

    if (isWebm(url)) {
      const video = document.createElement("video");
      video.className = "cari-ultimate-media";
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("aria-label", alt || "Ultimate cut-in");
      video.src = url;
      slot.appendChild(video);
      state.media = video;
      return video;
    }

    if (isGif(url)) {
      const image = document.createElement("img");
      image.className = "cari-ultimate-media";
      image.alt = alt || "Ultimate cut-in";
      image.decoding = "async";
      image.src = url;
      slot.appendChild(image);
      state.media = image;
      return image;
    }

    fallback.hidden = false;
    return null;
  }

  function finish() {
    if (!state.active) return;

    if (state.timerId !== null) {
      window.clearTimeout(state.timerId);
      state.timerId = null;
    }

    const overlay = state.overlay;
    overlay?.classList.add("cari-ultimate-cutin-glitch");

    window.setTimeout(() => {
      if (overlay) {
        overlay.classList.remove(
          "cari-ultimate-cutin-active",
          "cari-ultimate-cutin-glitch"
        );
        overlay.setAttribute("aria-hidden", "true");
      }

      clearMedia();
      state.active = false;
      freezeCanvas(false);

      const onImpact = state.onImpact;
      const resolve = state.resolve;
      state.onImpact = null;
      state.resolve = null;

      try {
        onImpact?.();
      } catch (error) {
        console.warn("[CariUltimateCutIn] Impact callback failed:", error);
      }
      resolve?.();

      try {
        window.dispatchEvent(new CustomEvent("cari:ultimate-cutin-end"));
      } catch (_error) {
        // Optional DOM event bridge.
      }
    }, GLITCH_MS);
  }

  async function play(options = {}) {
    injectStyles();

    if (state.active) {
      finish();
    }

    state.active = true;
    state.overlay = createOverlay();
    state.overlay.setAttribute("aria-hidden", "false");
    state.overlay.classList.add("cari-ultimate-cutin-active");

    const mediaUrl = normalizeMediaUrl(
      options.mediaUrl ||
      options.cinematicUrl ||
      options.url ||
      ""
    );

    mountMedia(mediaUrl, options.alt || "Ultimate cut-in");
    freezeCanvas(true);
    triggerHaptics();

    try {
      window.dispatchEvent(new CustomEvent("cari:ultimate-cutin-start", {
        detail: {
          mediaUrl,
          durationMs: DURATION_MS
        }
      }));
    } catch (_error) {
      // Optional DOM event bridge.
    }

    if (state.media?.tagName === "VIDEO") {
      try {
        await state.media.play();
      } catch (_error) {
        // Autoplay may be blocked; timer-based completion still applies.
      }
    }

    return new Promise((resolve) => {
      state.onImpact =
        typeof options.onImpact === "function" ? options.onImpact : null;
      state.resolve = resolve;

      state.timerId = window.setTimeout(
        finish,
        Number(options.durationMs) || DURATION_MS
      );
    });
  }

  function isActive() {
    return state.active;
  }

  window.CariUltimateCutIn = Object.freeze({
    play,
    isActive,
    finish
  });
})();