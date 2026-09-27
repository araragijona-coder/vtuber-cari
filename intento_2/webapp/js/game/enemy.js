(() => {
  "use strict";

  function decide(state) {
    const combat = state?.combat;
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
      return null;
    }

    if (combat.enemy.hp <= 0 || combat.player.hp <= 0) {
      return null;
    }

    return window.GameActions.createAction({
      id: "enemy-action-" + combat.turn,
      type: window.GameActions.ACTION_TYPES.ATTACK,
      actorId: combat.enemy.id,
      targetId: combat.player.id,
      turn: combat.turn
    });
  }

  window.EnemyAI = Object.freeze({ decide });
})();