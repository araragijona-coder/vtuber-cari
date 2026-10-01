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
    return Number(combatant?.statuses?.[type]?.turns || 0) > 0;
  }

  function get(combatant, type) {
    return combatant?.statuses?.[type] || null;
  }

  function apply(combatant, type, turns = 1) {
    const definition = DEFINITIONS[type];
    const safeTurns = Math.max(1, Math.floor(Number(turns) || 0));
    if (!definition || !combatant) return false;
    if (!combatant.statuses || typeof combatant.statuses !== "object") {
      combatant.statuses = createStatuses();
    }
    const current = combatant.statuses[type]?.turns || 0;
    combatant.statuses[type] = {
      turns: Math.max(current, safeTurns)
    };
    return true;
  }

  function remove(combatant, type) {
    if (!combatant?.statuses) return false;
    const existed = Boolean(combatant.statuses[type]);
    delete combatant.statuses[type];
    return existed;
  }

  function tick(combatant) {
    if (!combatant?.statuses || typeof combatant.statuses !== "object") return;
    for (const type of Object.keys(combatant.statuses)) {
      const turns = Math.max(0, Number(combatant.statuses[type]?.turns || 0) - 1);
      if (turns <= 0) delete combatant.statuses[type];
      else combatant.statuses[type].turns = turns;
    }
  }

  function entries(combatant) {
    return Object.entries(combatant?.statuses || {})
      .filter(([, value]) => Number(value?.turns || 0) > 0)
      .map(([type, value]) => ({
        type,
        turns: Number(value.turns),
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
    tick,
    entries
  });
})();