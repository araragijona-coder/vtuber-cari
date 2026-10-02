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
          list.push({ type: "ACTOR", layer: layerName, z: transform.z, actor });
        }
      }
      for (const effect of effects.values()) {
        if (effect.visible === false) continue;
        list.push({ type: "FX", layer: "FX", z: Number(effect.z) || 0, effect });
      }
      return list.sort((a, b) => {
        const layerDelta = LAYERS.indexOf(a.layer) - LAYERS.indexOf(b.layer);
        return layerDelta || Number(a.z || 0) - Number(b.z || 0);
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