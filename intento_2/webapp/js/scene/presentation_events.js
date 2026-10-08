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

  const PRESENTATION_EVENT_TYPES = Object.freeze({
    ATTACK_START: "ATTACK",
    DAMAGE_APPLIED: "IMPACT",
    BREAK_TRIGGER: "BREAK",
    BURST_START: "BURST",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  function actionTypeOf(action) {
    return String(action?.actionType || action?.type || "").toUpperCase();
  }

  function hasContactPayload(action) {
    return Number(action?.damage || 0) > 0 ||
      Number(action?.blockAbsorbed || 0) > 0 ||
      Number(action?.breakDamage || 0) > 0 ||
      Boolean(action?.broke) ||
      (Array.isArray(action?.hits) && action.hits.length > 0);
  }

  function isOffensiveAction(action) {
    const type = actionTypeOf(action);
    if (type === "BURST" || type === "AUTO_ATTACK") return true;
    if (type === "ENEMY_BEHAVIOR") {
      return String(action?.intent?.type || "").toUpperCase() === "ATTACK" || hasContactPayload(action);
    }
    if (["SKILL", "CARD", "ABILITY"].includes(type)) return hasContactPayload(action);
    return false;
  }

  function sourceRoleFor(action) {
    const type = actionTypeOf(action);
    const enemySource =
      action?.source === "ENEMY_AUTO_ATTACK" ||
      type === "ENEMY_BEHAVIOR" ||
      String(action?.actorId || "").toUpperCase() === "ENEMY_PRIMARY";
    return enemySource ? "ENEMY_PRIMARY" : "PLAYER";
  }

  function targetRoleFor(action) {
    return sourceRoleFor(action) === "ENEMY_PRIMARY" ? "PLAYER" : "ENEMY_PRIMARY";
  }

  function canonicalGameplayEvent(action, type, overrides = {}) {
    return {
      type,
      actionId: String(action?.actionId || action?.id || ""),
      actionType: String(action?.actionType || action?.type || ""),
      sourceRole: sourceRoleFor(action),
      targetRole: targetRoleFor(action),
      characterId: String(action?.characterId || ""),
      cardId: String(action?.cardId || ""),
      simulationTick: action?.simulationTick === undefined ? undefined : Number(action.simulationTick),
      elapsedMs: action?.elapsedMs === undefined ? undefined : Number(action.elapsedMs),
      ...overrides
    };
  }

  function fromActionEvents(action) {
    if (!action) return [];
    const type = actionTypeOf(action);

    if (action.outcome === "VICTORY" || action.outcome === "DEFEAT") return [];
    if (!isOffensiveAction(action)) return [];

    const events = [];
    const hitList = Array.isArray(action.hits) && action.hits.length > 0 ? action.hits : null;
    const hitCount = hitList
      ? hitList.length
      : Math.max(1, Math.floor(Number(action.hitCount || 1)));

    if (type === "BURST") {
      events.push(canonicalGameplayEvent(action, "BURST_START", {
        actionType: "BURST"
      }));
    } else {
      events.push(canonicalGameplayEvent(action, "ATTACK_START", {
        hitCount
      }));
    }

    if (hitList) {
      hitList.forEach((hit, index) => {
        events.push(canonicalGameplayEvent(action, "DAMAGE_APPLIED", {
          damage: Number(hit?.damage || 0),
          breakDamage: Number(hit?.breakDamage || 0),
          blockAbsorbed: Number(hit?.blockAbsorbed || 0),
          hitIndex: index,
          hitCount,
          simulationTick: action?.simulationTick === undefined ? undefined : Number(action.simulationTick),
          elapsedMs: action?.elapsedMs === undefined ? undefined : Number(action.elapsedMs)
        }));
      });
    } else if (hasContactPayload(action)) {
      events.push(canonicalGameplayEvent(action, "DAMAGE_APPLIED", {
        damage: Number(action?.damage || 0),
        breakDamage: Number(action?.breakDamage || 0),
        blockAbsorbed: Number(action?.blockAbsorbed || 0),
        hitIndex: 0,
        hitCount
      }));
    }

    if (action?.broke) {
      events.push(canonicalGameplayEvent(action, "BREAK_TRIGGER", {
        damage: Number(action?.damage || 0),
        breakDamage: Number(action?.breakDamage || 0)
      }));
    }

    return events;
  }

  function presentationTypeForEvent(type) {
    return PRESENTATION_EVENT_TYPES[String(type || "").toUpperCase()] || null;
  }

  function fromAction(action) {
    if (!action) return null;
    const events = fromActionEvents(action);
    if (events.length) {
      const first = events[0];
      return {
        type: presentationTypeForEvent(first.type),
        phase: first.type,
        action
      };
    }
    if (action.outcome === "VICTORY") return { type: "VICTORY", action };
    if (action.outcome === "DEFEAT") return { type: "DEFEAT", action };
    if (action.intent?.type) return { type: "TELEGRAPH", action };
    return { type: "STATE_CHANGE", action };
  }

  function normalizeHitIndex(value) {
    if (value === undefined) return undefined;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return undefined;
    return Math.max(0, numeric > 0 ? numeric - 1 : 0);
  }

  function contactDelayMsForHitIndex(hitIndex) {
    const index = Math.max(0, Math.floor(Number(hitIndex) || 0));
    return 110 + index * 90;
  }

  function fromCombatEvent(event) {
    if (!event) return null;
    const type = String(event.type || "").toUpperCase();
    const presentationType = presentationTypeForEvent(type);
    if (!presentationType || !["ATTACK_START", "DAMAGE_APPLIED", "BREAK_TRIGGER", "BURST_START"].includes(type)) return null;

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
      blockAbsorbed: Number(event.blockAbsorbed || 0),
      hitIndex: normalizeHitIndex(event.hitIndex),
      hitCount: event.hitCount === undefined ? undefined : Number(event.hitCount)
    });
    return Object.freeze({ type: presentationType, phase: type, action, gameplayEvent: event });
  }

  function create() {
    return Object.freeze({
      fromAction,
      fromActionEvents,
      fromCombatEvent,
      contactDelayMsForHitIndex,
      isKnownType: (type) => TYPES.includes(String(type || "").toUpperCase())
    });
  }

  window.MachGirlsPresentationEvents = Object.freeze({
    TYPES,
    create,
    fromActionEvents,
    contactDelayMsForHitIndex
  });
})();