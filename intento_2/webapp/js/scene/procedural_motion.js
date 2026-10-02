(() => {
  "use strict";

  const TWO_PI = Math.PI * 2;

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function normalizeProfile(spec = {}) {
    return {
      enabled: spec.enabled !== false,
      amplitude: Math.max(0, finite(spec.amplitude, 0.01)),
      frequency: Math.max(0, finite(spec.frequency, 1)),
      phase: finite(spec.phase, 0)
    };
  }

  function zeroOffsets(count) {
    return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
  }

  function copyOffsets(offsets) {
    return offsets.map(({ x, y }) => ({ x, y }));
  }

  function create(spec = {}) {
    let profile = normalizeProfile(spec);

    function getSnapshot() {
      return { ...profile };
    }

    function setEnabled(enabled) {
      profile = { ...profile, enabled: Boolean(enabled) };
      return profile.enabled;
    }

    function setProfile(next = {}) {
      profile = normalizeProfile({ ...profile, ...next });
      return getSnapshot();
    }

    function evaluate(timeMs = 0, mesh) {
      if (!mesh || typeof mesh.getBaseVertices !== "function") return [];
      const base = mesh.getBaseVertices();
      if (!profile.enabled || profile.amplitude === 0 || base.length === 0) {
        return zeroOffsets(base.length);
      }

      const minX = base.reduce((min, vertex) => Math.min(min, finite(vertex.x)), Infinity);
      const maxX = base.reduce((max, vertex) => Math.max(max, finite(vertex.x)), -Infinity);
      const spanX = maxX - minX;
      const frequencyPhase = finite(timeMs) / 1000 * TWO_PI * profile.frequency + profile.phase;
      const wave = Math.sin(frequencyPhase);

      return base.map((vertex) => {
        const normalizedX = spanX > 0 ? (finite(vertex.x) - minX) / spanX : 0.5;
        const bendWeight = (normalizedX * 2) - 1;
        return {
          x: 0,
          y: wave * profile.amplitude * bendWeight
        };
      });
    }

    function applyToMesh(mesh, timeMs = 0) {
      if (!mesh || typeof mesh.setDeformationOffsets !== "function") return false;
      const offsets = evaluate(timeMs, mesh);
      mesh.setDeformationOffsets(offsets);
      return profile.enabled;
    }

    function reset(mesh) {
      if (!mesh || typeof mesh.resetDeformation !== "function") return false;
      mesh.resetDeformation();
      return true;
    }

    return Object.freeze({
      getSnapshot,
      setEnabled,
      setProfile,
      evaluate,
      applyToMesh,
      reset
    });
  }

  window.MachGirlsProceduralMotion = Object.freeze({ create });
})();
