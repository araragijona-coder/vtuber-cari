(() => {
  "use strict";

  const ACTION_TYPES = Object.freeze({
    ATTACK: "ATTACK",
    DEFEND: "DEFEND",
    DEBUFF: "DEBUFF"
  });

  function createState() {
    return {
      behaviorIndex: 0,
      cooldownMs: 0,
      intervalMs: Number(window.CombatBalance.BALANCE.timing.enemyIntentIntervalMs || 1800),
      telegraphMs: Number(window.CombatBalance.BALANCE.timing.enemyTelegraphMs || 1200),
      currentIntent: null
    };
  }

  function canUse(enemy, type) {
    return Array.isArray(enemy?.availableActions) && enemy.availableActions.includes(type);
  }

  function nextType(enemy, index) {
    const ratio = enemy.hp / Math.max(1, enemy.maxHp);
    switch (enemy.aiProfile) {
      case "AGGRESSIVE_ATTACK":
        return canUse(enemy, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : null;
      case "DEFEND_LOW_HP":
        if (ratio <= 0.5 && canUse(enemy, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        return canUse(enemy, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : null;
      case "ALTERNATE_TURN":
        if (index % 2 === 1 && canUse(enemy, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        return canUse(enemy, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : null;
      case "ELITE_PRIORITY":
        if (index % 4 === 3 && canUse(enemy, ACTION_TYPES.DEBUFF)) return ACTION_TYPES.DEBUFF;
        if (index % 3 === 2 && canUse(enemy, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        return canUse(enemy, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : ACTION_TYPES.DEFEND;
      default:
        return canUse(enemy, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : null;
    }
  }

  function valueFor(enemy, type, combat) {
    if (type === ACTION_TYPES.ATTACK) {
      return Math.max(
        1,
        Math.floor((Number(enemy.stats.atk) || 0) - (Number(combat.player.stats.def) || 0))
      );
    }
    if (type === ACTION_TYPES.DEFEND) return 18;
    if (type === ACTION_TYPES.DEBUFF) return 2200;
    return 0;
  }

  function labelFor(type, value) {
    if (type === ACTION_TYPES.ATTACK) return "ATTACK " + value;
    if (type === ACTION_TYPES.DEFEND) return "DEFEND " + value + " SHIELD";
    if (type === ACTION_TYPES.DEBUFF) return "DEBUFF · WEAK 2.2s";
    return "UNKNOWN";
  }

  function previewIntent(combat, startedTick = combat?.simulationTick || 0) {
    if (!combat?.enemy) return null;
    const state = combat.enemyBehavior;
    const index = state?.behaviorIndex || 0;
    const type = nextType(combat.enemy, index);
    if (!type) return null;

    const value = valueFor(combat.enemy, type, combat);
    const leadMs = Number(state?.telegraphMs || 1200);
    const stepMs = Number(window.CombatBalance.BALANCE.timing.fixedStepMs || 100);
    const leadTicks = Math.max(1, Math.ceil(leadMs / stepMs));

    return {
      turn: Math.floor((startedTick * stepMs) / 1000) + 1,
      type,
      value,
      label: labelFor(type, value),
      startedTick,
      resolveTick: startedTick + leadTicks,
      remainingTicks: leadTicks,
      remainingMs: leadTicks * stepMs
    };
  }

  function update(combat, stepMs) {
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return null;
    if (window.BreakSystem.isBroken(combat.enemy.breakState)) return null;

    const state = combat.enemyBehavior;
    const delta = Math.max(0, Number(stepMs) || window.CombatClock.DEFAULT_STEP_MS);

    if (combat.enemyIntent) {
      const intent = combat.enemyIntent;
      intent.remainingMs = Math.max(0, Number(intent.remainingMs || 0) - delta);
      intent.remainingTicks = Math.max(0, Number(intent.remainingTicks || 0) - 1);
      if (intent.remainingTicks > 0) return null;

      state.behaviorIndex += 1;
      state.currentIntent = { ...intent, remainingMs: 0, remainingTicks: 0 };
      state.cooldownMs = state.intervalMs;
      combat.enemyIntent = null;
      return state.currentIntent;
    }

    state.cooldownMs = Math.max(0, Number(state.cooldownMs || 0) - delta);
    if (state.cooldownMs > 0) return null;

    combat.enemyIntent = previewIntent(combat, combat.simulationTick);
    return null;
  }

  function actionFor(combat, intent) {
    return window.GameActions.createAction({
      id: "enemy-behavior-" + combat.simulationTick + "-" + combat.enemy.id,
      type: window.GameActions.ACTION_TYPES.ENEMY_BEHAVIOR,
      actorId: combat.enemy.id,
      targetId: intent.type === ACTION_TYPES.DEFEND ? combat.enemy.id : combat.player.id,
      simulationTick: combat.simulationTick,
      source: "ENEMY_BEHAVIOR"
    });
  }

  function resolveIntent(combat, intent) {
    if (!intent) return null;
    const action = actionFor(combat, intent);

    if (intent.type === ACTION_TYPES.ATTACK) {
      return window.CombatEngine.resolveEnemyAttack(combat, action, intent.value);
    }

    if (intent.type === ACTION_TYPES.DEFEND) {
      combat.enemy.block += intent.value;
      combat.enemy.blockRemainingMs = Math.max(combat.enemy.blockRemainingMs, 1200);
      combat.enemy.defending = true;
      return {
        actionId: action.id,
        actionType: action.type,
        actorId: action.actorId,
        targetId: action.targetId,
        damage: 0,
        breakDamage: 0,
        intent
      };
    }

    if (intent.type === ACTION_TYPES.DEBUFF) {
      window.StatusSystem.applyTimedMs(
        combat.player,
        window.StatusSystem.STATUS_TYPES.WEAK,
        2200
      );
      return {
        actionId: action.id,
        actionType: action.type,
        actorId: action.actorId,
        targetId: action.targetId,
        damage: 0,
        breakDamage: 0,
        statusApplied: "WEAK",
        statusDurationMs: 2200,
        intent
      };
    }

    return null;
  }

  window.EnemyBehaviorSystem = Object.freeze({
    ACTION_TYPES,
    createState,
    previewIntent,
    update,
    actionFor,
    resolveIntent,
    nextType
  });
})();
