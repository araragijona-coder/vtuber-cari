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

  function ensure(combatant) {
    if (!combatant.statuses || typeof combatant.statuses !== "object") {
      combatant.statuses = createStatuses();
    }
    return combatant.statuses;
  }

  function has(combatant, type) {
    const status = combatant?.statuses?.[type];
    return Boolean(
      Number(status?.durationTicks || 0) > 0 ||
      Number(status?.durationMs || 0) > 0 ||
      Number(status?.remainingMs || 0) > 0 ||
      Number(status?.turns || 0) > 0
    );
  }

  function get(combatant, type) {
    return combatant?.statuses?.[type] || null;
  }

  function apply(combatant, type, turns = 1) {
    const definition = DEFINITIONS[type];
    const safeTurns = Math.max(1, Math.floor(Number(turns) || 0));
    if (!definition || !combatant) return false;

    const statuses = ensure(combatant);
    const current = Number(statuses[type]?.turns || 0);
    statuses[type] = {
      turns: Math.max(current, safeTurns)
    };
    return true;
  }

  function applyTicks(combatant, type, durationTicks = 1) {
    const definition = DEFINITIONS[type];
    const safeDuration = Math.max(1, Math.floor(Number(durationTicks) || 0));
    if (!definition || !combatant) return false;

    const statuses = ensure(combatant);
    const current = Number(statuses[type]?.durationTicks || 0);
    statuses[type] = {
      durationTicks: Math.max(current, safeDuration)
    };
    return true;
  }

  function applyTimedMs(combatant, type, durationMs = 1000) {
    const definition = DEFINITIONS[type];
    const safeDuration = Math.max(1, Math.floor(Number(durationMs) || 0));
    if (!definition || !combatant) return false;

    const statuses = ensure(combatant);
    const current = Number(statuses[type]?.remainingMs || 0);
    statuses[type] = {
      durationMs: Math.max(current, safeDuration),
      remainingMs: Math.max(current, safeDuration)
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
      const status = combatant.statuses[type];
      const turns = Math.max(0, Number(status?.turns || 0) - 1);
      if (turns <= 0) {
        delete combatant.statuses[type];
      } else {
        status.turns = turns;
      }
    }
  }

  function tickTicks(combatant, count = 1) {
    if (!combatant?.statuses || typeof combatant.statuses !== "object") return;
    const ticks = Math.max(0, Math.floor(Number(count) || 0));

    for (const type of Object.keys(combatant.statuses)) {
      const status = combatant.statuses[type];
      if (Number(status?.durationTicks || 0) <= 0) continue;

      const remaining = Math.max(0, Number(status.durationTicks) - ticks);
      if (remaining <= 0) {
        delete combatant.statuses[type];
      } else {
        status.durationTicks = remaining;
      }
    }
  }

  function advance(combatant, deltaMs) {
    if (!combatant?.statuses || typeof combatant.statuses !== "object") return;
    const delta = Math.max(0, Number(deltaMs) || 0);

    for (const type of Object.keys(combatant.statuses)) {
      const status = combatant.statuses[type];

      if (Number(status?.remainingMs || 0) > 0) {
        status.remainingMs = Math.max(0, Number(status.remainingMs) - delta);
        if (status.remainingMs <= 0) {
          delete combatant.statuses[type];
          continue;
        }
      }

      if (Number(status?.durationTicks || 0) > 0) {
        // durationTicks is advanced by tickTicks in the fixed-step loop.
        // Keeping it here avoids conflating elapsed milliseconds with logical ticks.
        status.durationTicks = Math.max(0, Number(status.durationTicks));
      }
    }
  }

  function entries(combatant) {
    return Object.entries(combatant?.statuses || {})
      .filter(([, value]) =>
        Number(value?.turns || 0) > 0 ||
        Number(value?.durationTicks || 0) > 0 ||
        Number(value?.remainingMs || 0) > 0
      )
      .map(([type, value]) => ({
        type,
        turns: Number(value?.turns || 0),
        durationTicks: Number(value?.durationTicks || 0),
        remainingMs: Number(value?.remainingMs || value?.durationMs || 0),
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
    applyTicks,
    applyTimedMs,
    remove,
    tick,
    tickTicks,
    advance,
    entries
  });
})();
