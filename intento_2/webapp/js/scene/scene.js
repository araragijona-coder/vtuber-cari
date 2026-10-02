(() => {
  "use strict";

  const VFX_TYPES = Object.freeze([
    "FLASH",
    "GLOW",
    "IMPACT",
    "MOTION_TRAIL",
    "SCREEN_FLASH",
    "SCREEN_SHAKE",
    "BREAK",
    "BURST",
    "TELEGRAPH"
  ]);

  const LAYERS = Object.freeze([
    "BACKGROUND",
    "FAR",
    "MID",
    "GROUND",
    "ACTORS",
    "FX",
    "FOREGROUND"
  ]);

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function create(options = {}) {
    const camera = options.camera || window.MachGirlsSceneCamera?.create?.() || null;
    const layers = new Map(LAYERS.map((name) => [name, []]));
    const actors = new Map();
    const effects = new Map();

    function normalizeLayer(layer) {
      const value = String(layer || "ACTORS").toUpperCase();
      return LAYERS.includes(value) ? value : "ACTORS";
    }

    function registerActor(actor) {
      if (!actor?.id) return false;
      const previous = actors.get(actor.id);
      if (previous && previous !== actor) {
        const oldLayer = normalizeLayer(previous.layer);
        layers.set(oldLayer, layers.get(oldLayer).filter((item) => item !== previous));
      }
      actors.set(actor.id, actor);
      const layer = normalizeLayer(actor.layer);
      if (!layers.get(layer).includes(actor)) layers.get(layer).push(actor);
      return true;
    }

    function removeActor(id) {
      const actor = actors.get(String(id));
      if (!actor) return false;
      actors.delete(String(id));
      const layer = normalizeLayer(actor.layer);
      layers.set(layer, layers.get(layer).filter((item) => item !== actor));
      return true;
    }

    function getActor(id) {
      return actors.get(String(id)) || null;
    }

    function addEffect(id, effect = {}) {
      if (!id || typeof effect !== "object") return false;
      const type = String(effect.type || "FX").toUpperCase();
      const scope = String(effect.scope || (effect.actorId ? "ACTOR" : "SCREEN")).toUpperCase();
      const durationMs = Math.max(0, finite(effect.durationMs, 0));
      const now = Number.isFinite(Number(effect.startTime))
        ? Number(effect.startTime)
        : (typeof performance !== "undefined" ? performance.now() : 0);
      const actorId = effect.actorId ? String(effect.actorId) : null;
      const layerId = effect.layerId ? String(effect.layerId) : null;
      const offset = effect.offset || {};
      effects.set(String(id), {
        id: String(id),
        type: VFX_TYPES.includes(type) ? type : "FX",
        scope: scope === "ACTOR" ? "ACTOR" : "SCREEN",
        actorId,
        layerId,
        anchor: String(effect.anchor || "CENTER"),
        offset: {
          x: finite(offset.x),
          y: finite(offset.y)
        },
        scale: Math.max(0.01, finite(effect.scale, 1)),
        opacity: Math.min(1, Math.max(0, finite(effect.opacity, 1))),
        intensity: Math.min(1, Math.max(0, finite(effect.intensity, 1))),
        depthMode: String(effect.depthMode || "INHERIT").toUpperCase(),
        durationMs,
        startTime: now,
        visible: effect.visible !== false,
        data: { ...(effect.data || {}) }
      });
      return true;
    }

    function removeEffect(id) {
      return effects.delete(String(id));
    }

    function cleanupEffects(now = typeof performance !== "undefined" ? performance.now() : 0) {
      const current = Number(now) || 0;
      let removed = 0;
      for (const [id, effect] of effects.entries()) {
        if (effect.durationMs > 0 && current - effect.startTime >= effect.durationMs) {
          effects.delete(id);
          removed += 1;
        }
      }
      return removed;
    }

    function effectState(effect, now = typeof performance !== "undefined" ? performance.now() : 0) {
      if (!effect) return "inactive";
      if (!effect.visible) return "inactive";
      if (effect.durationMs <= 0) return "active";
      const elapsed = (Number(now) || 0) - effect.startTime;
      if (elapsed < 0) return "inactive";
      if (elapsed >= effect.durationMs) return "finished";
      return "active";
    }

    function renderables(now = typeof performance !== "undefined" ? performance.now() : 0) {
      cleanupEffects(now);
      const list = [];
      for (const layerName of LAYERS) {
        for (const actor of layers.get(layerName) || []) {
          const transform = actor.transform;
          if (!transform.visible) continue;
          const actorLayers = actor.getRenderLayers?.() || [];
          if (actorLayers.length === 0) {
            list.push({
              type: "ACTOR",
              layer: layerName,
              z: transform.z,
              actor,
              actorZ: finite(transform.z),
              layerZ: 0,
              actorLayer: null
            });
            continue;
          }
          for (const actorLayer of actorLayers) {
            if (actorLayer.visible === false) continue;
            list.push({
              type: "ACTOR_LAYER",
              layer: layerName,
              z: transform.z,
              actor,
              actorZ: finite(transform.z),
              layerZ: finite(actorLayer.z),
              actorLayer
            });
          }
        }
      }
      for (const effect of effects.values()) {
        if (effect.visible === false || effectState(effect, now) !== "active") continue;
        if (effect.scope === "ACTOR" && effect.actorId) {
          const actor = actors.get(effect.actorId);
          if (!actor) continue;
          const actorLayer = actor.getRenderLayers?.().find((item) => item.id === effect.layerId) || null;
          const actorZ = finite(actor.transform?.z);
          const layerZ = effect.depthMode === "INHERIT" ? finite(actorLayer?.z, 0) : finite(effect.depth, 0);
          list.push({
            type: "FX",
            layer: "FX",
            z: actorZ,
            actor,
            actorZ,
            layerZ,
            actorLayer,
            effect
          });
        } else {
          list.push({ type: "FX", layer: "FX", z: 0, actor: null, actorZ: 0, layerZ: 0, actorLayer: null, effect });
        }
      }
      return list.sort((a, b) => {
        const sceneLayerDelta = LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer);
        if (sceneLayerDelta) return sceneLayerDelta;
        const actorDepthDelta = finite(a.actorZ, finite(a.z)) - finite(b.actorZ, finite(b.z));
        if (actorDepthDelta) return actorDepthDelta;
        return finite(a.layerZ) - finite(b.layerZ);
      });
    }

    function snapshot() {
      return {
        layers: Object.fromEntries(LAYERS.map((name) => [name, (layers.get(name) || []).map((actor) => actor.getSnapshot?.() || null).filter(Boolean)])),
        effects: [...effects.values()].map((effect) => ({ ...effect })),
        camera: camera?.getState?.() || null
      };
    }

    return Object.freeze({
      layers: LAYERS,
      camera,
      registerActor,
      removeActor,
      getActor,
      addEffect,
      removeEffect,
      renderables,
      snapshot
    });
  }

  window.MachGirlsScene = Object.freeze({ LAYERS, create });
})();