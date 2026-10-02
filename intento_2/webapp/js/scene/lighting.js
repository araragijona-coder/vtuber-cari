(() => {
  "use strict";

  const DEFAULT_NORMAL = Object.freeze({ x: 0, y: -1 });

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function normalizeDirection(direction = {}) {
    const x = finite(direction.x);
    const y = finite(direction.y, -1);
    const length = Math.hypot(x, y);
    if (length <= 0) return { ...DEFAULT_NORMAL };
    return { x: x / length, y: y / length };
  }

  function normalizeTint(tint = {}) {
    return {
      r: clamp(tint.r ?? 1, 0, 1),
      g: clamp(tint.g ?? 1, 0, 1),
      b: clamp(tint.b ?? 1, 0, 1)
    };
  }

  function hueFromRgb({ r, g, b }) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta === 0) return 0;
    let hue;
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
    return (hue + 360) % 360;
  }

  function normalizeSpec(spec = {}) {
    return {
      enabled: spec.enabled === true,
      ambient: clamp(spec.ambient ?? 0, 0, 1),
      intensity: clamp(spec.intensity ?? 0, 0, 1),
      direction: normalizeDirection(spec.direction),
      tint: normalizeTint(spec.tint)
    };
  }

  function create(spec = {}) {
    let config = normalizeSpec(spec);

    function getSnapshot() {
      return {
        enabled: config.enabled,
        ambient: config.ambient,
        intensity: config.intensity,
        direction: { ...config.direction },
        tint: { ...config.tint }
      };
    }

    function setEnabled(enabled) {
      config = { ...config, enabled: Boolean(enabled) };
      return config.enabled;
    }

    function setProfile(next = {}) {
      config = normalizeSpec({ ...config, ...next });
      return getSnapshot();
    }

    function evaluate(surfaceNormal = DEFAULT_NORMAL) {
      const normal = normalizeDirection(surfaceNormal);
      const directional = Math.max(
        0,
        normal.x * config.direction.x + normal.y * config.direction.y
      );
      const contribution = config.enabled
        ? clamp(config.ambient + config.intensity * directional, 0, 1)
        : 0;
      const brightness = clamp(0.82 + contribution * 0.36, 0.6, 1.18);
      const tintStrength = config.enabled
        ? clamp(config.intensity * 0.65 + config.ambient * 0.35, 0, 1)
        : 0;
      const hue = hueFromRgb(config.tint);
      const saturation = clamp(
        ((1 - Math.min(config.tint.r, config.tint.g, config.tint.b)) + tintStrength) * 55,
        0,
        100
      );
      const filter = config.enabled
        ? [
            "brightness(" + brightness.toFixed(4) + ")",
            "saturate(" + (100 + saturation).toFixed(2) + "%)",
            "hue-rotate(" + (hue * tintStrength).toFixed(3) + "deg)"
          ].join(" ")
        : "none";
      return {
        enabled: config.enabled,
        ambient: config.ambient,
        intensity: config.intensity,
        directional,
        contribution,
        brightness,
        tint: { ...config.tint },
        tintStrength,
        filter
      };
    }

    return Object.freeze({
      getSnapshot,
      setEnabled,
      setProfile,
      evaluate,
      toFilter: () => evaluate().filter
    });
  }

  window.MachGirlsLighting = Object.freeze({ create });
})();
