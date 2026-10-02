(() => {
  "use strict";

  const TYPES = Object.freeze([
    "ATTACK",
    "DAMAGE",
    "IMPACT",
    "BREAK",
    "BURST",
    "TELEGRAPH",
    "STATE_CHANGE",
    "VICTORY",
    "DEFEAT"
  ]);

  function fromAction(action) {
    if (!action) return null;
    const type = String(action.actionType || action.type || "").toUpperCase();
    if (action.outcome === "VICTORY") return { type: "VICTORY", action };
    if (action.outcome === "DEFEAT") return { type: "DEFEAT", action };
    if (type === "BURST") return { type: "BURST", action };
    if (action.broke) return { type: "BREAK", action };
    if (Number(action.damage || 0) > 0 || Number(action.blockAbsorbed || 0) > 0) return { type: "IMPACT", action };
    if (type === "AUTO_ATTACK" || type === "SKILL" || type === "CARD" || type === "ABILITY" || type === "ENEMY_BEHAVIOR") {
      return { type: "ATTACK", action };
    }
    if (action.intent?.type) return { type: "TELEGRAPH", action };
    return { type: "STATE_CHANGE", action };
  }

  function create() {
    return Object.freeze({
      fromAction,
      isKnownType: (type) => TYPES.includes(String(type || "").toUpperCase())
    });
  }

  window.MachGirlsPresentationEvents = Object.freeze({ TYPES, create });
})();