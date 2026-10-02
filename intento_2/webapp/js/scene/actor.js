(() => {
  "use strict";

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function createLayerMesh(spec) {
    if (!spec || spec.enabled !== true) return null;
    if (!window.MachGirlsMeshDeformation?.create) {
      throw new Error("MachGirlsMeshDeformation must load before mesh-enabled actors");
    }
    return window.MachGirlsMeshDeformation.create(spec);
  }

  function normalizeLayer(spec = {}, index = 0) {
    const transform = spec.transform || {};
    return {
      id: String(spec.id || "layer-" + index),
      assetId: spec.assetId ? String(spec.assetId) : null,
      z: finite(spec.z),
      visible: spec.visible !== false,
      opacity: clamp(spec.opacity ?? 1, 0, 1),
      transform: {
        x: finite(transform.x),
        y: finite(transform.y),
        rotation: finite(transform.rotation),
        scale: clamp(transform.scale ?? 1, 0.01, 10)
      },
      anchor: String(spec.anchor || "INHERIT"),
      mesh: createLayerMesh(spec.mesh)
    };
  }

  function copyLayer(layer, includeMeshRuntime = false) {
    return {
      id: String(layer.id),
      assetId: layer.assetId ? String(layer.assetId) : null,
      z: finite(layer.z),
      visible: layer.visible !== false,
      opacity: clamp(layer.opacity ?? 1, 0, 1),
      transform: {
        x: finite(layer.transform?.x),
        y: finite(layer.transform?.y),
        rotation: finite(layer.transform?.rotation),
        scale: clamp(layer.transform?.scale ?? 1, 0.01, 10)
      },
      anchor: String(layer.anchor || "INHERIT"),
      mesh: includeMeshRuntime ? layer.mesh : layer.mesh?.getSnapshot?.() || null
    };
  }

  function orderedLayers(layers) {
    const compareDepth = window.MachGirlsWorldSpace?.compareDepth;
    return layers
      .map((layer, index) => ({ layer, index }))
      .sort((a, b) => (compareDepth
        ? compareDepth(a.layer, b.layer)
        : finite(a.layer.z) - finite(b.layer.z)) || a.index - b.index)
      .map(({ layer }) => copyLayer(layer, true));
  }

  function create(spec = {}) {
    const actor = {
      id: String(spec.id || "actor"),
      role: String(spec.role || "ACTOR"),
      layer: String(spec.layer || "ACTORS"),
      transform: window.MachGirlsWorldSpace.createTransform(spec.transform || spec),
      visibility: spec.visible !== false,
      assetRef: spec.assetRef ? String(spec.assetRef) : null,
      anchor: String(spec.anchor || spec.transform?.anchor || "CENTER"),
      layers: Array.isArray(spec.layers) ? spec.layers.map(normalizeLayer) : [],
      children: new Map(),
      metadata: { ...(spec.metadata || {}) },
      animation: window.MachGirlsAnimationStateMachine?.create?.(spec.state || spec.transform?.state || "IDLE") || null
    };

    function setTransform(next = {}) {
      actor.transform = window.MachGirlsWorldSpace.createTransform({
        ...actor.transform,
        ...next,
        visible: next.visible === undefined ? actor.visibility : Boolean(next.visible)
      });
      actor.visibility = actor.transform.visible;
      return getSnapshot();
    }

    function setVisible(visible) {
      actor.visibility = Boolean(visible);
      actor.transform.visible = actor.visibility;
      return actor.visibility;
    }

    function setLayers(nextLayers = []) {
      actor.layers = Array.isArray(nextLayers) ? nextLayers.map(normalizeLayer) : [];
      return getLayers();
    }

    function getLayers() {
      return actor.layers.map((layer) => copyLayer(layer, false));
    }

    function getRenderLayers() {
      return orderedLayers(actor.layers);
    }

    function attachChild(childSpec = {}) {
      const child = typeof childSpec === "object" && typeof childSpec.id !== "undefined"
        ? childSpec
        : null;
      if (!child) return false;
      actor.children.set(String(child.id), child);
      return true;
    }

    function detachChild(id) {
      return actor.children.delete(String(id));
    }

    function getSnapshot() {
      return {
        id: actor.id,
        role: actor.role,
        layer: actor.layer,
        visible: actor.visibility,
        assetRef: actor.assetRef,
        anchor: actor.anchor,
        transform: window.MachGirlsWorldSpace.copyTransform(actor.transform),
        layers: getLayers(),
        children: [...actor.children.values()].map((child) => child.snapshot ? child.snapshot() : { ...child }),
        metadata: { ...actor.metadata }
      };
    }

    function setState(stateName, now = (typeof performance !== "undefined" ? performance.now() : 0)) {
      const target = String(stateName || "IDLE").toUpperCase();
      if (actor.animation?.setState) {
        const result = actor.animation.setState(target, now);
        if (!result.changed && result.reason === "TRANSITION_NOT_ALLOWED") {
          actor.animation.forceState(target, now);
        }
      }
      actor.transform.state = target;
      return actor.transform.state;
    }

    return Object.freeze({
      id: actor.id,
      role: actor.role,
      get layer() { return actor.layer; },
      get transform() { return window.MachGirlsWorldSpace.copyTransform(actor.transform); },
      setTransform,
      setVisible,
      setLayers,
      getLayers,
      getRenderLayers,
      setState,
      getAnimationState: () => actor.animation?.state || actor.transform.state,
      attachChild,
      detachChild,
      getSnapshot
    });
  }

  window.MachGirlsActor = Object.freeze({ create });
})();