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

  function fromCombatEvent(event) {
    if (!event) return null;
    const type = String(event.type || "").toUpperCase();
    const presentationType = {
      ATTACK_START: "ATTACK",
      DAMAGE_APPLIED: "IMPACT",
      BREAK_TRIGGER: "BREAK",
      BURST_START: "BURST"
    }[type];
    if (!presentationType) return null;

    const action = Object.freeze({
      actionId: String(event.actionId || ""),
      actionType: String(event.actionType || ""),
      actorId: String(event.sourceRole || ""),
      targetId: String(event.targetRole || ""),
      source: String(event.sourceRole || ""),
      cardId: String(event.cardId || ""),
      characterId: String(event.characterId || ""),
      damage: Number(event.damage || 0),
      breakDamage: Number(event.breakDamage || 0),
      hitIndex: event.hitIndex === undefined ? undefined : Number(event.hitIndex),
      hitCount: event.hitCount === undefined ? undefined : Number(event.hitCount)
    });
    return Object.freeze({ type: presentationType, phase: type, action, gameplayEvent: event });
  }

  function create() {
    return Object.freeze({
      fromAction,
      fromCombatEvent,
      isKnownType: (type) => TYPES.includes(String(type || "").toUpperCase())
    });
  }

  window.MachGirlsPresentationEvents = Object.freeze({ TYPES, create });
})();