(() => {
  "use strict";

  const ACTION_TYPES = Object.freeze({
    ATTACK: "ATTACK",
    DEFEND: "DEFEND",
    SKILL: "SKILL"
  });

  function createAction({ id, type, actorId, targetId, turn }) {
    return Object.freeze({
      id: String(id),
      type: String(type),
      actorId: String(actorId),
      targetId: String(targetId),
      turn: Number(turn)
    });
  }

  function nextActionId(state, actorId) {
    state.session.actionCounter += 1;
    return "action-" + state.combat.turn + "-" + actorId + "-" + state.session.actionCounter;
  }

  function createPlayerAction(state, type) {
    const combat = state?.combat;
    if (!combat) {
      throw new Error("No hay combate activo.");
    }

    return createAction({
      id: nextActionId(state, combat.player.id),
      type,
      actorId: combat.player.id,
      targetId: combat.enemy.id,
      turn: combat.turn
    });
  }

  window.GameActions = Object.freeze({
    ACTION_TYPES,
    createAction,
    createPlayerAction
  });
})();