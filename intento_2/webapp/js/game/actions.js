(() => {
  "use strict";

  const ACTION_TYPES = Object.freeze({
    SKILL: "SKILL",
    CARD: "CARD",
    ABILITY: "ABILITY",
    AUTO_ATTACK: "AUTO_ATTACK",
    ENEMY_BEHAVIOR: "ENEMY_BEHAVIOR",
    BURST: "BURST",
    END_TURN: "END_TURN"
  });

  function createAction({
    id, type, actorId, targetId = "", simulationTick = 0,
    cardId = "", cardInstanceId = "", source = "PLAYER"
  }) {
    return Object.freeze({
      id: String(id),
      type: String(type),
      actorId: String(actorId),
      targetId: String(targetId ?? ""),
      simulationTick: Number(simulationTick) || 0,
      cardId: String(cardId || ""),
      cardInstanceId: String(cardInstanceId || ""),
      source: String(source)
    });
  }

  function nextActionId(state, actorId) {
    state.session.actionCounter += 1;
    return "action-" + state.combat.simulationTick + "-" + actorId + "-" + state.session.actionCounter;
  }

  function createPlayerSkillAction(state, cardInstanceId, targetId = null) {
    const combat = state?.combat;
    if (!combat) throw new Error("NO_COMBAT");
    const card = window.CardSystem.cardInHand(combat.cards, cardInstanceId);
    return createAction({
      id: nextActionId(state, combat.player.id),
      type: ACTION_TYPES.SKILL,
      actorId: combat.player.id,
      targetId: targetId || combat.enemy.id,
      simulationTick: combat.simulationTick,
      cardId: card?.cardId || "",
      cardInstanceId: String(cardInstanceId),
      source: "PLAYER_SKILL"
    });
  }

  function createPlayerCardAction(state, cardInstanceId, targetId = null) {
    const action = createPlayerSkillAction(state, cardInstanceId, targetId);
    return Object.freeze({ ...action, type: ACTION_TYPES.CARD });
  }

  function createPlayerBurstAction(state) {
    const combat = state?.combat;
    if (!combat) throw new Error("NO_COMBAT");
    return createAction({
      id: nextActionId(state, combat.player.id),
      type: ACTION_TYPES.BURST,
      actorId: combat.player.id,
      targetId: combat.enemy.id,
      simulationTick: combat.simulationTick,
      source: "PLAYER_BURST"
    });
  }

  function createPlayerAbilityAction(state) {
    const combat = state?.combat;
    if (!combat) throw new Error("NO_COMBAT");
    return createAction({
      id: nextActionId(state, combat.player.id),
      type: ACTION_TYPES.ABILITY,
      actorId: combat.player.id,
      targetId: combat.enemy.id,
      simulationTick: combat.simulationTick,
      source: "PLAYER_ABILITY"
    });
  }

  function createPlayerEndTurnAction(state) {
    return createAction({
      id: nextActionId(state, state?.combat?.player?.id || "player"),
      type: ACTION_TYPES.END_TURN,
      actorId: state?.combat?.player?.id || "player",
      simulationTick: state?.combat?.simulationTick || 0,
      source: "LEGACY"
    });
  }

  window.GameActions = Object.freeze({
    ACTION_TYPES,
    createAction,
    createPlayerSkillAction,
    createPlayerCardAction,
    createPlayerAbilityAction,
    createPlayerBurstAction,
    createPlayerEndTurnAction
  });
})();