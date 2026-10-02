(() => {
  "use strict";

  const DEFAULT = Object.freeze({
    x: 600,
    y: 350,
    zoom: 1,
    offsetX: 0,
    offsetY: 0
  });

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function easeInOut(value) {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function create(options = {}) {
    const state = {
      x: finite(options.x, DEFAULT.x),
      y: finite(options.y, DEFAULT.y),
      zoom: clamp(options.zoom ?? DEFAULT.zoom, 0.1, 5),
      offsetX: finite(options.offsetX),
      offsetY: finite(options.offsetY),
      target: { x: DEFAULT.x, y: DEFAULT.y, zoom: DEFAULT.zoom, offsetX: 0, offsetY: 0 },
      transitionStart: {
        x: finite(options.x, DEFAULT.x),
        y: finite(options.y, DEFAULT.y),
        zoom: clamp(options.zoom ?? DEFAULT.zoom, 0.1, 5),
        offsetX: finite(options.offsetX),
        offsetY: finite(options.offsetY)
      },
      durationMs: 0,
      startedAt: finite(options.now, typeof performance !== "undefined" ? performance.now() : 0),
      active: "IDLE",
      shake: 0
    };

    function setTarget(target = {}, now = typeof performance !== "undefined" ? performance.now() : 0) {
      state.transitionStart = {
        x: state.x,
        y: state.y,
        zoom: state.zoom,
        offsetX: state.offsetX,
        offsetY: state.offsetY
      };
      state.target = {
        x: finite(target.x, state.x),
        y: finite(target.y, state.y),
        zoom: clamp(target.zoom ?? state.zoom, 0.1, 5),
        offsetX: finite(target.offsetX, state.offsetX),
        offsetY: finite(target.offsetY, state.offsetY)
      };
      state.durationMs = Math.max(0, finite(target.durationMs, 0));
      state.startedAt = finite(now, 0);
      state.active = String(target.name || state.active || "IDLE");
      state.shake = Math.max(0, finite(target.shake));

      if (state.durationMs === 0) {
        state.x = state.target.x;
        state.y = state.target.y;
        state.zoom = state.target.zoom;
        state.offsetX = state.target.offsetX;
        state.offsetY = state.target.offsetY;
      }

      return getState();
    }

    function snap(frame = {}) {
      state.x = finite(frame.x, state.x);
      state.y = finite(frame.y, state.y);
      state.zoom = clamp(frame.zoom ?? state.zoom, 0.1, 5);
      state.offsetX = finite(frame.offsetX, state.offsetX);
      state.offsetY = finite(frame.offsetY, state.offsetY);
      state.transitionStart = {
        x: state.x,
        y: state.y,
        zoom: state.zoom,
        offsetX: state.offsetX,
        offsetY: state.offsetY
      };
      state.target = { x: state.x, y: state.y, zoom: state.zoom, offsetX: state.offsetX, offsetY: state.offsetY };
      state.durationMs = 0;
      state.startedAt = typeof performance !== "undefined" ? performance.now() : 0;
      if (frame.name) state.active = String(frame.name);
      state.shake = Math.max(0, finite(frame.shake));
      return getState();
    }

    function update(now = typeof performance !== "undefined" ? performance.now() : 0) {
      const elapsed = Math.max(0, finite(now) - state.startedAt);
      const raw = state.durationMs > 0 ? clamp(elapsed / state.durationMs, 0, 1) : 1;
      const t = easeInOut(raw);
      if (raw >= 1) {
        state.x = state.target.x;
        state.y = state.target.y;
        state.zoom = state.target.zoom;
        state.offsetX = state.target.offsetX;
        state.offsetY = state.target.offsetY;
        return getState();
      }

      const start = state.transitionStart;
      state.x = start.x + (state.target.x - start.x) * t;
      state.y = start.y + (state.target.y - start.y) * t;
      state.zoom = start.zoom + (state.target.zoom - start.zoom) * t;
      state.offsetX = start.offsetX + (state.target.offsetX - start.offsetX) * t;
      state.offsetY = start.offsetY + (state.target.offsetY - start.offsetY) * t;
      return getState();
    }

    function setViewportCenter(width, height) {
      if (state.target.x === DEFAULT.x && state.target.y === DEFAULT.y && state.active === "IDLE") {
        state.x = width / 2;
        state.y = height / 2;
        state.target.x = state.x;
        state.target.y = state.y;
      }
    }

    function getState() {
      return {
        x: state.x,
        y: state.y,
        zoom: state.zoom,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
        target: { ...state.target },
        active: state.active,
        durationMs: state.durationMs,
        startedAt: state.startedAt,
        shake: state.shake
      };
    }

    return Object.freeze({
      setTarget,
      snap,
      update,
      setViewportCenter,
      getState,
      get x() { return state.x; },
      get y() { return state.y; },
      get zoom() { return state.zoom; },
      get offsetX() { return state.offsetX; },
      get offsetY() { return state.offsetY; },
      get active() { return state.active; },
      get shake() { return state.shake; }
    });
  }

  window.MachGirlsSceneCamera = Object.freeze({ DEFAULT, create });
})();