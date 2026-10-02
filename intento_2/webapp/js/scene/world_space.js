(() => {
  "use strict";

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function createTransform(input = {}) {
    return {
      x: finite(input.x),
      y: finite(input.y),
      z: finite(input.z),
      scale: clamp(input.scale ?? 1, 0.01, 10),
      rotation: finite(input.rotation),
      state: String(input.state || "IDLE"),
      visible: input.visible !== false,
      anchor: String(input.anchor || "CENTER"),
      assetRef: input.assetRef ? String(input.assetRef) : null
    };
  }

  function copyTransform(transform) {
    return createTransform(transform || {});
  }

  function depthFactor(z) {
    const depth = clamp(finite(z), 0, 1);
    return clamp(0.82 + depth * 0.2, 0.78, 1.05);
  }

  function worldToScreen(transform, camera, viewport) {
    const view = {
      width: Math.max(1, finite(viewport?.width, 1)),
      height: Math.max(1, finite(viewport?.height, 1))
    };
    const cam = camera || {};
    const zoom = clamp(cam.zoom ?? 1, 0.1, 5);
    const cameraX = finite(cam.x, view.width / 2);
    const cameraY = finite(cam.y, view.height / 2);
    const offsetX = finite(cam.offsetX);
    const offsetY = finite(cam.offsetY);
    const depth = depthFactor(transform?.z);
    return {
      x: view.width / 2 + (finite(transform?.x) - cameraX + offsetX) * zoom,
      y: view.height / 2 + (finite(transform?.y) - cameraY + offsetY) * zoom,
      scale: clamp(finite(transform?.scale, 1) * zoom * depth, 0.01, 10),
      depthFactor: depth,
      rotation: finite(transform?.rotation),
      z: finite(transform?.z)
    };
  }

  function compareDepth(a, b) {
    return finite(a?.z) - finite(b?.z);
  }

  window.MachGirlsWorldSpace = Object.freeze({
    createTransform,
    copyTransform,
    depthFactor,
    worldToScreen,
    compareDepth
  });
})();