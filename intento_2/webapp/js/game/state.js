(() => {
  "use strict";

  const OUTCOME = Object.freeze({
    IN_PROGRESS: "IN_PROGRESS",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  const PHASE = Object.freeze({
    BATTLE_INIT: "BATTLE_INIT",
    REAL_TIME: "REAL_TIME",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createCombatant({
    id, hp, maxHp = hp, stats = {}, name = "", archetype = "",
    actions = [], availableActions = actions, aiProfile = "", identity = null,
    autoAttack = null
  }) {
    const safeMaxHp = Math.max(1, Number(maxHp) || 1);
    const safeHp = Math.min(safeMaxHp, Math.max(0, Number(hp) || 0));
    return {
      id: String(id),
      name: String(name || ""),
      archetype: String(archetype || ""),
      hp: safeHp,
      maxHp: safeMaxHp,
      stats: {
        atk: Math.max(0, Number(stats.atk) || 0),
        def: Math.max(0, Number(stats.def) || 0),
        skillDamage: Math.max(0, Number(stats.skillDamage) || 0)
      },
      actions: Array.isArray(actions) ? [...actions] : [],
      availableActions: Array.isArray(availableActions) ? [...availableActions] : [],
      aiProfile: String(aiProfile || ""),
      identity: identity ? clone(identity) : null,
      defending: false,
      block: 0,
      blockRemainingMs: 0,
      statuses: window.StatusSystem.createStatuses(),
      autoAttack: autoAttack ? clone(autoAttack) : null,
      intent: null
    };
  }

  function createEnemyCombatant(enemyConfig = {}) {
    const known = enemyConfig?.id && window.EnemyCatalog?.definitionFor(enemyConfig.id);
    const catalog = known
      ? window.EnemyCatalog.createEnemy(enemyConfig.id)
      : {
          id: enemyConfig?.id || "enemy-mvp",
          name: enemyConfig?.name || "ENEMY",
          archetype: enemyConfig?.archetype || "DEMO",
          maxHp: enemyConfig?.maxHp ?? enemyConfig?.hp ?? 100,
          hp: enemyConfig?.hp ?? 100,
          stats: enemyConfig?.stats || { atk: 12, def: 3, skillDamage: 12 },
          actions: enemyConfig?.actions || ["ATTACK", "DEFEND", "DEBUFF"],
          availableActions: enemyConfig?.availableActions || ["ATTACK", "DEFEND", "DEBUFF"],
          aiProfile: enemyConfig?.aiProfile || "AGGRESSIVE_ATTACK",
          identity: enemyConfig?.identity || null,
          autoAttack: enemyConfig?.autoAttack || { intervalMs: 1400, damage: 8, breakDamage: 6 }
        };

    return createCombatant({
      ...catalog,
      hp: enemyConfig.hp ?? catalog.hp,
      maxHp: enemyConfig.maxHp ?? catalog.maxHp,
      stats: enemyConfig.stats || catalog.stats,
      name: enemyConfig.name ?? catalog.name,
      archetype: enemyConfig.archetype ?? catalog.archetype,
      actions: enemyConfig.actions || catalog.actions,
      availableActions: enemyConfig.availableActions || catalog.availableActions,
      aiProfile: enemyConfig.aiProfile ?? catalog.aiProfile,
      identity: enemyConfig.identity || catalog.identity,
      autoAttack: window.AutoAttackSystem.create(
        enemyConfig.autoAttack || catalog.autoAttack || { intervalMs: 1400, damage: 8, breakDamage: 6 }
      )
    });
  }

  function createGameState(options = {}) {
    const playerId = String(options.playerId || "local-player");
    return {
      screen: "MAIN",
      player: {
        id: playerId, xp: 0, level: 1, currency: 0,
        wins: 0, losses: 0, currentBattleId: null
      },
      combat: null,
      progression: {},
      session: {
        lastMessage: "Esperando una batalla.",
        actionCounter: 0,
        battleSequence: 0
      }
    };
  }

  function startBattle(state, config = {}) {
    if (!state || typeof state !== "object") throw new TypeError("GameState inválido.");
    const playerConfig = config.player || {};
    const enemyConfig = config.enemy || {};
    const battleId = String(config.battleId || "battle-mvp-1");
    const seed = window.CombatRNG.normalizeSeed(config.seed ?? battleId);
    const enemy = createEnemyCombatant(enemyConfig);
    const playerAutoBalance = window.CombatBalance.BALANCE.playerAutoAttack;
    const player = createCombatant({
      id: playerConfig.id || "player",
      hp: playerConfig.hp ?? 120,
      maxHp: playerConfig.maxHp ?? playerConfig.hp ?? 120,
      stats: playerConfig.stats || { atk: 20, def: 5, skillDamage: 40 },
      autoAttack: window.AutoAttackSystem.create(
        playerConfig.autoAttack || playerAutoBalance
      )
    });

    const breakState = window.BreakSystem.create(
      window.CombatBalance.BALANCE.break.max,
      window.CombatBalance.BALANCE.break.windowMs
    );
    enemy.breakState = breakState;

    state.session.battleSequence += 1;
    state.screen = "BATTLE";
    state.player.currentBattleId = battleId;
    state.combat = {
      battleId,
      seed,
      rulesVersion: "phase18-semi-real-time-v1",
      deckVersion: "phase17-opening-diversity-v1",
      rng: window.CombatRNG.create(seed),
      clock: window.CombatClock.create(window.CombatBalance.BALANCE.timing.fixedStepMs),
      phase: PHASE.REAL_TIME,
      turn: 1,
      simulationTick: 0,
      elapsedMs: 0,
      player,
      enemy,
      activeActor: "combat",
      lastAction: null,
      outcome: OUTCOME.IN_PROGRESS,
      resources: {
        ...window.EnergySystem.createEnergy({
          maxEnergy: window.CombatBalance.BALANCE.energy.maxEnergy,
          energyRegen: window.CombatBalance.BALANCE.energy.regenPerSecond
        }),
        playerAbilityUses: 1
      },
      cards: window.CardSystem.createCombatDeckState(4),
      cooldowns: {},
      enemyIntent: null,
      enemyBehavior: null,
      progression: clone(state.progression || {}),
      break: breakState,
      burstWindowEndedAt: null
    };

    window.CardSystem.drawCards(state.combat.cards, 4);
    state.combat.enemyBehavior = window.EnemyBehaviorSystem.createState(state.combat);
    state.combat.enemyIntent = window.EnemyBehaviorSystem.previewIntent(state.combat);
    state.combat.enemy.intent = state.combat.enemyIntent;

    state.session.lastMessage = "COMBAT LIVE · la pelea continúa sola. Intervení con skills.";
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