(() => {
  "use strict";

  const { OUTCOME, PHASE } = window.GameState;
  const { ACTION_TYPES } = window.GameActions;
  const { STATUS_TYPES } = window.StatusSystem;

  function cardDefinitionFor(combat, cardId) {
    const base = window.CardSystem.definitionFor(cardId);
    if (!base) return null;
    const bonus = window.ProgressionSystem?.bonusForCard?.(combat.progression, cardId) || 0;
    if (bonus <= 0 || base.type !== window.CardSystem.CARD_TYPES.ATTACK) return base;
    return { ...base, damage: Number(base.damage) + Number(bonus) };
  }

  function resolveTarget(combat, actor, definition, targetId) {
    const targeting = definition?.targeting || "single_enemy";
    const requested = String(targetId || "");
    if (targeting === "self" || targeting === "single_ally") {
      return actor.id === combat.player.id ? combat.player : null;
    }
    if (targeting === "single_enemy" || targeting === "enemy_group") {
      return requested === combat.enemy.id ? combat.enemy : null;
    }
    return null;
  }

  function validateSkillAction(state, action) {
    const combat = state?.combat;
    if (!combat) return { valid: false, error: "NO_COMBAT" };
    if (combat.outcome !== OUTCOME.IN_PROGRESS) return { valid: false, error: "COMBAT_FINISHED" };
    if (!action || typeof action !== "object") return { valid: false, error: "INVALID_ACTION" };
    if (![ACTION_TYPES.SKILL, ACTION_TYPES.CARD].includes(action.type)) return { valid: false, error: "NOT_A_SKILL" };
    if (action.actorId !== combat.player.id) return { valid: false, error: "WRONG_ACTOR" };

    const card = window.CardSystem.cardInHand(combat.cards, action.cardInstanceId);
    if (!card || card.cardId !== action.cardId) return { valid: false, error: "CARD_NOT_IN_HAND" };

    const definition = cardDefinitionFor(combat, action.cardId);
    if (!definition) return { valid: false, error: "UNKNOWN_CARD" };

    const cooldown = Number(combat.cooldowns[action.cardId] || 0);
    if (cooldown > 0) return { valid: false, error: "SKILL_COOLDOWN" };

    if (!window.EnergySystem.canSpend(combat.resources, definition.cost)) {
      return { valid: false, error: "INSUFFICIENT_ENERGY" };
    }

    const target = resolveTarget(combat, combat.player, definition, action.targetId);
    if (!target || target.hp <= 0) return { valid: false, error: "INVALID_TARGET" };

    return { valid: true, combat, actor: combat.player, target, card, definition };
  }

  function rollDamage(combat, actor, target, definition, overrides = {}) {
    let rng = combat.rng;
    const baseDefinition = definition || {};
    const balance = {
      varianceMin: Number(overrides.varianceMin ?? baseDefinition.varianceMin ?? 1),
      varianceMax: Number(overrides.varianceMax ?? baseDefinition.varianceMax ?? 1),
      criticalChance: Number(overrides.criticalChance ?? baseDefinition.criticalChance ?? 0),
      criticalMultiplier: Number(overrides.criticalMultiplier ?? baseDefinition.criticalMultiplier ?? 1.5)
    };

    let baseDamage = Math.max(0, Number(overrides.damage ?? baseDefinition.damage ?? 0));
    if (window.StatusSystem.has(actor, STATUS_TYPES.WEAK)) {
      baseDamage *= 0.75;
    }
    if (window.BurstSystem.isActive(combat) && target === combat.enemy) {
      baseDamage *= window.BurstSystem.multiplier(combat);
    }

    const variance = window.CombatRNG.float(rng, balance.varianceMin, balance.varianceMax);
    rng = variance.rng;
    const criticalRoll = window.CombatRNG.chance(rng, balance.criticalChance);
    rng = criticalRoll.rng;

    const defense = Math.max(0, Number(target.stats?.def) || 0);
    let rawDamage = Math.max(0, Math.floor(baseDamage * variance.value) - defense);
    if (criticalRoll.value) rawDamage = Math.floor(rawDamage * balance.criticalMultiplier);
    if (window.StatusSystem.has(target, STATUS_TYPES.EXPOSED)) {
      rawDamage = Math.floor(rawDamage * 1.25);
    }
    rawDamage = rawDamage > 0 ? Math.max(1, rawDamage) : 0;

    const block = Math.max(0, Number(target.block || 0));
    const blockAbsorbed = Math.min(block, rawDamage);
    const damage = Math.max(0, rawDamage - blockAbsorbed);

    return {
      damage,
      rawDamage,
      blockAbsorbed,
      critical: Boolean(criticalRoll.value),
      variance: variance.value,
      defense,
      rng
    };
  }

  function applyDamage(target, result) {
    const hpBefore = target.hp;
    target.hp = Math.max(0, Math.min(target.maxHp, target.hp - result.damage));
    if (result.blockAbsorbed > 0) {
      target.block = Math.max(0, Number(target.block || 0) - result.blockAbsorbed);
      if (target.block <= 0) {
        target.block = 0;
        target.defending = false;
        target.blockRemainingMs = 0;
      }
    }
    return { hpBefore, hpAfter: target.hp };
  }

  function applyBreak(combat, target, amount) {
    if (target !== combat.enemy) return { applied: 0, broke: false };
    return window.BreakSystem.applyImpact(
      target.breakState,
      amount,
      combat.simulationTick
    );
  }

  function finishIfNeeded(state) {
    const combat = state.combat;
    if (combat.player.hp <= 0) {
      combat.outcome = OUTCOME.DEFEAT;
      combat.phase = PHASE.DEFEAT;
      state.screen = "BATTLE_RESULT";
      state.session.lastMessage = "DEFEAT · la presión automática superó tus defensas.";
      return true;
    }
    if (combat.enemy.hp <= 0) {
      combat.outcome = OUTCOME.VICTORY;
      combat.phase = PHASE.VICTORY;
      state.screen = "BATTLE_RESULT";
      state.session.lastMessage = "VICTORY · enemigo destruido.";
      return true;
    }
    return false;
  }

  function makeResolution(combat, action, data) {
    return {
      actionId: action.id,
      actionType: action.type,
      actorId: action.actorId,
      targetId: action.targetId,
      cardId: action.cardId || "",
      cardInstanceId: action.cardInstanceId || "",
      simulationTick: combat.simulationTick,
      elapsedMs: combat.elapsedMs,
      seed: combat.seed,
      ...data,
      outcome: combat.outcome
    };
  }

  function resolveAttack(state, action, options = {}) {
    const combat = state.combat;
    const actor = action.actorId === combat.player.id ? combat.player : combat.enemy;
    const target = action.targetId === combat.player.id ? combat.player : combat.enemy;
    const definition = options.definition || {
      damage: options.damage ?? actor.stats.atk,
      breakDamage: options.breakDamage ?? 0,
      varianceMin: options.varianceMin ?? 1,
      varianceMax: options.varianceMax ?? 1,
      criticalChance: options.criticalChance ?? 0,
      criticalMultiplier: options.criticalMultiplier ?? 1.25
    };
    const rngStateBefore = combat.rng.state;
    const result = rollDamage(combat, actor, target, definition, options);
    combat.rng = Object.freeze({
      seed: combat.seed >>> 0,
      state: result.rng.state >>> 0
    });

    const hp = applyDamage(target, result);
    const breakResult = applyBreak(
      combat,
      target,
      Number(options.breakDamage ?? definition.breakDamage ?? 0)
    );

    finishIfNeeded(state);

    const resolution = makeResolution(combat, action, {
      damage: result.damage,
      rawDamage: result.rawDamage,
      blockAbsorbed: result.blockAbsorbed,
      hpBefore: hp.hpBefore,
      hpAfter: hp.hpAfter,
      targetHpAfter: hp.hpAfter,
      critical: result.critical,
      variance: result.variance,
      defense: result.defense,
      breakDamage: breakResult.applied,
      broke: breakResult.broke,
      burst: window.BurstSystem.isActive(combat),
      rngStateBefore,
      rngStateAfter: result.rng.state
    });

    combat.lastAction = Object.freeze({ ...resolution });
    return resolution;
  }

  function resolveEnemyAttack(combat, action, damage) {
    return resolveAttack(
      { combat, screen: "BATTLE", session: {} },
      action,
      {
        damage,
        breakDamage: Math.max(0, Math.floor(Number(damage) * 0.5)),
        varianceMin: 0.95,
        varianceMax: 1.05,
        criticalChance: 0.05,
        criticalMultiplier: 1.25
      }
    );
  }

  function resolveAutoAttack(combat, actor, target, config, source) {
    const action = window.GameActions.createAction({
      id: "auto-" + combat.simulationTick + "-" + actor.id + "-" + source,
      type: ACTION_TYPES.AUTO_ATTACK,
      actorId: actor.id,
      targetId: target.id,
      simulationTick: combat.simulationTick,
      source
    });
    return resolveAttack(
      { combat, screen: "BATTLE", session: {} },
      action,
      {
        damage: config.damage,
        breakDamage: config.breakDamage,
        varianceMin: config.varianceMin ?? 1,
        varianceMax: config.varianceMax ?? 1,
        criticalChance: config.criticalChance ?? 0,
        criticalMultiplier: config.criticalMultiplier ?? 1.25
      }
    );
  }

  function resolveSkill(state, action) {
    const validation = validateSkillAction(state, action);
    if (!validation.valid) throw new Error(validation.error);

    const combat = state.combat;
    const { actor, target, card, definition } = validation;
    const energyBefore = combat.resources.energy;
    const rngStateBefore = combat.rng.state;
    const skillMeta = window.SkillResolver.resolve({ combat, actor, target, definition });

    if (!window.EnergySystem.spend(combat.resources, definition.cost)) {
      throw new Error("INSUFFICIENT_ENERGY");
    }

    let damage = 0;
    let rawDamage = 0;
    let blockAbsorbed = 0;
    let critical = false;
    let variance = 1;
    let breakResult = { applied: 0, broke: false };

    if (definition.type === window.CardSystem.CARD_TYPES.ATTACK) {
      const rolled = rollDamage(combat, actor, target, {
        ...definition,
        damage: Number(definition.damage) + (
          skillMeta.conditionalTriggered ? Number(definition.effects?.bonus || 0) : 0
        )
      });
      combat.rng = Object.freeze({
        seed: combat.seed >>> 0,
        state: rolled.rng.state >>> 0
      });
      const hp = applyDamage(target, rolled);
      damage = rolled.damage;
      rawDamage = rolled.rawDamage;
      blockAbsorbed = rolled.blockAbsorbed;
      critical = rolled.critical;
      variance = rolled.variance;
      breakResult = applyBreak(combat, target, definition.breakDamage);
      void hp;
    } else {
      if (skillMeta.blockGained > 0) {
        actor.block += skillMeta.blockGained;
        actor.blockRemainingMs = Math.max(actor.blockRemainingMs, skillMeta.blockDurationMs);
        actor.defending = true;
      }
      if (skillMeta.energyGain > 0) {
        window.EnergySystem.gain(combat.resources, skillMeta.energyGain);
      }
      if (skillMeta.statusApplied) {
        const receiver = definition.targeting === "self" ? actor : target;
        window.StatusSystem.apply(receiver, skillMeta.statusApplied, skillMeta.statusDurationMs);
      }
      if (skillMeta.drawCount > 0) {
        window.CardSystem.drawCards(combat.cards, skillMeta.drawCount);
      }
      if (skillMeta.breakDamage > 0) {
        breakResult = applyBreak(combat, target, skillMeta.breakDamage);
      }
    }

    window.CardSystem.playCard(combat.cards, card.instanceId);
    window.CardSystem.refillHand(combat.cards);
    combat.cooldowns[action.cardId] = Number(definition.cooldownMs || 0);

    finishIfNeeded(state);

    const resolution = makeResolution(combat, action, {
      cost: definition.cost,
      energyBefore,
      energyAfter: currentEnergy(combat),
      damage,
      rawDamage,
      blockAbsorbed,
      critical,
      variance,
      breakDamage: breakResult.applied,
      broke: breakResult.broke,
      burst: window.BurstSystem.isActive(combat),
      targetHpAfter: target.hp,
      targetBlock: target.block,
      statusApplied: skillMeta.statusApplied,
      statusDurationMs: skillMeta.statusDurationMs,
      drawCount: skillMeta.drawCount,
      conditionalTriggered: skillMeta.conditionalTriggered,
      rngStateBefore,
      rngStateAfter: combat.rng.state
    });

    combat.lastAction = Object.freeze({ ...resolution });
    return resolution;
  }

  function resolveAbility(state, action) {
    const combat = state.combat;
    if (!window.CharacterAbilitySystem.canUse(combat)) throw new Error("ABILITY_UNAVAILABLE");
    const energyBefore = combat.resources.energy;
    const result = window.CharacterAbilitySystem.apply(combat);
    const resolution = makeResolution(combat, action, {
      cost: 0,
      energyBefore,
      energyAfter: currentEnergy(combat),
      damage: 0,
      breakDamage: 0,
      statusApplied: result.statusApplied,
      statusDurationMs: result.statusDurationMs,
      drawCount: result.cardsDrawn,
      rngStateBefore: combat.rng.state,
      rngStateAfter: combat.rng.state
    });
    combat.lastAction = Object.freeze({ ...resolution });
    return resolution;
  }

  function resolveAction(state, action) {
    if (!state?.combat) throw new Error("NO_COMBAT");
    if (action?.type === ACTION_TYPES.END_TURN) throw new Error("LEGACY_TURN_FLOW_DISABLED");
    if ([ACTION_TYPES.SKILL, ACTION_TYPES.CARD].includes(action?.type)) return resolveSkill(state, action);
    if (action?.type === ACTION_TYPES.ABILITY) return resolveAbility(state, action);
    if (action?.type === ACTION_TYPES.AUTO_ATTACK) {
      return resolveAutoAttack(
        state.combat,
        state.combat.player,
        state.combat.enemy,
        state.combat.player.autoAttack,
        "PLAYER_AUTO_ATTACK"
      );
    }
    throw new Error("UNKNOWN_ACTION");
  }

  function validateAction(state, action) {
    if (!state?.combat) return { valid: false, error: "NO_COMBAT" };
    if (state.combat.outcome !== OUTCOME.IN_PROGRESS) return { valid: false, error: "COMBAT_FINISHED" };
    if (action?.type === ACTION_TYPES.END_TURN) return { valid: false, error: "LEGACY_TURN_FLOW_DISABLED" };
    if ([ACTION_TYPES.SKILL, ACTION_TYPES.CARD].includes(action?.type)) return validateSkillAction(state, action);
    if (action?.type === ACTION_TYPES.ABILITY) {
      return window.CharacterAbilitySystem.canUse(state.combat)
        ? { valid: true, actor: state.combat.player, target: state.combat.enemy }
        : { valid: false, error: "ABILITY_UNAVAILABLE" };
    }
    return { valid: false, error: "INVALID_ACTION" };
  }

  function advanceCombat(state, stepInfo) {
    const combat = state?.combat;
    if (!combat || combat.outcome !== OUTCOME.IN_PROGRESS) return;

    const stepMs = Number(stepInfo?.stepMs || window.CombatClock.DEFAULT_STEP_MS);
    combat.simulationTick = Number(stepInfo?.tick ?? (combat.simulationTick + 1));
    combat.elapsedMs = Number(stepInfo?.elapsedMs ?? (combat.elapsedMs + stepMs));
    combat.turn = Math.floor(combat.elapsedMs / 1000) + 1;

    window.StatusSystem.advance(combat.player, stepMs);
    window.StatusSystem.advance(combat.enemy, stepMs);

    for (const cardId of Object.keys(combat.cooldowns)) {
      combat.cooldowns[cardId] = Math.max(0, Number(combat.cooldowns[cardId]) - stepMs);
      if (combat.cooldowns[cardId] <= 0) delete combat.cooldowns[cardId];
    }

    for (const fighter of [combat.player, combat.enemy]) {
      if (fighter.block > 0) {
        fighter.blockRemainingMs = Math.max(0, Number(fighter.blockRemainingMs || 0) - stepMs);
        if (fighter.blockRemainingMs <= 0) {
          fighter.block = 0;
          fighter.defending = false;
        }
      }
    }

    const breakEnded = window.BreakSystem.advance(combat.enemy.breakState, stepMs);
    if (breakEnded) combat.burstWindowEndedAt = combat.elapsedMs;

    const baseRegen = Number(window.CombatBalance.BALANCE.energy.regenPerSecond);
    combat.resources.energyRegen = baseRegen * window.BurstSystem.energyRegenMultiplier(combat);
    window.EnergySystem.regenerate(combat.resources, stepMs);
    combat.resources.energyRegen = baseRegen;

    if (!window.BreakSystem.isBroken(combat.enemy.breakState)) {
      window.AutoAttackSystem.advance(combat.enemy.autoAttack, stepMs, () => {
        resolveAutoAttack(
          combat,
          combat.enemy,
          combat.player,
          combat.enemy.autoAttack,
          "ENEMY_AUTO_ATTACK"
        );
      });
    }
    if (combat.outcome !== OUTCOME.IN_PROGRESS) return;

    window.AutoAttackSystem.advance(combat.player.autoAttack, stepMs, () => {
      resolveAutoAttack(
        combat,
        combat.player,
        combat.enemy,
        combat.player.autoAttack,
        "PLAYER_AUTO_ATTACK"
      );
    });
    if (combat.outcome !== OUTCOME.IN_PROGRESS) return;

    const intentExecuted = window.EnemyBehaviorSystem.update(combat, stepMs);
    if (intentExecuted) {
      const resolution = window.EnemyBehaviorSystem.resolveIntent(combat, intentExecuted);
      combat.lastAction = Object.freeze({
        ...(resolution || {}),
        actionType: ACTION_TYPES.ENEMY_BEHAVIOR,
        simulationTick: combat.simulationTick,
        elapsedMs: combat.elapsedMs,
        outcome: combat.outcome
      });
      if (combat.outcome === OUTCOME.IN_PROGRESS) {
        combat.enemyIntent = window.EnemyBehaviorSystem.previewIntent(combat);
        combat.enemy.intent = combat.enemyIntent;
      }
      return;
    }

    if (combat.cards.hand.length < combat.cards.handLimit && combat.elapsedMs % 700 === 0) {
      window.CardSystem.drawCard(combat.cards);
    }
  }

  function advanceTime(state, deltaMs) {
    const combat = state?.combat;
    if (!combat || combat.outcome !== OUTCOME.IN_PROGRESS) return 0;
    return window.CombatClock.advance(
      combat.clock,
      deltaMs,
      (stepInfo) => advanceCombat(state, stepInfo)
    );
  }

  function step(state) {
    return advanceTime(state, window.CombatClock.DEFAULT_STEP_MS);
  }

  window.CombatEngine = Object.freeze({
    cardDefinitionFor,
    resolveTarget,
    validateAction,
    resolveAction,
    resolveSkill,
    resolveEnemyAttack,
    resolveAutoAttack,
    rollDamage,
    checkOutcome: (combat) => {
      if (combat.player.hp <= 0) return OUTCOME.DEFEAT;
      if (combat.enemy.hp <= 0) return OUTCOME.VICTORY;
      return OUTCOME.IN_PROGRESS;
    },
    advanceCombat,
    advanceTime,
    step
  });
})();