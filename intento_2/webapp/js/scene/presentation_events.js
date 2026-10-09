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

  const EVENT_TYPES = Object.freeze({
    ATTACK_START: "ATTACK",
    DAMAGE_APPLIED: "IMPACT",
    BREAK_TRIGGER: "BREAK",
    BURST_START: "BURST"
  });

  function actionTypeOf(action) {
    return String(action?.actionType || action?.type || "").toUpperCase();
  }

  function fromAction(action) {
    if (!action) return null;
    const type = actionTypeOf(action);

    if (action.outcome === "VICTORY") return { type: "VICTORY", action };
    if (action.outcome === "DEFEAT") return { type: "DEFEAT", action };
    if (type === "BURST") return { type: "BURST", action };
    if (action.broke) return { type: "BREAK", action };

    if (type === "ENEMY_BEHAVIOR" && action.intent?.type) {
      const intent = String(action.intent.type || "").toUpperCase();
      if (intent === "ATTACK") return { type: "ATTACK", action };
      if (intent === "DEFEND" || intent === "DEBUFF") return { type: "TELEGRAPH", action };
      return { type: "STATE_CHANGE", action };
    }

    if (Number(action.damage || 0) > 0 || Number(action.blockAbsorbed || 0) > 0) {
      return { type: "IMPACT", action };
    }

    if (type === "AUTO_ATTACK" || type === "SKILL" || type === "CARD" || type === "ABILITY" || type === "ENEMY_BEHAVIOR") {
      return { type: "ATTACK", action };
    }
    if (action.intent?.type) return { type: "TELEGRAPH", action };
    return { type: "STATE_CHANGE", action };
  }

  function actorRole(action, combat) {
    const actorId = String(action?.actorId || action?.sourceId || "");
    if (
      actorId === String(combat?.enemy?.id || "") ||
      action?.source === "ENEMY_AUTO_ATTACK" ||
      actionTypeOf(action) === "ENEMY_BEHAVIOR"
    ) return "ENEMY_PRIMARY";
    return "PLAYER";
  }

  function targetRole(action, combat, sourceRole) {
    const targetId = String(action?.targetId || action?.target || "");
    if (
      targetId === String(combat?.player?.id || "") ||
      targetId === "PLAYER"
    ) return "PLAYER";
    if (
      targetId === String(combat?.enemy?.id || "") ||
      targetId === "ENEMY_PRIMARY"
    ) return "ENEMY_PRIMARY";
    return "ENEMY_PRIMARY";
  }

  function normalizeAction(action, combat, options = {}) {
    const type = actionTypeOf(action);
    const sourceRole = options.sourceRole || action?.sourceRole || actorRole(action, combat);
    const resolvedTargetRole = options.targetRole || action?.targetRole || targetRole(action, combat, sourceRole);
    const hitIndex = Object.prototype.hasOwnProperty.call(options, "hitIndex")
      ? Math.max(0, Number(options.hitIndex) || 0)
      : Number.isFinite(Number(action?.hitIndex)) ? Math.max(0, Number(action.hitIndex)) : 0;
    const hitCount = Math.max(1, Math.floor(Number(options.hitCount ?? action?.hitCount ?? 1) || 1));

    return Object.freeze({
      ...(action || {}),
      actionId: String(action?.actionId || action?.id || ""),
      actionType: type,
      actorId: sourceRole,
      targetId: resolvedTargetRole,
      sourceRole,
      targetRole: resolvedTargetRole,
      source: String(action?.source || sourceRole),
      cardId: String(action?.cardId || ""),
      characterId: String(action?.characterId || combat?.player?.identity?.characterId || combat?.characterId || ""),
      damage: Number(options.damage ?? action?.damage ?? 0),
      blockAbsorbed: Number(options.blockAbsorbed ?? action?.blockAbsorbed ?? 0),
      breakDamage: Number(options.breakDamage ?? action?.breakDamage ?? 0),
      damageReductionApplied: Number(options.damageReductionApplied ?? action?.damageReductionApplied ?? 0),
      critical: Boolean(options.critical ?? action?.critical),
      hitIndex,
      hitCount
    });
  }

  function wrapEvent(type, action, combat, options = {}) {
    const normalized = normalizeAction(action, combat, options);
    return Object.freeze({
      type,
      phase: String(options.phase || type),
      action: normalized,
      gameplayEvent: options.gameplayEvent || action,
      contactDelayMs: Number.isFinite(Number(options.contactDelayMs))
        ? Math.max(0, Number(options.contactDelayMs))
        : undefined
    });
  }

  function fromCombatEvent(event, combat) {
    if (!event) return null;
    const type = String(event.type || "").toUpperCase();
    const presentationType = EVENT_TYPES[type];
    if (!presentationType) return null;

    // Runtime gameplay events currently publish multi-hit indices as 1-based.
    // Normalize exactly once at this boundary; fromActionEvents already emits 0-based indices.
    const rawHitIndex = event.hitIndex === undefined ? 0 : Number(event.hitIndex);
    const hitIndex = event.hitIndex === undefined || rawHitIndex <= 0
      ? 0
      : Math.max(0, Math.floor(rawHitIndex) - 1);
    const hitCount = Math.max(1, Math.floor(Number(event.hitCount || 1)));
    const action = normalizeAction(event, combat, {
      sourceRole: String(event.sourceRole || ""),
      targetRole: String(event.targetRole || ""),
      hitIndex,
      hitCount
    });

    return Object.freeze({
      type: presentationType,
      phase: type,
      action,
      gameplayEvent: event,
      contactDelayMs: presentationType === "IMPACT" ? 110 + (hitCount > 1 ? hitIndex * 90 : 0) : undefined
    });
  }

  function fromActionEvents(action, combat, options = {}) {
    if (!action) return [];
    const actionType = actionTypeOf(action);
    const definitionType = String(options.definition?.type || "").toUpperCase();
    const intentType = String(action.intent?.type || "").toUpperCase();
    const hits = Array.isArray(action.hits) ? action.hits : [];
    const hasContactPayload =
      Number(action.damage || 0) > 0 ||
      Number(action.blockAbsorbed || 0) > 0 ||
      Number(action.breakDamage || 0) > 0 ||
      hits.length > 0;
    const explicitlyNonAttack = Boolean(options.nonAttack) ||
      ((actionType === "SKILL" || actionType === "CARD") &&
        Boolean(definitionType) &&
        definitionType !== "ATTACK" &&
        !hasContactPayload) ||
      (actionType === "ABILITY" && !hasContactPayload);

    if (action.outcome === "VICTORY" || action.outcome === "DEFEAT") {
      return [wrapEvent(action.outcome === "VICTORY" ? "VICTORY" : "DEFEAT", action, combat)];
    }

    if (actionType === "ENEMY_BEHAVIOR" && intentType && intentType !== "ATTACK") {
      return [wrapEvent(intentType === "DEFEND" || intentType === "DEBUFF" ? "TELEGRAPH" : "STATE_CHANGE", action, combat)];
    }

    const burst = actionType === "BURST";
    const attack =
      !burst &&
      !explicitlyNonAttack &&
      (
        actionType === "AUTO_ATTACK" ||
        (actionType === "ENEMY_BEHAVIOR" && (!intentType || intentType === "ATTACK")) ||
        ((actionType === "SKILL" || actionType === "CARD") &&
          (definitionType === "ATTACK" || hasContactPayload)) ||
        (actionType === "ABILITY" && hasContactPayload)
      );

    const events = [];
    if (burst) {
      events.push(wrapEvent("BURST", action, combat));
    } else if (attack) {
      events.push(wrapEvent("ATTACK", action, combat, {
        hitCount: Math.max(1, hits.length || Number(action.hitCount || 1))
      }));
    }

    if (hits.length > 0 && !explicitlyNonAttack) {
      const hitCount = hits.length;
      hits.forEach((hit, index) => {
        const rawIndex = hit?.hitIndex !== undefined
          ? Number(hit.hitIndex)
          : hit?.index !== undefined
            ? Math.max(0, Number(hit.index) - 1)
            : index;
        const hitIndex = Math.max(0, Math.floor(Number.isFinite(rawIndex) ? rawIndex : index));
        const perHitAction = {
          ...action,
          damage: Number(hit?.damage || 0),
          blockAbsorbed: Number(hit?.blockAbsorbed || 0),
          breakDamage: Number(hit?.breakDamage || 0),
          damageReductionApplied: Number(hit?.damageReductionApplied || 0),
          critical: Boolean(hit?.critical)
        };
        events.push(wrapEvent("IMPACT", perHitAction, combat, {
          hitIndex,
          hitCount,
          damage: perHitAction.damage,
          blockAbsorbed: perHitAction.blockAbsorbed,
          breakDamage: perHitAction.breakDamage,
          damageReductionApplied: perHitAction.damageReductionApplied,
          critical: perHitAction.critical,
          contactDelayMs: 110 + hitIndex * 90,
          gameplayEvent: perHitAction
        }));
      });
    } else if (hasContactPayload && !explicitlyNonAttack) {
      const fallbackType = fromAction(action)?.type;
      if (attack || burst || fallbackType === "IMPACT" || Number(action.breakDamage || 0) > 0) {
        events.push(wrapEvent("IMPACT", action, combat, {
          hitIndex: 0,
          hitCount: 1,
          contactDelayMs: 110
        }));
      }
    }

    if (action.broke) {
      events.push(wrapEvent("BREAK", action, combat));
    }

    if (events.length === 0) {
      const legacy = fromAction(action);
      const suppressLegacyAttack =
        String(legacy?.type || "").toUpperCase() === "ATTACK" &&
        (
          explicitlyNonAttack ||
          ((actionType === "SKILL" || actionType === "CARD" || actionType === "ABILITY") && !attack)
        );
      if (explicitlyNonAttack && ["ATTACK", "IMPACT", "BREAK", "BURST"].includes(String(legacy?.type || "").toUpperCase())) {
        events.push(wrapEvent("STATE_CHANGE", action, combat));
      } else if (legacy && !suppressLegacyAttack) {
        events.push(wrapEvent(legacy.type, action, combat));
      } else if (explicitlyNonAttack || suppressLegacyAttack) {
        events.push(wrapEvent("STATE_CHANGE", action, combat));
      }
    }

    return events;
  }

  function create() {
    return Object.freeze({
      fromAction,
      fromActionEvents,
      fromCombatEvent,
      isKnownType: (type) => TYPES.includes(String(type || "").toUpperCase())
    });
  }

  window.MachGirlsPresentationEvents = Object.freeze({ TYPES, create });
})();