(() => {
  "use strict";

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

    function addEffect(id, effect) {
      if (!id) return false;
      effects.set(String(id), { ...effect, id: String(id) });
      return true;
    }

    function removeEffect(id) {
      return effects.delete(String(id));
    }

    function renderables() {
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
        if (effect.visible === false) continue;
        list.push({ type: "FX", layer: "FX", z: Number(effect.z) || 0, effect });
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