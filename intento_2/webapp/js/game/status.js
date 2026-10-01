(() => {
  "use strict";

  const STATUS_TYPES = Object.freeze({
    WEAK: "WEAK",
    EXPOSED: "EXPOSED"
  });

  const DEFINITIONS = Object.freeze({
    WEAK: Object.freeze({
      id: STATUS_TYPES.WEAK,
      label: "WEAK",
      description: "Reduce el daño ofensivo un 25%."
    }),
    EXPOSED: Object.freeze({
      id: STATUS_TYPES.EXPOSED,
      label: "EXPOSED",
      description: "Aumenta el daño recibido un 25%."
    })
  });

  function createStatuses() {
    return {};
  }

  function has(combatant, type) {
    return Number(combatant?.statuses?.[type]?.remainingMs || 0) > 0;
  }

  function get(combatant, type) {
    return combatant?.statuses?.[type] || null;
  }

  function apply(combatant, type, durationMs = 1000) {
    if (!DEFINITIONS[type] || !combatant) return false;
    const duration = Math.max(1, Math.floor(Number(durationMs) || 0));
    if (!combatant.statuses || typeof combatant.statuses !== "object") {
      combatant.statuses = createStatuses();
    }
    const current = Number(combatant.statuses[type]?.remainingMs || 0);
    combatant.statuses[type] = {
      remainingMs: Math.max(current, duration),
      durationMs: Math.max(current, duration)
    };
    return true;
  }

  function remove(combatant, type) {
    if (!combatant?.statuses) return false;
    const existed = Boolean(combatant.statuses[type]);
    delete combatant.statuses[type];
    return existed;
  }

  function advance(combatant, deltaMs) {
    if (!combatant?.statuses || typeof combatant.statuses !== "object") return;
    const delta = Math.max(0, Number(deltaMs) || 0);
    for (const type of Object.keys(combatant.statuses)) {
      const status = combatant.statuses[type];
      status.remainingMs = Math.max(0, Number(status.remainingMs || 0) - delta);
      if (status.remainingMs <= 0) delete combatant.statuses[type];
    }
  }

  function entries(combatant) {
    return Object.entries(combatant?.statuses || {})
      .filter(([, value]) => Number(value?.remainingMs || 0) > 0)
      .map(([type, value]) => ({
        type,
        turns: Math.ceil(Number(value.remainingMs) / 1000),
        remainingMs: Number(value.remainingMs),
        label: DEFINITIONS[type]?.label || type,
        description: DEFINITIONS[type]?.description || ""
      }));
  }

  window.StatusSystem = Object.freeze({
    STATUS_TYPES,
    DEFINITIONS,
    createStatuses,
    has,
    get,
    apply,
    remove,
    advance,
    tick: advance,
    entries
  });
})();