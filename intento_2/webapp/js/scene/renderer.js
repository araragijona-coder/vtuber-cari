(() => {
  "use strict";

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function create(options = {}) {
    const context = options.context || null;
    const camera = options.camera || null;

    function applyCamera(viewport, now = 0) {
      if (!context || typeof context.save !== "function") return false;
      if (typeof context.translate !== "function" || typeof context.scale !== "function") return false;
      const width = Math.max(1, finite(viewport?.width, 1));
      const height = Math.max(1, finite(viewport?.height, 1));
      const state = camera?.getState?.() || {
        x: width / 2, y: height / 2, zoom: 1, offsetX: 0, offsetY: 0, shake: 0, startedAt: now, durationMs: 0
      };
      context.save();
      const elapsed = Math.max(0, now - finite(state.startedAt, now));
      const shakeFade = state.durationMs > 0 ? Math.max(0, 1 - elapsed / state.durationMs) : 1;
      const shake = finite(state.shake) * shakeFade;
      const shakeX = shake ? Math.sin(now * .085) * shake : 0;
      const shakeY = shake ? Math.cos(now * .071) * shake * .55 : 0;
      const cameraX = finite(state.x, width / 2);
      const cameraY = finite(state.y, height / 2);
      context.translate(width / 2 + finite(state.offsetX) + shakeX, height / 2 + finite(state.offsetY) + shakeY);
      context.scale(finite(state.zoom, 1), finite(state.zoom, 1));
      context.translate(-cameraX, -cameraY);
      return true;
    }

    function renderLighting(item, context) {
      const lighting = item?.actorLayer?.lighting;
      if (!lighting?.evaluate || !context || !("filter" in context)) return null;
      const response = lighting.evaluate();
      if (!response.enabled || response.filter === "none") return response;
      const previousFilter = context.filter;
      context.filter = response.filter;
      return { ...response, previousFilter };
    }

    function restoreLighting(context, lightingState) {
      if (!lightingState || !context || !("filter" in context)) return;
      context.filter = lightingState.previousFilter || "none";
    }

    function render(scene, viewport, draw, now = 0) {
      if (!scene || typeof draw !== "function") return false;
      const renderables = scene.renderables();
      if (!context) return false;
      if (applyCamera(viewport, now)) {
        try {
          for (const item of renderables) {
            const transform = item.actor?.transform;
            const cameraState = scene.camera?.getState?.() || {};
            const screen = transform && window.MachGirlsWorldSpace
              ? window.MachGirlsWorldSpace.worldToScreen(
                transform,
                cameraState,
                viewport,
                {
                  layerZ: item.type === "ACTOR_LAYER" ? item.layerZ : undefined,
                  parallaxOrigin: cameraState.parallaxOrigin
                }
              )
              : null;
            const lightingState = renderLighting(item, context);
            try {
              draw(item, screen, context, now);
            } finally {
              restoreLighting(context, lightingState);
            }
          }
        } finally {
          context.restore?.();
        }
        return true;
      }
      for (const item of renderables) {
        const lightingState = renderLighting(item, context);
        try {
          draw(item, null, context, now);
        } finally {
          restoreLighting(context, lightingState);
        }
      }
      return true;
    }

    function renderFrame(scene, viewport, drawFrame, now = 0) {
      if (!scene || typeof drawFrame !== "function" || !context) return false;
      const width = Math.max(1, finite(viewport?.width, 1));
      const height = Math.max(1, finite(viewport?.height, 1));
      context.clearRect?.(0, 0, width, height);
      if (!applyCamera({ width, height }, now)) return false;
      try {
        drawFrame(context, now, scene);
      } finally {
        context.restore?.();
        context.globalAlpha = 1;
        context.setLineDash?.([]);
      }
      return true;
    }

    return Object.freeze({ applyCamera, render, renderFrame });
  }

  window.MachGirlsSceneRenderer = Object.freeze({ create });
})();