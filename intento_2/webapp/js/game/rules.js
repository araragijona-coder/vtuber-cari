(() => {
  "use strict";

  const { OUTCOME, PHASE } = window.GameState;
  const { ACTION_TYPES } = window.GameActions;
  const { STATUS_TYPES } = window.StatusSystem;

  function combatantsFor(combat, actorId, targetId) {
    const actor = combat.player.id === actorId ? combat.player : combat.enemy.id === actorId ? combat.enemy : null;
    const target = combat.player.id === targetId ? combat.player : combat.enemy.id === targetId ? combat.enemy : null;
    return { actor, target };
  }

  function cardDefinitionFor(combat, cardId) {
    const baseDefinition = window.CardSystem.definitionFor(cardId);
    const bonus = window.ProgressionSystem?.bonusForCard?.(combat.progression, cardId) || 0;
    if (!baseDefinition) return null;
    if (bonus <= 0 || baseDefinition.type !== window.CardSystem.CARD_TYPES.ATTACK) return baseDefinition;
    return { ...baseDefinition, damage: baseDefinition.damage + bonus };
  }

  function validateAction(state, action) {
    if (!state?.combat) return { valid: false, error: "NO_COMBAT" };
    const combat = state.combat;
    if (combat.outcome !== OUTCOME.IN_PROGRESS) return { valid: false, error: "COMBAT_FINISHED" };
    if (!action || typeof action !== "object") return { valid: false, error: "INVALID_ACTION" };
    const validTypes = Object.values(ACTION_TYPES);
    if (!validTypes.includes(action.type)) return { valid: false, error: "UNKNOWN_ACTION" };
    if (action.turn !== combat.turn) return { valid: false, error: "STALE_TURN" };

    const expectedActorId = combat.activeActor === "player" ? combat.player.id : combat.enemy.id;
    if (action.actorId !== expectedActorId) return { valid: false, error: "WRONG_ACTOR" };

    if (action.type === ACTION_TYPES.END_TURN) {
      if (combat.activeActor !== "player") return { valid: false, error: "END_TURN_PLAYER_ONLY" };
      return { valid: true, actor: combat.player, target: combat.enemy };
    }

    if (action.type === ACTION_TYPES.ABILITY) {
      if (combat.activeActor !== "player") return { valid: false, error: "ABILITY_PLAYER_ONLY" };
      if (!window.CharacterAbilitySystem?.canUse?.(combat)) return { valid: false, error: "ABILITY_UNAVAILABLE" };
      return { valid: true, actor: combat.player, target: combat.enemy };
    }

    const { actor, target } = combatantsFor(combat, action.actorId, action.targetId);
    if (!actor || !target) return { valid: false, error: "INVALID_COMBATANT" };
    if (actor.hp <= 0) return { valid: false, error: "DEAD_ACTOR" };
    if (target.hp <= 0) return { valid: false, error: "DEAD_TARGET" };

    if (action.type === ACTION_TYPES.CARD) {
      if (combat.activeActor !== "player") return { valid: false, error: "CARD_PLAYER_ONLY" };
      if (!action.cardInstanceId || !action.cardId) return { valid: false, error: "INVALID_CARD" };
      const card = window.CardSystem.cardInHand(combat.cards, action.cardInstanceId);
      if (!card || card.cardId !== action.cardId) return { valid: false, error: "CARD_NOT_IN_HAND" };
      const definition = cardDefinitionFor(combat, action.cardId);
      if (!definition) return { valid: false, error: "UNKNOWN_CARD" };
      if (!window.EnergySystem.canSpend(combat.resources, definition.cost)) {
        return { valid: false, error: "INSUFFICIENT_ENERGY" };
      }
      return { valid: true, actor, target, card, definition };
    }

    if (action.type === ACTION_TYPES.DEBUFF && combat.activeActor !== "enemy") {
      return { valid: false, error: "DEBUFF_ENEMY_ONLY" };
    }

    if (action.type === ACTION_TYPES.SKILL && combat.activeActor === "player" && combat.resources.playerSkill <= 0) {
      return { valid: false, error: "SKILL_UNAVAILABLE" };
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

  function baseDamageFor(combat, action, actor, target, definition = null) {
    if (action.type === ACTION_TYPES.DEFEND || action.type === ACTION_TYPES.END_TURN ||
        action.type === ACTION_TYPES.ABILITY || action.type === ACTION_TYPES.DEBUFF) return 0;

    let baseDamage;
    if (action.type === ACTION_TYPES.CARD) {
      baseDamage = definition?.type === window.CardSystem.CARD_TYPES.ATTACK ? definition.damage : 0;
      if (
        baseDamage > 0 &&
        definition?.effects?.conditional === "TARGET_EXPOSED" &&
        window.StatusSystem.has(target, STATUS_TYPES.EXPOSED)
      ) {
        baseDamage += Number(definition.effects.bonus) || 0;
      }
    } else {
      baseDamage = action.type === ACTION_TYPES.SKILL ? actor.stats.skillDamage : actor.stats.atk;
    }

    if (window.StatusSystem.has(actor, STATUS_TYPES.WEAK)) {
      baseDamage *= 0.75;
    }

    return Math.max(0, baseDamage);
  }

  function rollDamage(combat, action, actor, target, definition = null) {
    const balance = balanceForAction(action, definition);
    const baseDamage = baseDamageFor(combat, action, actor, target, definition);
    if (baseDamage <= 0) {
      return {
        damage: 0,
        rawDamage: 0,
        blockAbsorbed: 0,
        critical: false,
        roll: null,
        variance: 1,
        defense: target.stats.def,
        rng: combat.rng
      };
    }

    let rng = combat.rng;
    const varianceRoll = window.CombatRNG.float(
      rng,
      balance.varianceMin,
      balance.varianceMax
    );
    rng = varianceRoll.rng;
    const criticalRoll = window.CombatRNG.chance(
      rng,
      balance.criticalChance
    );
    rng = criticalRoll.rng;

    const defense = Math.max(0, Number(target.stats.def) || 0);
    let rawDamage = Math.max(0, Math.floor(baseDamage * varianceRoll.value) - defense);
    const critical = criticalRoll.value;
    if (critical) rawDamage = Math.floor(rawDamage * balance.criticalMultiplier);

    if (window.StatusSystem.has(target, STATUS_TYPES.EXPOSED)) {
      rawDamage = Math.floor(rawDamage * 1.25);
    }

    rawDamage = rawDamage > 0 ? Math.max(balance.minimumDamage, rawDamage) : 0;

    const existingBlock = Math.max(0, Number(target.block) || 0);
    const blockAbsorbed = Math.min(existingBlock, rawDamage);
    const damage = Math.max(0, rawDamage - blockAbsorbed);

    return {
      damage,
      rawDamage,
      blockAbsorbed,
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
    if (playerDead) return OUTCOME.DEFEAT;
    if (enemyDead) return OUTCOME.VICTORY;
    return OUTCOME.IN_PROGRESS;
  }

  function cardEffectSummary(definition) {
    return definition?.effects || {};
  }

  function resolveAction(state, action) {
    const validation = validateAction(state, action);
    if (!validation.valid) throw new Error(validation.error);

    const combat = state.combat;
    const { actor, target, definition } = validation;
    const targetHpBefore = target.hp;
    const isCardDefense = action.type === ACTION_TYPES.CARD && definition.type === window.CardSystem.CARD_TYPES.DEFENSE;
    const isNonDamage = isCardDefense ||
      action.type === ACTION_TYPES.DEFEND ||
      action.type === ACTION_TYPES.END_TURN ||
      action.type === ACTION_TYPES.ABILITY ||
      action.type === ACTION_TYPES.DEBUFF;

    const damageResult = isNonDamage
      ? {
          damage: 0,
          rawDamage: 0,
          blockAbsorbed: 0,
          critical: false,
          roll: null,
          variance: 1,
          defense: target.stats.def,
          rng: combat.rng
        }
      : rollDamage(combat, action, actor, target, definition);

    const targetHpAfter = Math.max(
      0,
      Math.min(target.maxHp, target.hp - damageResult.damage)
    );
    const projectedCombat = {
      ...combat,
      player: combat.player.id === target.id
        ? { ...combat.player, hp: targetHpAfter }
        : { ...combat.player },
      enemy: combat.enemy.id === target.id
        ? { ...combat.enemy, hp: targetHpAfter }
        : { ...combat.enemy }
    };
    const outcome = checkOutcome(projectedCombat);
    const effects = cardEffectSummary(definition);

    const resolution = {
      actionId: action.id,
      turn: action.turn,
      damage: damageResult.damage,
      rawDamage: damageResult.rawDamage,
      blockAbsorbed: damageResult.blockAbsorbed,
      targetHpBefore,
      targetHpAfter,
      critical: damageResult.critical,
      roll: damageResult.roll,
      variance: damageResult.variance,
      baseDamage: baseDamageFor(combat, action, actor, target, definition),
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
      cardEffects: effects,
      blockGained: action.type === ACTION_TYPES.CARD
        ? Number(effects.block || 0)
        : action.type === ACTION_TYPES.DEFEND ? 4 : 0,
      energyGain: action.type === ACTION_TYPES.CARD
        ? Number(effects.energyGain || 0)
        : 0,
      drawCount: action.type === ACTION_TYPES.CARD
        ? Number(effects.draw || 0)
        : 0,
      statusType: action.type === ACTION_TYPES.CARD
        ? String(effects.applyStatus || "")
        : action.type === ACTION_TYPES.DEBUFF ? STATUS_TYPES.WEAK : "",
      statusTurns: action.type === ACTION_TYPES.CARD
        ? Number(effects.statusTurns || 0)
        : action.type === ACTION_TYPES.DEBUFF ? 2 : 0,
      defendingConsumed: Boolean((target.block || 0) > 0 && damageResult.blockAbsorbed > 0)
    };

    applyResolution(state, resolution);
    return resolution;
  }

  function applyResolution(state, resolution) {
    const combat = state?.combat;
    if (!combat || !resolution) throw new Error("No se puede aplicar una Resolution sin combate.");

    const target = combat.player.id === resolution.targetId
      ? combat.player
      : combat.enemy.id === resolution.targetId
        ? combat.enemy
        : null;
    if (!target) throw new Error("Resolution apunta a un combatiente inexistente.");

    target.hp = Math.max(
      0,
      Math.min(target.maxHp, resolution.targetHpAfter)
    );

    combat.rng = Object.freeze({
      seed: resolution.seed >>> 0,
      state: resolution.rngStateAfter >>> 0
    });

    if (resolution.defendingConsumed) {
      target.block = Math.max(0, Number(target.block || 0) - resolution.blockAbsorbed);
      target.defending = target.block > 0;
    }

    if (resolution.actionType === ACTION_TYPES.CARD) {
      const card = window.CardSystem.cardInHand(combat.cards, resolution.cardInstanceId);
      const definition = window.CardSystem.definitionFor(resolution.cardId);
      if (!card || !definition) throw new Error("CARD_STATE_INVALID");
      if (!window.EnergySystem.spend(combat.resources, definition.cost)) {
        throw new Error("INSUFFICIENT_ENERGY");
      }
      if (!window.CardSystem.playCard(combat.cards, resolution.cardInstanceId)) {
        throw new Error("CARD_MOVE_FAILED");
      }

      const cardTarget = definition.type === window.CardSystem.CARD_TYPES.DEFENSE
        ? combat.player
        : combat.enemy;

      if (resolution.blockGained > 0) {
        combat.player.block += resolution.blockGained;
        combat.player.defending = combat.player.block > 0;
      }
      if (resolution.energyGain !== 0) {
        combat.resources.energy = Math.min(
          combat.resources.maxEnergy,
          Math.max(0, combat.resources.energy + resolution.energyGain)
        );
      }
      if (resolution.statusType && resolution.statusTurns > 0) {
        window.StatusSystem.apply(cardTarget, resolution.statusType, resolution.statusTurns);
      }
      if (resolution.drawCount > 0) {
        window.CardSystem.drawCards(combat.cards, resolution.drawCount);
      }
    }

    if (resolution.actionType === ACTION_TYPES.DEFEND) {
      actorBlock(combat, resolution.actorId, resolution.blockGained);
    }

    if (resolution.actionType === ACTION_TYPES.DEBUFF) {
      window.StatusSystem.apply(
        combat.player,
        STATUS_TYPES.WEAK,
        resolution.statusTurns || 2
      );
    }

    if (resolution.actionType === ACTION_TYPES.ABILITY) {
      window.CharacterAbilitySystem.apply(combat);
    }

    if (resolution.actionType === ACTION_TYPES.SKILL && combat.player.id === resolution.actorId) {
      combat.resources.playerSkill = Math.max(0, combat.resources.playerSkill - 1);
    }

    combat.lastAction = Object.freeze({ ...resolution });

    if (resolution.outcome !== OUTCOME.IN_PROGRESS) {
      combat.outcome = resolution.outcome;
      combat.phase = resolution.outcome === OUTCOME.VICTORY ? PHASE.VICTORY : PHASE.DEFEAT;
      state.screen = "BATTLE_RESULT";
      state.session.lastMessage = resolution.outcome === OUTCOME.VICTORY
        ? "VICTORY · enemigo derrotado."
        : "DEFEAT · jugador derrotado.";
      if (resolution.outcome === OUTCOME.VICTORY) state.player.wins += 1;
      else state.player.losses += 1;
      return state;
    }

    if (resolution.actionType === ACTION_TYPES.END_TURN) {
      combat.phase = PHASE.ENEMY_TURN;
      combat.activeActor = "enemy";
      state.session.lastMessage = "ENEMY TURN · resolviendo intención anunciada.";
      return state;
    }

    const legacySingleAction =
      combat.activeActor === "player" &&
      [ACTION_TYPES.ATTACK, ACTION_TYPES.DEFEND, ACTION_TYPES.SKILL].includes(resolution.actionType);

    if (legacySingleAction) {
      combat.phase = PHASE.ENEMY_TURN;
      combat.activeActor = "enemy";
      state.session.lastMessage = "ENEMY TURN · resolución de compatibilidad.";
      return state;
    }

    if (combat.activeActor === "enemy") {
      window.StatusSystem.tick(combat.player);
      window.StatusSystem.tick(combat.enemy);
      combat.turn += 1;
      combat.phase = PHASE.PLAYER_TURN;
      combat.activeActor = "player";
      window.CardSystem.drawCards(combat.cards, 1);
      window.EnergySystem.refill(combat.resources);
      combat.enemyIntent = window.EnemyAI?.previewIntent?.(combat) || null;
      combat.enemy.intent = combat.enemyIntent;
      state.session.lastMessage = "PLAYER TURN · turno " + combat.turn + ".";
      return state;
    }

    combat.phase = PHASE.PLAYER_TURN;
    combat.activeActor = "player";
    state.session.lastMessage = "PLAYER TURN · podés seguir jugando cartas.";
    return state;
  }

  function actorBlock(combat, actorId, amount) {
    const actor = combat.player.id === actorId ? combat.player : combat.enemy.id === actorId ? combat.enemy : null;
    if (!actor) return;
    actor.block = Math.max(0, Number(actor.block || 0) + Math.max(0, Number(amount) || 0));
    actor.defending = actor.block > 0;
  }

  window.CombatEngine = Object.freeze({
    validateAction,
    resolveAction,
    applyResolution,
    checkOutcome,
    rollDamage,
    baseDamageFor
  });
})();