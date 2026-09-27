(() => {
  "use strict";

  const { ACTION_TYPES } = window.GameActions;

  function canUse(enemyState, type) {
    return Array.isArray(enemyState?.availableActions) && enemyState.availableActions.includes(type);
  }

  function chooseType(enemyState, combatState) {
    if (!enemyState || !combatState) return null;
    if (combatState.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return null;
    if (combatState.activeActor !== "enemy") return null;
    if (enemyState.hp <= 0 || combatState.player.hp <= 0) return null;

    const ratio = enemyState.hp / Math.max(1, enemyState.maxHp);

    switch (enemyState.aiProfile) {
      case "AGGRESSIVE_ATTACK":
        return canUse(enemyState, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : null;
      case "DEFEND_LOW_HP":
        if (ratio <= 0.4 && canUse(enemyState, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        return canUse(enemyState, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : ACTION_TYPES.DEFEND;
      case "ALTERNATE_TURN":
        if (combatState.turn % 2 === 0 && canUse(enemyState, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        return canUse(enemyState, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : ACTION_TYPES.DEFEND;
      case "ELITE_PRIORITY":
        if (ratio <= 0.35 && canUse(enemyState, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        if (combatState.turn % 3 === 0 && canUse(enemyState, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        return canUse(enemyState, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : ACTION_TYPES.DEFEND;
      default:
        return canUse(enemyState, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : null;
    }
  }

  function chooseEnemyAction(enemyState, combatState) {
    const type = chooseType(enemyState, combatState);
    if (!type) return null;

    return window.GameActions.createAction({
      id: "enemy-action-" + combatState.turn + "-" + enemyState.id,
      type,
      actorId: enemyState.id,
      targetId: combatState.player.id,
      turn: combatState.turn
    });
  }

  function decide(state) {
    return chooseEnemyAction(state?.combat?.enemy, state?.combat || null);
  }

  window.EnemyAI = Object.freeze({ chooseEnemyAction, decide });
})();