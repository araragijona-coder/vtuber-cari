(() => {
  "use strict";

  const { OUTCOME, PHASE } = window.GameState;
  const { ACTION_TYPES } = window.GameActions;

  function combatantsFor(combat, actorId, targetId) {
    const actor = combat.player.id === actorId ? combat.player : combat.enemy.id === actorId ? combat.enemy : null;
    const target = combat.player.id === targetId ? combat.player : combat.enemy.id === targetId ? combat.enemy : null;
    return { actor, target };
  }

  function validateAction(state, action) {
    if (!state?.combat) return { valid: false, error: "NO_COMBAT" };
    const combat = state.combat;
    if (combat.outcome !== OUTCOME.IN_PROGRESS) return { valid: false, error: "COMBAT_FINISHED" };
    if (!action || typeof action !== "object") return { valid: false, error: "INVALID_ACTION" };
    if (![ACTION_TYPES.ATTACK, ACTION_TYPES.DEFEND, ACTION_TYPES.SKILL, ACTION_TYPES.CARD].includes(action.type)) {
      return { valid: false, error: "UNKNOWN_ACTION" };
    }
    if (action.turn !== combat.turn) return { valid: false, error: "STALE_TURN" };

    const expectedActorId = combat.activeActor === "player" ? combat.player.id : combat.enemy.id;
    if (action.actorId !== expectedActorId) return { valid: false, error: "WRONG_ACTOR" };

    const { actor, target } = combatantsFor(combat, action.actorId, action.targetId);
    if (!actor || !target) return { valid: false, error: "INVALID_COMBATANT" };
    if (actor.hp <= 0) return { valid: false, error: "DEAD_ACTOR" };
    if (target.hp <= 0) return { valid: false, error: "DEAD_TARGET" };

    if (action.type === ACTION_TYPES.SKILL && combat.activeActor === "player" && combat.resources.playerSkill <= 0) {
      return { valid: false, error: "SKILL_UNAVAILABLE" };
    }

    if (action.type === ACTION_TYPES.CARD) {
      if (combat.activeActor !== "player") return { valid: false, error: "CARD_PLAYER_ONLY" };
      if (!action.cardInstanceId || !action.cardId) return { valid: false, error: "INVALID_CARD" };
      const card = window.CardSystem.cardInHand(combat.cards, action.cardInstanceId);
      if (!card || card.cardId !== action.cardId) return { valid: false, error: "CARD_NOT_IN_HAND" };
      const baseDefinition = window.CardSystem.definitionFor(action.cardId);
      const bonus = window.ProgressionSystem?.bonusForCard?.(combat.progression, action.cardId) || 0;
      const definition = baseDefinition && bonus > 0 ? { ...baseDefinition, damage: baseDefinition.damage + bonus } : baseDefinition;
      if (!definition) return { valid: false, error: "UNKNOWN_CARD" };
      if (!window.EnergySystem.canSpend(combat.resources, definition.cost)) return { valid: false, error: "INSUFFICIENT_ENERGY" };
      return { valid: true, actor, target, card, definition };
    }

    return { valid: true, actor, target };
  }

  function balanceForAction(action, definition = null) {
    if (action.type === ACTION_TYPES.CARD && definition) {
      return Object.freeze({
        ...window.CombatBalance.BALANCE.damage,
        ...window.CombatBalance.card(definition.id)
      });
    }
    return window.CombatBalance.BALANCE.damage;
  }

  function baseDamageFor(action, actor, definition = null) {
    if (action.type === ACTION_TYPES.DEFEND) return 0;
    if (action.type === ACTION_TYPES.CARD) return definition.type === ACTION_TYPES.ATTACK ? definition.damage : 0;
    return action.type === ACTION_TYPES.SKILL ? actor.stats.skillDamage : actor.stats.atk;
  }

  function rollDamage(combat, action, actor, target, definition = null) {
    const balance = balanceForAction(action, definition);
    const baseDamage = Math.max(0, baseDamageFor(action, actor, definition));
    if (baseDamage <= 0) {
      return {
        damage: 0, critical: false, roll: null, variance: 1, defense: target.stats.def,
        rng: combat.rng
      };
    }

    let rng = combat.rng;
    const varianceRoll = window.CombatRNG.float(rng, balance.varianceMin, balance.varianceMax);
    rng = varianceRoll.rng;
    const criticalRoll = window.CombatRNG.chance(rng, balance.criticalChance);
    rng = criticalRoll.rng;

    const defense = Math.max(0, Number(target.stats.def) || 0);
    let rawDamage = Math.max(0, Math.floor(baseDamage * varianceRoll.value) - defense);
    const critical = criticalRoll.value;
    if (critical) rawDamage = Math.floor(rawDamage * balance.criticalMultiplier);

    if (target.defending) {
      rawDamage = Math.floor(rawDamage * (balance.defendingMultiplier ?? 0.5));
    }

    const damage = rawDamage > 0 ? Math.max(balance.minimumDamage, rawDamage) : 0;
    return {
      damage,
      critical,
      roll: criticalRoll.roll,
      variance: varianceRoll.value,
      defense,
      rng
    };
  }

  function checkOutcome(combat) {
    const playerDead = combat.player.hp <= 0;
    const enemyDead = combat.enemy.hp <= 0;
    if (playerDead && enemyDead) return OUTCOME.DEFEAT;
    if (enemyDead) return OUTCOME.VICTORY;
    if (playerDead) return OUTCOME.DEFEAT;
    return OUTCOME.IN_PROGRESS;
  }

  function resolveAction(state, action) {
    const validation = validateAction(state, action);
    if (!validation.valid) throw new Error(validation.error);

    const combat = state.combat;
    const { actor, target, definition } = validation;
    const targetHpBefore = target.hp;
    const isCardDefense = action.type === ACTION_TYPES.CARD && definition.type === ACTION_TYPES.DEFEND;
    const damageResult = isCardDefense || action.type === ACTION_TYPES.DEFEND
      ? { damage: 0, critical: false, roll: null, variance: 1, defense: target.stats.def, rng: combat.rng }
      : rollDamage(combat, action, actor, target, definition);

    const targetHpAfter = Math.max(0, Math.min(target.maxHp, target.hp - damageResult.damage));
    const projectedCombat = {
      ...combat,
      player: combat.player.id === target.id ? { ...combat.player, hp: targetHpAfter } : { ...combat.player },
      enemy: combat.enemy.id === target.id ? { ...combat.enemy, hp: targetHpAfter } : { ...combat.enemy }
    };
    const outcome = checkOutcome(projectedCombat);

    const resolution = Object.freeze({
      actionId: action.id,
      turn: action.turn,
      damage: damageResult.damage,
      targetHpBefore,
      targetHpAfter,
      critical: damageResult.critical,
      roll: damageResult.roll,
      variance: damageResult.variance,
      baseDamage: baseDamageFor(action, actor, definition),
      defense: damageResult.defense,
      seed: combat.seed,
      rngStateBefore: combat.rng.state,
      rngStateAfter: damageResult.rng.state,
      outcome,
      actionType: action.type,
      actorId: actor.id,
      targetId: target.id,
      cardId: action.cardId,
      cardInstanceId: action.cardInstanceId,
      defendingConsumed: Boolean(target.defending && damageResult.damage > 0)
    });

    applyResolution(state, resolution);
    return resolution;
  }

  function applyResolution(state, resolution) {
    const combat = state?.combat;
    if (!combat || !resolution) throw new Error("No se puede aplicar una Resolution sin combate.");
    const target = combat.player.id === resolution.targetId ? combat.player : combat.enemy.id === resolution.targetId ? combat.enemy : null;
    if (!target) throw new Error("Resolution apunta a un combatiente inexistente.");

    target.hp = Math.max(0, Math.min(target.maxHp, resolution.targetHpAfter));
    combat.rng = window.CombatRNG.create(resolution.seed);
    combat.rng = Object.freeze({ seed: resolution.seed >>> 0, state: resolution.rngStateAfter >>> 0 });

    if (resolution.actionType === ACTION_TYPES.CARD) {
      const card = window.CardSystem.cardInHand(combat.cards, resolution.cardInstanceId);
      const definition = window.CardSystem.definitionFor(resolution.cardId);
      if (!card || !definition) throw new Error("CARD_STATE_INVALID");
      if (!window.EnergySystem.spend(combat.resources, definition.cost)) throw new Error("INSUFFICIENT_ENERGY");
      if (!window.CardSystem.playCard(combat.cards, resolution.cardInstanceId)) throw new Error("CARD_MOVE_FAILED");
    }

    if (resolution.actionType === ACTION_TYPES.DEFEND ||
        (resolution.actionType === ACTION_TYPES.CARD && resolution.cardId === "escudo_dark")) {
      const actor = combat.player.id === resolution.actorId ? combat.player : combat.enemy;
      actor.defending = true;
    } else if (resolution.defendingConsumed) {
      target.defending = false;
    }

    if (resolution.actionType === ACTION_TYPES.SKILL && combat.player.id === resolution.actorId) {
      combat.resources.playerSkill = Math.max(0, combat.resources.playerSkill - 1);
    }

    combat.lastAction = resolution;
    if (resolution.outcome !== OUTCOME.IN_PROGRESS) {
      combat.outcome = resolution.outcome;
      combat.phase = resolution.outcome === OUTCOME.VICTORY ? PHASE.VICTORY : PHASE.DEFEAT;
      state.screen = "BATTLE_RESULT";
      state.session.lastMessage = resolution.outcome === OUTCOME.VICTORY ? "VICTORY · enemigo derrotado." : "DEFEAT · jugador derrotado.";
      if (resolution.outcome === OUTCOME.VICTORY) state.player.wins += 1;
      else state.player.losses += 1;
      return state;
    }

    if (combat.activeActor === "player") {
      combat.phase = PHASE.ENEMY_TURN;
      combat.activeActor = "enemy";
      state.session.lastMessage = "Turno enemigo.";
    } else {
      combat.turn += 1;
      combat.phase = PHASE.PLAYER_TURN;
      combat.activeActor = "player";
      window.CardSystem.drawCards(combat.cards, 1);
      window.EnergySystem.refill(combat.resources);
      state.session.lastMessage = "Turno " + combat.turn + " · turno del jugador.";
    }
    return state;
  }

  window.CombatEngine = Object.freeze({
    validateAction,
    resolveAction,
    applyResolution,
    checkOutcome,
    rollDamage
  });
})();