(() => {
  "use strict";

  const { OUTCOME, PHASE } = window.GameState;
  const { ACTION_TYPES } = window.GameActions;
  const { STATUS_TYPES } = window.StatusSystem;

  function currentEnergy(combat) {
    return Number(combat?.resources?.currentEnergy ?? combat?.resources?.energy ?? 0);
  }

  function syncEnergy(combat) {
    if (combat?.resources) window.EnergySystem.sync(combat.resources);
    return currentEnergy(combat);
  }

  function emitCombatEvent(combat, type, payload = {}) {
    if (!Array.isArray(combat.events)) combat.events = [];
    const event = Object.freeze({
      type: String(type),
      tick: Number(combat.simulationTick || 0),
      elapsedMs: Number(combat.elapsedMs || 0),
      ...payload
    });
    combat.events.push(event);
    return event;
  }

  function syncBurst(combat) {
    if (window.BurstSystem?.sync) window.BurstSystem.sync(combat);
    return combat?.resources?.burstCharge ?? 0;
  }

  function presentationRoles(combat, action) {
    const sourceRole = String(action?.actorId || "") === String(combat?.enemy?.id || "")
      ? "ENEMY_PRIMARY"
      : "PLAYER";
    const targetRole = String(action?.targetId || "") === String(combat?.player?.id || "")
      ? "PLAYER"
      : "ENEMY_PRIMARY";
    return { sourceRole, targetRole };
  }

  function emitAttackStart(combat, action, extra = {}) {
    const roles = presentationRoles(combat, action);
    return emitCombatEvent(combat, "ATTACK_START", {
      actionId: String(action?.id || ""),
      actionType: String(action?.type || ""),
      sourceRole: roles.sourceRole,
      targetRole: roles.targetRole,
      simulationTick: Number(combat.simulationTick || 0),
      elapsedMs: Number(combat.elapsedMs || 0),
      characterId: String(combat?.player?.identity?.characterId || combat?.characterId || ""),
      ...(action?.cardId ? { cardId: String(action.cardId) } : {}),
      ...(extra.hitCount !== undefined ? { hitCount: Number(extra.hitCount) } : {})
    });
  }

  function emitDamageApplied(combat, action, result = {}) {
    const roles = presentationRoles(combat, action);
    return emitCombatEvent(combat, "DAMAGE_APPLIED", {
      actionId: String(action?.id || ""),
      actionType: String(action?.type || ""),
      sourceRole: roles.sourceRole,
      targetRole: roles.targetRole,
      simulationTick: Number(combat.simulationTick || 0),
      elapsedMs: Number(combat.elapsedMs || 0),
      ...(combat?.player?.identity?.characterId || combat?.characterId
        ? { characterId: String(combat?.player?.identity?.characterId || combat?.characterId) }
        : {}),
      ...(action?.cardId ? { cardId: String(action.cardId) } : {}),
      damage: Number(result.damage || 0),
      breakDamage: Number(result.breakDamage || 0),
      ...(result.hitIndex !== undefined ? { hitIndex: Number(result.hitIndex) } : {}),
      ...(result.hitCount !== undefined ? { hitCount: Number(result.hitCount) } : {})
    });
  }

  function emitBreakTrigger(combat, action, result = {}) {
    const roles = presentationRoles(combat, action);
    return emitCombatEvent(combat, "BREAK_TRIGGER", {
      actionId: String(action?.id || ""),
      actionType: String(action?.type || ""),
      sourceRole: roles.sourceRole,
      targetRole: roles.targetRole,
      simulationTick: Number(combat.simulationTick || 0),
      elapsedMs: Number(combat.elapsedMs || 0),
      ...(combat?.player?.identity?.characterId || combat?.characterId
        ? { characterId: String(combat?.player?.identity?.characterId || combat?.characterId) }
        : {}),
      ...(action?.cardId ? { cardId: String(action.cardId) } : {}),
      damage: Number(result.damage || 0),
      breakDamage: Number(result.breakDamage || 0)
    });
  }

  function emitEffectEvent(combat, type, payload = {}) {
    const event = emitCombatEvent(combat, type, payload);
    try {
      window.RocketBunnyTelemetry?.combatEffect?.(combat, type, payload);
    } catch (error) {
      void error;
    }
    return event;
  }

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
    const damageOutMultiplier = window.ModifierSystem?.damageOutMultiplier?.(actor) || 1;
    if (window.StatusSystem.has(actor, STATUS_TYPES.WEAK)) baseDamage *= 0.75;
    baseDamage *= damageOutMultiplier;
    if (
      window.BurstSystem.isActive(combat) &&
      target === combat.enemy &&
      !overrides.ignoreBreakMultiplier
    ) {
      baseDamage *= window.BurstSystem.multiplier(combat);
    }

    const variance = window.CombatRNG.float(rng, balance.varianceMin, balance.varianceMax);
    rng = variance.rng;
    const criticalRoll = window.CombatRNG.chance(rng, balance.criticalChance);
    rng = criticalRoll.rng;

    const defense = Math.max(0, Number(target.stats?.def) || 0);
    let rawDamage = Math.max(0, Math.floor(baseDamage * variance.value) - defense);
    if (criticalRoll.value) rawDamage = Math.floor(rawDamage * balance.criticalMultiplier);
    if (window.StatusSystem.has(target, STATUS_TYPES.EXPOSED)) rawDamage = Math.floor(rawDamage * 1.25);
    rawDamage = rawDamage > 0 ? Math.max(1, rawDamage) : 0;

    const reductionFraction = window.ModifierSystem?.damageReductionFraction?.(target) || 0;
    const mitigatedDamage = rawDamage > 0
      ? Math.max(1, Math.floor(rawDamage * (1 - reductionFraction)))
      : 0;
    const damageReductionApplied = Math.max(0, rawDamage - mitigatedDamage);
    const block = Math.max(0, Number(target.block || 0));
    const blockAbsorbed = Math.min(block, mitigatedDamage);
    const damage = Math.max(0, mitigatedDamage - blockAbsorbed);

    return {
      damage,
      rawDamage,
      mitigatedDamage,
      blockAbsorbed,
      damageReductionApplied,
      damageReductionFraction: reductionFraction,
      damageOutMultiplier,
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
    const result = window.BreakSystem.applyImpact(
      target.breakState,
      amount,
      combat.simulationTick
    );
    combat.enemy.breakCurrent = target.breakState.current;
    combat.enemy.breakMax = target.breakState.max;
    if (result.broke) {
      window.BurstSystem.gain(
        combat,
        Number(window.CombatBalance.BALANCE.burst.breakCharge || 0)
      );
      emitCombatEvent(combat, "break_started", {
        breakDamage: result.applied,
        breakWindowMs: target.breakState.windowMs
      });
    }
    return result;
  }

  function logPlayerInput(combat, action) {
    if (!Array.isArray(combat.inputLog)) combat.inputLog = [];
    combat.inputLog.push({
      tick: combat.simulationTick,
      elapsedMs: combat.elapsedMs,
      actionType: action.type,
      cardId: action.cardId || "",
      cardInstanceId: action.cardInstanceId || "",
      source: action.source || "PLAYER"
    });
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
      source: action.source || "",
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
    emitAttackStart(combat, action);
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

    emitDamageApplied(combat, action, {
      damage: result.damage,
      breakDamage: breakResult.applied
    });
    if (breakResult.broke) {
      emitBreakTrigger(combat, action, {
        damage: result.damage,
        breakDamage: breakResult.applied
      });
    }

    if (actor === combat.player) {
      window.BurstSystem.gain(
        combat,
        Math.max(0, breakResult.applied * 1.5 + result.damage * 0.25)
      );
    } else if (target === combat.player && result.damage > 0) {
      window.BurstSystem.gain(combat, result.damage * 0.5);
    }
    syncBurst(combat);
    finishIfNeeded(state);

    const resolution = makeResolution(combat, action, {
      damage: result.damage,
      rawDamage: result.rawDamage,
      blockAbsorbed: result.blockAbsorbed,
      damageReductionApplied: result.damageReductionApplied,
      damageReductionFraction: result.damageReductionFraction,
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

    if (action.source === "PLAYER_AUTO_ATTACK") {
      window.BurstSystem.gain(
        combat,
        Number(window.CombatBalance.BALANCE.burst.playerAutoCharge || 0)
      );
    }
    if (target === combat.player && result.damage > 0) {
      window.BurstSystem.gain(
        combat,
        Number(window.CombatBalance.BALANCE.burst.incomingDamageCharge || 0)
      );
    }

    combat.lastAction = Object.freeze({ ...resolution });
    return resolution;
  }

  function resolveEnemyAttack(combat, action, damage) {
    const resolution = resolveAttack(
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
    emitCombatEvent(combat, "enemy_attack_resolved", {
      damage: resolution.damage,
      blockAbsorbed: resolution.blockAbsorbed || 0
    });
    return resolution;
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
    const energyBefore = currentEnergy(combat);
    const rngStateBefore = combat.rng.state;
    const skillMeta = window.SkillResolver.resolve({ combat, actor, target, definition });

    if (!window.EnergySystem.spend(combat.resources, definition.cost)) throw new Error("INSUFFICIENT_ENERGY");

    combat.inputLog.push(Object.freeze({
      type: "SKILL",
      cardId: definition.cardId,
      tick: combat.simulationTick,
      elapsedMs: combat.elapsedMs
    }));
    emitCombatEvent(combat, "energy_spent", {
      source: "skill",
      cardId: definition.cardId,
      amount: definition.cost,
      remaining: combat.resources.energy
    });
    window.BurstSystem.gain(combat, Math.max(3, definition.cost * 0.18));

    let damage = 0;
    let rawDamage = 0;
    let blockAbsorbed = 0;
    let critical = false;
    let varianceTotal = 0;
    let varianceCount = 0;
    let breakResult = { applied: 0, broke: false };
    let multiHitResults = [];

    if (definition.type === window.CardSystem.CARD_TYPES.ATTACK) {
      const multiHit = skillMeta.multiHit;
      const hitCount = Math.max(1, Math.floor(Number(multiHit?.hits || 1)));
      emitAttackStart(combat, action, { hitCount });

      for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
        const hitDamage = Number(multiHit?.damagePerHit ?? definition.damage ?? 0);
        const hitBreak = Number(multiHit?.breakDamagePerHit ?? definition.breakDamage ?? 0);
        const rolled = rollDamage(combat, actor, target, { ...definition, damage: hitDamage, breakDamage: hitBreak });
        combat.rng = Object.freeze({ seed: combat.seed >>> 0, state: rolled.rng.state >>> 0 });
        const hp = applyDamage(target, rolled);
        const appliedBreak = applyBreak(combat, target, hitBreak);

        emitDamageApplied(combat, action, {
          damage: rolled.damage,
          breakDamage: appliedBreak.applied,
          hitIndex: hitIndex + 1,
          hitCount
        });
        if (appliedBreak.broke) {
          emitBreakTrigger(combat, action, {
            damage: rolled.damage,
            breakDamage: appliedBreak.applied
          });
        }

        damage += rolled.damage;
        rawDamage += rolled.rawDamage;
        blockAbsorbed += rolled.blockAbsorbed;
        critical = critical || rolled.critical;
        varianceTotal += rolled.variance;
        varianceCount += 1;
        breakResult = {
          applied: breakResult.applied + appliedBreak.applied,
          broke: breakResult.broke || appliedBreak.broke
        };
        multiHitResults.push({
          index: hitIndex + 1,
          damage: rolled.damage,
          rawDamage: rolled.rawDamage,
          blockAbsorbed: rolled.blockAbsorbed,
          damageReductionApplied: rolled.damageReductionApplied,
          breakDamage: appliedBreak.applied,
          critical: rolled.critical,
          variance: rolled.variance,
          hpAfter: hp.hpAfter
        });

        if (appliedBreak.broke || hp.hpAfter <= 0) break;
      }

      if (multiHitResults.length > 1) {
        emitEffectEvent(combat, "multi_hit", {
          cardId: definition.cardId,
          hitCount: multiHitResults.length,
          totalDamage: damage,
          totalBreakDamage: breakResult.applied
        });
      }
    } else {
      if (skillMeta.blockGained > 0) {
        actor.block += skillMeta.blockGained;
        actor.blockRemainingMs = Math.max(actor.blockRemainingMs, skillMeta.blockDurationMs);
        actor.defending = true;
      }
      if (skillMeta.energyGain > 0) window.EnergySystem.gain(combat.resources, skillMeta.energyGain);
      if (skillMeta.statusApplied) {
        const receiver = definition.effects?.statusTarget === "enemy"
          ? combat.enemy
          : definition.targeting === "self" ? actor : target;
        window.StatusSystem.applyTimedMs(receiver, skillMeta.statusApplied, skillMeta.statusDurationMs);
      }
      if (skillMeta.drawCount > 0) window.CardSystem.drawCards(combat.cards, skillMeta.drawCount);
      if (skillMeta.breakDamage > 0) {
        breakResult = applyBreak(combat, target, skillMeta.breakDamage);
        if (breakResult.broke) {
          emitBreakTrigger(combat, action, {
            damage: 0,
            breakDamage: breakResult.applied
          });
        }
      }

      if (skillMeta.healAmount > 0) {
        const healTarget = window.CombatEngine?.resolveTarget?.(combat, actor, definition, action.targetId) || actor;
        const heal = window.CombatEffects.applyHeal(healTarget, skillMeta.healAmount);
        emitEffectEvent(combat, "heal_applied", {
          cardId: definition.cardId, targetId: healTarget.id,
          requested: heal.requested, amount: heal.amount,
          hpBefore: heal.hpBefore, hpAfter: heal.hpAfter
        });
        skillMeta.healApplied = heal.amount;
      }

      if (skillMeta.buff) {
        const buffTarget = window.CombatEngine?.resolveTarget?.(combat, actor, definition, action.targetId) || actor;
        const buff = window.CombatEffects.applyBuff(buffTarget, { ...skillMeta.buff, sourceId: definition.cardId });
        skillMeta.buffApplied = buff ? {
          type: buff.type, amount: buff.amount, durationMs: buff.durationMs, stacking: "replace"
        } : null;
        emitEffectEvent(combat, "buff_applied", {
          cardId: definition.cardId, targetId: buffTarget.id,
          type: buff?.type || skillMeta.buff.type || "DAMAGE_OUT",
          amount: buff?.amount ?? skillMeta.buff.amount ?? 0,
          durationMs: buff?.durationMs ?? skillMeta.buff.durationMs ?? 0,
          stacking: "replace"
        });
      }

      if (skillMeta.cleanseTypes.length > 0) {
        const cleanseTarget = window.CombatEngine?.resolveTarget?.(combat, actor, definition, action.targetId) || actor;
        const removed = window.CombatEffects.applyCleanse(cleanseTarget, skillMeta.cleanseTypes);
        skillMeta.cleanseRemoved = [...removed];
        emitEffectEvent(combat, "cleanse", {
          cardId: definition.cardId, targetId: cleanseTarget.id,
          requested: [...skillMeta.cleanseTypes], removed: [...removed]
        });
      }

      if (skillMeta.damageReduction) {
        const reductionTarget = window.CombatEngine?.resolveTarget?.(combat, actor, definition, action.targetId) || actor;
        const reduction = window.CombatEffects.applyDamageReduction(reductionTarget, {
          ...skillMeta.damageReduction, sourceId: definition.cardId
        });
        skillMeta.damageReductionApplied = reduction ? {
          type: reduction.type, amount: reduction.amount, durationMs: reduction.durationMs, stacking: "replace"
        } : null;
        emitEffectEvent(combat, "damage_reduction_applied", {
          cardId: definition.cardId, targetId: reductionTarget.id,
          amount: reduction?.amount ?? skillMeta.damageReduction.amount ?? 0,
          durationMs: reduction?.durationMs ?? skillMeta.damageReduction.durationMs ?? 0,
          stacking: "replace"
        });
      }
    }

    window.CardSystem.playCard(combat.cards, card.instanceId);
    const recycleBefore = Number(combat.cards.recycleCount || 0);
    window.CardSystem.refillHand(combat.cards);
    if (Number(combat.cards.recycleCount || 0) > recycleBefore) {
      emitCombatEvent(combat, "deck_recycled", { recycleCount: Number(combat.cards.recycleCount || 0) });
    }
    combat.cooldowns[action.cardId] = Number(definition.cooldownMs || 0);

    window.BurstSystem.gain(combat, Number(window.CombatBalance.BALANCE.burst.skillCharge || 0));
    logPlayerInput(combat, action);
    finishIfNeeded(state);

    const resolution = makeResolution(combat, action, {
      cost: definition.cost,
      energyBefore,
      energyAfter: syncEnergy(combat),
      damage,
      rawDamage,
      blockAbsorbed,
      critical,
      variance: varianceCount > 0 ? varianceTotal / varianceCount : 1,
      breakDamage: breakResult.applied,
      broke: breakResult.broke,
      burst: window.BurstSystem.isActive(combat),
      targetHpAfter: target.hp,
      targetBlock: target.block,
      statusApplied: skillMeta.statusApplied,
      statusDurationMs: skillMeta.statusDurationMs,
      drawCount: skillMeta.drawCount,
      conditionalTriggered: skillMeta.conditionalTriggered,
      healAmount: skillMeta.healApplied || 0,
      buffApplied: skillMeta.buffApplied || null,
      cleanseRemoved: skillMeta.cleanseRemoved || [],
      damageReductionApplied: skillMeta.damageReductionApplied || null,
      hits: multiHitResults.length > 1 ? multiHitResults : null,
      hitCount: multiHitResults.length || 0,
      rngStateBefore,
      rngStateAfter: combat.rng.state
    });

    combat.lastAction = Object.freeze({ ...resolution });
    return resolution;
  }

  function resolveBurst(state, action) {
    const combat = state?.combat;
    if (!combat) throw new Error("NO_COMBAT");
    if (!window.BurstSystem.canUse(combat)) throw new Error("BURST_UNAVAILABLE");

    const target = combat.enemy;
    const chargeBefore = window.BurstSystem.chargeOf(combat);
    const wasBroken = window.BurstSystem.isActive(combat);
    emitCombatEvent(combat, "BURST_START", {
      actionId: String(action?.id || ""),
      actionType: "BURST",
      sourceRole: "PLAYER",
      targetRole: "ENEMY_PRIMARY",
      simulationTick: Number(combat.simulationTick || 0),
      elapsedMs: Number(combat.elapsedMs || 0),
      characterId: String(combat?.player?.identity?.characterId || combat?.characterId || "")
    });
    window.BurstSystem.activate(combat);

    const rngStateBefore = combat.rng.state;
    const baseDamage = Number(window.CombatBalance.BALANCE.burst.damage || 32) *
      (wasBroken ? Number(window.CombatBalance.BALANCE.burst.brokenMultiplier || 1.35) : 1);
    const result = rollDamage(
      combat,
      combat.player,
      target,
      {
        damage: baseDamage,
        breakDamage: Number(window.CombatBalance.BALANCE.burst.breakDamage || 24),
        varianceMin: 1,
        varianceMax: 1,
        criticalChance: 0,
        criticalMultiplier: 1,
        ignoreBreakMultiplier: true
      }
    );

    combat.rng = Object.freeze({
      seed: combat.seed >>> 0,
      state: result.rng.state >>> 0
    });

    const hp = applyDamage(target, result);
    const breakResult = applyBreak(
      combat,
      target,
      Number(window.CombatBalance.BALANCE.burst.breakDamage || 24)
    );

    emitDamageApplied(combat, action, {
      damage: result.damage,
      breakDamage: breakResult.applied
    });
    if (breakResult.broke) {
      emitBreakTrigger(combat, action, {
        damage: result.damage,
        breakDamage: breakResult.applied
      });
    }

    finishIfNeeded(state);

    const resolution = makeResolution(combat, action, {
      actionType: ACTION_TYPES.BURST,
      cost: 0,
      chargeBefore,
      chargeAfter: window.BurstSystem.chargeOf(combat),
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
      burst: true,
      brokenPayoff: wasBroken,
      rngStateBefore,
      rngStateAfter: result.rng.state
    });

    logPlayerInput(combat, action);
    combat.lastAction = Object.freeze({ ...resolution });
    return resolution;
  }

  function resolveAbility(state, action) {
    const combat = state.combat;
    if (!window.CharacterAbilitySystem.canUse(combat)) throw new Error("ABILITY_UNAVAILABLE");
    const energyBefore = currentEnergy(combat);
    const result = window.CharacterAbilitySystem.apply(combat);
    logPlayerInput(combat, action);
    const resolution = makeResolution(combat, action, {
      cost: 0,
      energyBefore,
      energyAfter: syncEnergy(combat),
      damage: 0,
      breakDamage: 0,
      statusApplied: result.statusApplied,
      statusDurationMs: result.statusDurationMs,
      drawCount: result.cardsDrawn,
      rngStateBefore: combat.rng.state,
      rngStateAfter: combat.rng.state
    });
    emitCombatEvent(combat, "ability_used", {
      abilityId: result.abilityId,
      energyRemaining: combat.resources.energy
    });
    combat.lastAction = Object.freeze({ ...resolution });
    return resolution;
  }

  function resolveAction(state, action) {
    if (!state?.combat) throw new Error("NO_COMBAT");
    if (action?.type === ACTION_TYPES.END_TURN) throw new Error("LEGACY_TURN_FLOW_DISABLED");
    if ([ACTION_TYPES.SKILL, ACTION_TYPES.CARD].includes(action?.type)) return resolveSkill(state, action);
    if (action?.type === ACTION_TYPES.ABILITY) return resolveAbility(state, action);
    if (action?.type === ACTION_TYPES.BURST) return resolveBurst(state, action);
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
    if (action?.type === ACTION_TYPES.BURST) {
      return window.BurstSystem.canUse(state.combat)
        ? { valid: true, actor: state.combat.player, target: state.combat.enemy }
        : { valid: false, error: "BURST_UNAVAILABLE" };
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

    for (const fighter of [combat.player, combat.enemy]) {
      const expired = window.ModifierSystem?.advance?.(fighter, stepMs) || [];
      for (const modifier of expired) {
        emitEffectEvent(combat, "modifier_expired", {
          targetId: fighter.id,
          modifierType: modifier.type,
          sourceId: modifier.sourceId,
          amount: modifier.amount
        });
        combat.lastAction = Object.freeze({
          actionId: "modifier-expired-" + combat.simulationTick + "-" + fighter.id + "-" + modifier.type,
          actionType: "MODIFIER_EXPIRED",
          actorId: fighter.id,
          targetId: fighter.id,
          simulationTick: combat.simulationTick,
          elapsedMs: combat.elapsedMs,
          modifierType: modifier.type,
          amount: modifier.amount,
          outcome: combat.outcome
        });
      }
    }

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
    if (breakEnded) {
      combat.burstWindowEndedAt = combat.elapsedMs;
      emitCombatEvent(combat, "break_ended", { breakMax: combat.enemy.breakState.max });
      combat.lastAction = Object.freeze({
        actionId: "break-end-" + combat.simulationTick,
        actionType: "BREAK_END",
        actorId: combat.enemy.id,
        targetId: combat.enemy.id,
        simulationTick: combat.simulationTick,
        elapsedMs: combat.elapsedMs,
        damage: 0,
        breakDamage: 0,
        outcome: combat.outcome
      });
    }
    combat.enemy.breakCurrent = combat.enemy.breakState.current;
    combat.enemy.breakMax = combat.enemy.breakState.max;

    window.BurstSystem.gain(combat, Number(window.CombatBalance.BALANCE.burst.passiveChargePerTick || 0));

    const baseRegen = Number(window.CombatBalance.BALANCE.energy.regenPerSecond);
    combat.resources.energyRegen = baseRegen * window.BurstSystem.energyRegenMultiplier(combat);
    window.EnergySystem.regenerate(combat.resources, stepMs);
    combat.resources.energyRegen = baseRegen;
    syncEnergy(combat);

    if (!window.BreakSystem.isBroken(combat.enemy.breakState)) {
      window.AutoAttackSystem.advance(combat.enemy.autoAttack, stepMs, () => {
        resolveAutoAttack(combat, combat.enemy, combat.player, combat.enemy.autoAttack, "ENEMY_AUTO_ATTACK");
      });
    }
    if (combat.outcome !== OUTCOME.IN_PROGRESS) return;

    window.AutoAttackSystem.advance(combat.player.autoAttack, stepMs, () => {
      resolveAutoAttack(combat, combat.player, combat.enemy, combat.player.autoAttack, "PLAYER_AUTO_ATTACK");
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
        combat.enemyIntent = null;
        combat.enemy.intent = null;
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
    activateBurst: (state) => resolveBurst(
      state,
      window.GameActions.createPlayerBurstAction(state)
    ),
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