(() => {
  "use strict";

  const OUTCOME = Object.freeze({
    IN_PROGRESS: "IN_PROGRESS",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  const PHASE = Object.freeze({
    BATTLE_INIT: "BATTLE_INIT",
    PLAYER_TURN: "PLAYER_TURN",
    RESOLVE_PLAYER_ACTION: "RESOLVE_PLAYER_ACTION",
    ENEMY_TURN: "ENEMY_TURN",
    RESOLVE_ENEMY_ACTION: "RESOLVE_ENEMY_ACTION",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createCombatant({ id, hp, maxHp = hp, stats = {} }) {
    const safeMaxHp = Math.max(1, Number(maxHp) || 1);
    const safeHp = Math.min(safeMaxHp, Math.max(0, Number(hp) || 0));
    return {
      id: String(id),
      hp: safeHp,
      maxHp: safeMaxHp,
      stats: {
        atk: Math.max(0, Number(stats.atk) || 0),
        def: Math.max(0, Number(stats.def) || 0),
        skillDamage: Math.max(0, Number(stats.skillDamage) || 0)
      },
      defending: false
    };
  }

  function createGameState(options = {}) {
    const playerId = String(options.playerId || "local-player");
    return {
      screen: "MAIN",
      player: {
        id: playerId,
        xp: 0,
        level: 1,
        currency: 0,
        wins: 0,
        losses: 0,
        currentBattleId: null
      },
      combat: null,
      progression: {},
      session: {
        lastMessage: "Esperando una batalla.",
        actionCounter: 0
      }
    };
  }

  function startBattle(state, config = {}) {
    if (!state || typeof state !== "object") throw new TypeError("GameState inválido.");

    const playerConfig = config.player || {};
    const enemyConfig = config.enemy || {};
    const battleId = String(config.battleId || "battle-mvp-1");

    state.screen = "BATTLE";
    state.player.currentBattleId = battleId;
    state.combat = {
      battleId,
      phase: PHASE.PLAYER_TURN,
      turn: 1,
      player: createCombatant({
        id: playerConfig.id || "player",
        hp: playerConfig.hp ?? 120,
        maxHp: playerConfig.maxHp ?? playerConfig.hp ?? 120,
        stats: playerConfig.stats || { atk: 20, def: 5, skillDamage: 40 }
      }),
      enemy: createCombatant({
        id: enemyConfig.id || "enemy-mvp",
        hp: enemyConfig.hp ?? 100,
        maxHp: enemyConfig.maxHp ?? enemyConfig.hp ?? 100,
        stats: enemyConfig.stats || { atk: 15, def: 3, skillDamage: 30 }
      }),
      activeActor: "player",
      lastAction: null,
      outcome: OUTCOME.IN_PROGRESS,
      resources: {
        playerSkill: 1,
        ...window.EnergySystem.createEnergy(3)
      },
      cards: window.CardSystem.createCombatDeckState(4)
    };

    window.CardSystem.drawCards(state.combat.cards, 4);
    window.EnergySystem.refill(state.combat.resources);
    state.session.lastMessage = "Batalla iniciada · turno 1 · turno del jugador.";
    return state;
  }

  function setMain(state) {
    state.screen = "MAIN";
    state.combat = null;
    state.player.currentBattleId = null;
    state.session.lastMessage = "Esperando una batalla.";
    return state;
  }

  function snapshot(state) {
    return clone(state);
  }

  window.GameState = Object.freeze({
    OUTCOME,
    PHASE,
    createCombatant,
    createGameState,
    startBattle,
    setMain,
    snapshot
  });
})();