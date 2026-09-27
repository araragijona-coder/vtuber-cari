(() => {
  "use strict";

  const { OUTCOME, PHASE } = window.GameState;
  const { ACTION_TYPES } = window.GameActions;

  function combatantsFor(combat, actorId, targetId) {
    const actor = combat.player.id === actorId ? combat.player
      : combat.enemy.id === actorId ? combat.enemy : null;
    const target = combat.player.id === targetId ? combat.player
      : combat.enemy.id === targetId ? combat.enemy : null;
    return { actor, target };
  }

  function validateAction(state, action) {
    if (!state?.combat) return { valid: false, error: "NO_COMBAT" };
    const combat = state.combat;
    if (combat.outcome !== OUTCOME.IN_PROGRESS) return { valid: false, error: "COMBAT_FINISHED" };
    if (!action || typeof action !== "object") return { valid: false, error: "INVALID_ACTION" };
    if (![ACTION_TYPES.ATTACK, ACTION_TYPES.DEFEND, ACTION_TYPES.SKILL].includes(action.type)) {
      return { valid: false, error: "UNKNOWN_ACTION" };
    }
    if (action.turn !== combat.turn) return { valid: false, error: "STALE_TURN" };

    const expectedActorId = combat.activeActor === "player" ? combat.player.id : combat.enemy.id;
    if (action.actorId !== expectedActorId) return { valid: false, error: "WRONG_ACTOR" };

    const { actor, target } = combatantsFor(combat, action.actorId, action.targetId);
    if (!actor || !target) return { valid: false, error: "INVALID_COMBATANT" };
    if (actor.hp <= 0) return { valid: false, error: "DEAD_ACTOR" };
    if (target.hp <= 0) return { valid: false, error: "DEAD_TARGET" };

    if (action.type === ACTION_TYPES.SKILL &&
        combat.activeActor === "player" &&
        combat.resources.playerSkill <= 0) {
      return { valid: false, error: "SKILL_UNAVAILABLE" };
    }

    return { valid: true, actor, target };
  }

  function calculateDamage(action, actor, target) {
    if (action.type === ACTION_TYPES.DEFEND) return 0;
    const raw = action.type === ACTION_TYPES.SKILL ? actor.stats.skillDamage : actor.stats.atk;
    return Math.max(1, raw - target.stats.def);
  }

  function checkOutcome(combat) {
    const playerDead = combat.player.hp <= 0;
    const enemyDead = combat.enemy.hp <= 0;

    // MVP tie-break: simultaneous KO resolves as player defeat.
    if (playerDead && enemyDead) return OUTCOME.DEFEAT;
    if (enemyDead) return OUTCOME.VICTORY;
    if (playerDead) return OUTCOME.DEFEAT;
    return OUTCOME.IN_PROGRESS;
  }

  function resolveAction(state, action) {
    const validation = validateAction(state, action);
    if (!validation.valid) throw new Error(validation.error);

    const combat = state.combat;
    const { actor, target } = validation;
    const targetHpBefore = target.hp;
    let damage = calculateDamage(action, actor, target);
    const critical = false;
    let targetHpAfter = targetHpBefore;

    if (action.type !== ACTION_TYPES.DEFEND) {
      const multiplier = target.defending ? 0.5 : 1;
      damage = Math.max(1, Math.floor(damage * multiplier));
      targetHpAfter = Math.max(0, Math.min(target.maxHp, target.hp - damage));
    }

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

    const resolution = Object.freeze({
      actionId: action.id,
      turn: action.turn,
      damage,
      targetHpBefore,
      targetHpAfter,
      critical,
      outcome,
      actionType: action.type,
      actorId: actor.id,
      targetId: target.id
    });

    applyResolution(state, resolution);
    return resolution;
  }

  function applyResolution(state, resolution) {
    const combat = state?.combat;
    if (!combat || !resolution) throw new Error("No se puede aplicar una Resolution sin combate.");

    const target = combat.player.id === resolution.targetId ? combat.player
      : combat.enemy.id === resolution.targetId ? combat.enemy : null;
    if (!target) throw new Error("Resolution apunta a un combatiente inexistente.");

    target.hp = Math.max(0, Math.min(target.maxHp, resolution.targetHpAfter));

    if (resolution.actionType === ACTION_TYPES.DEFEND) {
      const actor = combat.player.id === resolution.actorId ? combat.player : combat.enemy;
      actor.defending = true;
    } else {
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
      state.session.lastMessage = resolution.outcome === OUTCOME.VICTORY
        ? "VICTORY · enemigo derrotado."
        : "DEFEAT · jugador derrotado.";
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
      state.session.lastMessage = "Turno " + combat.turn + " · turno del jugador.";
    }
    return state;
  }

  window.CombatEngine = Object.freeze({
    validateAction,
    resolveAction,
    applyResolution,
    checkOutcome
  });
})();