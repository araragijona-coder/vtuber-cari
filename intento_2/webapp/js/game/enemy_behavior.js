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
      cooldownMs: 1200,
      intervalMs: 1800,
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

  function previewIntent(combat) {
    const state = combat?.enemyBehavior;
    const type = nextType(combat?.enemy, state?.behaviorIndex || 0);
    if (!type) return null;
    const value = valueFor(combat.enemy, type, combat);
    return {
      type,
      value,
      label: labelFor(type, value),
      remainingMs: Number(state?.cooldownMs || 0)
    };
  }

  function update(combat, stepMs) {
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return null;
    const state = combat.enemyBehavior;
    if (!state || window.BreakSystem.isBroken(combat.enemy.breakState)) return null;

    state.cooldownMs -= Number(stepMs || window.CombatClock.DEFAULT_STEP_MS);
    if (state.cooldownMs > 0) {
      if (combat.enemyIntent) combat.enemyIntent.remainingMs = state.cooldownMs;
      return null;
    }

    const intent = combat.enemyIntent || previewIntent(combat);
    if (!intent) return null;

    state.behaviorIndex += 1;
    state.cooldownMs = state.intervalMs;
    state.currentIntent = intent;
    return intent;
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
      window.StatusSystem.apply(
        combat.player,
        window.StatusSystem.STATUS_TYPES.WEAK,
        intent.value
      );
      return {
        actionId: action.id,
        actionType: action.type,
        actorId: action.actorId,
        targetId: action.targetId,
        damage: 0,
        breakDamage: 0,
        statusApplied: "WEAK",
        statusDurationMs: intent.value,
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