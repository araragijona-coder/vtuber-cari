(() => {
  "use strict";

  const { ACTION_TYPES } = window.GameActions;

  function canUse(enemyState, type) {
    return Array.isArray(enemyState?.availableActions) && enemyState.availableActions.includes(type);
  }

  function attackValue(enemyState, combatState) {
    return Math.max(
      1,
      Math.floor((Number(enemyState?.stats?.atk) || 0) - (Number(combatState?.player?.stats?.def) || 0))
    );
  }

  function chooseType(enemyState, combatState) {
    if (!enemyState || !combatState) return null;
    if (combatState.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return null;
    if (combatState.enemy.hp <= 0 || combatState.player.hp <= 0) return null;

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
        if (combatState.turn % 4 === 0 && canUse(enemyState, ACTION_TYPES.DEBUFF)) return ACTION_TYPES.DEBUFF;
        if (ratio <= 0.35 && canUse(enemyState, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        if (combatState.turn % 3 === 0 && canUse(enemyState, ACTION_TYPES.DEFEND)) return ACTION_TYPES.DEFEND;
        return canUse(enemyState, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : ACTION_TYPES.DEFEND;
      default:
        return canUse(enemyState, ACTION_TYPES.ATTACK) ? ACTION_TYPES.ATTACK : null;
    }
  }

  function intentFor(enemyState, combatState) {
    const type = chooseType(enemyState, combatState);
    if (!type) return null;

    if (type === ACTION_TYPES.ATTACK) {
      return Object.freeze({
        turn: combatState.turn,
        type,
        value: attackValue(enemyState, combatState),
        label: "ATTACK " + attackValue(enemyState, combatState)
      });
    }

    if (type === ACTION_TYPES.DEFEND) {
      return Object.freeze({
        turn: combatState.turn,
        type,
        value: enemyState.aiProfile === "ELITE_PRIORITY" ? 12 : 8,
        label: "DEFEND " + (enemyState.aiProfile === "ELITE_PRIORITY" ? 12 : 8) + " BLOCK"
      });
    }

    if (type === ACTION_TYPES.DEBUFF) {
      return Object.freeze({
        turn: combatState.turn,
        type,
        value: 2,
        label: "DEBUFF · WEAK 2"
      });
    }

    return null;
  }

  function previewIntent(combatState) {
    return intentFor(combatState?.enemy, combatState);
  }

  function chooseEnemyAction(enemyState, combatState) {
    if (
      !combatState ||
      combatState.outcome !== window.GameState.OUTCOME.IN_PROGRESS ||
      combatState.activeActor !== "enemy"
    ) return null;
    const intent = combatState.enemyIntent?.turn === combatState.turn
      ? combatState.enemyIntent
      : previewIntent(combatState);
    if (!intent) return null;

    return window.GameActions.createAction({
      id: "enemy-action-" + combatState.turn + "-" + enemyState.id,
      type: intent.type,
      actorId: enemyState.id,
      targetId: intent.type === ACTION_TYPES.DEFEND ? enemyState.id : combatState.player.id,
      turn: combatState.turn
    });
  }

  function decide(state) {
    return chooseEnemyAction(state?.combat?.enemy, state?.combat || null);
  }

  window.EnemyAI = Object.freeze({
    chooseEnemyAction,
    decide,
    intentFor,
    previewIntent
  });
})();