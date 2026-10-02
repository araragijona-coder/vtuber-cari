(() => {
  "use strict";

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
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
      setState,
      getAnimationState: () => actor.animation?.state || actor.transform.state,
      attachChild,
      detachChild,
      getSnapshot
    });
  }

  window.MachGirlsActor = Object.freeze({ create });
})();