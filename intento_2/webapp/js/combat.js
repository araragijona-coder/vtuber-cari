(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d") ?? null;
  const statusEl = document.getElementById("combat-status");
  const resultEl = document.getElementById("combat-result");
  const playerHpEl = document.getElementById("combat-player-hp");
  const enemyNameEl = document.getElementById("combat-enemy-name");
  const enemyHpEl = document.getElementById("combat-enemy-hp");
  const enemyArchetypeEl = document.getElementById("combat-enemy-archetype");
  const turnEl = document.getElementById("combat-turn");
  const actorEl = document.getElementById("combat-actor");
  const lastActionEl = document.getElementById("combat-last-action");
  const statusValueEl = document.getElementById("combat-status-value");
  const energyEl = document.getElementById("combat-energy");
  const handEl = document.getElementById("combat-hand");
  const startButton = document.getElementById("start-battle");
  const restartButton = document.getElementById("restart-battle");

  let battleSequence = 0;
  let enemySequence = -1;
  let currentEnemyId = null;
  const view = { gameState: null, lastWidth: 0, lastHeight: 0, impact: null };
  const combatTelemetry = new Map();

  function nextEnemyId() {
    enemySequence += 1;
    return window.EnemyCatalog.sequenceAt(enemySequence);
  }

  function createBattleConfig(enemyId) {
    battleSequence += 1;
    const id = enemyId || nextEnemyId();
    const battleId = typeof window.generateUUID === "function"
      ? window.generateUUID()
      : "battle-mvp-" + Date.now() + "-" + battleSequence;
    const enemy = window.EnemyCatalog.createEnemy(id);
    currentEnemyId = enemy.id;
    const saved = typeof window.SaveManager?.load === "function" ? window.SaveManager.load().save : null;
    return {
      battleId,
      player: { id: "player-demo", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
      enemy,
      progression: saved?.progression || {}
    };
  }

  function initGameState() {
    view.gameState = window.GameState.createGameState({ playerId: "local-player" });
    renderUi();
  }

  function startBattle(config = null) {
    const battleConfig = config || createBattleConfig(nextEnemyId());
    currentEnemyId = battleConfig.enemy?.id || currentEnemyId;
    if (battleConfig.progression && typeof window.ProgressionSystem?.normalizeProgression === "function") {
      view.gameState.progression = window.ProgressionSystem.normalizeProgression(battleConfig.progression);
    }
    window.GameState.startBattle(view.gameState, battleConfig);
    if (view.gameState.combat) view.gameState.combat.progression = view.gameState.progression;
    view.impact = null;
    const combat = view.gameState.combat;
    combatTelemetry.set(combat.battleId, {
      cards: Object.create(null),
      initialPlayerHp: combat.player.hp,
      lastPlayerHp: combat.player.hp,
      initialNitro: combat.resources?.nitro ?? null,
      redlineTurns: 0,
      redlineMaxLevel: null
    });
    window.RocketBunnyTelemetry?.beginCombat(combat);
    renderUi();
  }

  function restartBattle() {
    startBattle(createBattleConfig(currentEnemyId));
  }

  function nextBattle() {
    startBattle();
  }

  function showResult(resolution) {
    view.impact = {
      team: resolution.targetId === view.gameState.combat.player.id ? "player" : "enemy",
      damage: resolution.damage,
      critical: Boolean(resolution.critical),
      startedAt: performance.now()
    };
  }

  function recordBattleAction(combat, action) {
    const metrics = combatTelemetry.get(combat.battleId);
    if (metrics && action?.cardId) {
      metrics.cards[action.cardId] = (metrics.cards[action.cardId] || 0) + 1;
    }
    window.RocketBunnyTelemetry?.recordCombatAction(combat, action);
  }

  function completeBattleTelemetry(combat) {
    const metrics = combatTelemetry.get(combat.battleId);
    if (!metrics) return;

    const initialHp = Math.max(1, metrics.initialPlayerHp);
    const currentHp = Math.max(0, combat.player.hp);
    const nitroSpent = metrics.initialNitro == null || combat.resources?.nitro == null
      ? null
      : Math.max(0, metrics.initialNitro - combat.resources.nitro);
    const redlineTurns = combat.redlineTurnsActive ?? metrics.redlineTurns ?? null;
    const redlineMaxLevel = combat.redlineMaxLevel ?? metrics.redlineMaxLevel ?? null;

    window.RocketBunnyTelemetry?.completeCombat(combat, combat.outcome, {
      turns_elapsed: combat.turn ?? null,
      damage_taken: Math.max(0, metrics.initialPlayerHp - combat.player.hp),
      hp_remaining_pct: Math.round((currentHp / initialHp) * 10000) / 100,
      nitro_spent: nitroSpent,
      redline_turns_active: redlineTurns,
      redline_max_level: redlineMaxLevel,
      cards_played_distribution: { ...metrics.cards }
    });

    combatTelemetry.delete(combat.battleId);
  }

  function playCard(cardInstanceId) {
    const combat = view.gameState?.combat;
    if (!combat || combat.activeActor !== "player" || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return;

    try {
      const action = window.GameActions.createPlayerCardAction(view.gameState, cardInstanceId);
      const resolution = window.CombatEngine.resolveAction(view.gameState, action);
      recordBattleAction(combat, action);
      showResult(resolution);
      if (resolution.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
        completeBattleTelemetry(combat);
      }
      renderUi();
      if (resolution.outcome === window.GameState.OUTCOME.IN_PROGRESS && combat.activeActor === "enemy") {
        window.setTimeout(runEnemyTurn, 260);
      }
    } catch (error) {
      view.gameState.session.lastMessage = "Carta rechazada · " + error.message;
      renderUi();
    }
  }

  function runEnemyTurn() {
    const combat = view.gameState?.combat;
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS || combat.activeActor !== "enemy") return;
    const action = window.EnemyAI.decide(view.gameState);
    if (!action) return;
    try {
      const resolution = window.CombatEngine.resolveAction(view.gameState, action);
      recordBattleAction(combat, action);
      showResult(resolution);
      if (resolution.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
        completeBattleTelemetry(combat);
      }
      renderUi();
    } catch (error) {
      view.gameState.session.lastMessage = "Turno enemigo rechazado · " + error.message;
      renderUi();
    }
  }

  function formatLastAction(combat) {
    const action = combat?.lastAction;
    if (!action) return "—";
    if (action.actionType === window.GameActions.ACTION_TYPES.CARD) {
      return window.CardSystem.definitionFor(action.cardId)?.name || "CARD";
    }
    return action.actorId === combat.enemy.id ? "ENEMY " + action.actionType : action.actionType;
  }

  function renderHand(combat) {
    if (!handEl) return;
    handEl.replaceChildren();
    const playerTurn = combat?.outcome === window.GameState.OUTCOME.IN_PROGRESS && combat.activeActor === "player";
    for (const card of combat?.cards?.hand || []) {
      const baseDefinition = window.CardSystem.hydrateCard(card);
      const bonus = window.ProgressionSystem?.bonusForCard?.(view.gameState?.progression, card.cardId) || 0;
      const definition = baseDefinition && bonus > 0 ? { ...baseDefinition, damage: baseDefinition.damage + bonus } : baseDefinition;
      if (!definition) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "card-button";
      button.dataset.cardInstanceId = card.instanceId;
      button.disabled = !playerTurn || definition.cost > combat.resources.energy;
      button.innerHTML = "<strong>" + definition.name + "</strong><span class=\"card-cost\">⚡ " + definition.cost + "</span><small>" + definition.description + "</small>";
      button.addEventListener("click", () => playCard(card.instanceId));
      handEl.appendChild(button);
    }
  }

  function renderUi() {
    const game = view.gameState;
    const combat = game?.combat;
    const outcome = combat?.outcome || null;

    if (playerHpEl) playerHpEl.textContent = combat ? Math.round(combat.player.hp) + " / " + Math.round(combat.player.maxHp) : "—";
    if (enemyNameEl) enemyNameEl.textContent = combat?.enemy?.name || "—";
    if (enemyHpEl) enemyHpEl.textContent = combat ? Math.round(combat.enemy.hp) + " / " + Math.round(combat.enemy.maxHp) : "—";
    if (enemyArchetypeEl) enemyArchetypeEl.textContent = combat?.enemy?.archetype || "—";
    if (turnEl) turnEl.textContent = combat ? String(combat.turn) : "—";
    if (actorEl) actorEl.textContent = combat ? (combat.activeActor === "player" ? "PLAYER" : "ENEMY") : "—";
    if (lastActionEl) lastActionEl.textContent = formatLastAction(combat) + (combat?.lastAction?.critical ? " · CRÍTICO" : "");
    if (statusValueEl) statusValueEl.textContent = outcome || "READY";
    if (energyEl) energyEl.textContent = combat ? combat.resources.energy + " / " + combat.resources.maxEnergy : "—";
    if (resultEl) resultEl.textContent = outcome === window.GameState.OUTCOME.VICTORY ? "VICTORY" : outcome === window.GameState.OUTCOME.DEFEAT ? "DEFEAT" : (combat?.lastAction?.damage > 0 ? ((combat.lastAction.critical ? "CRÍTICO · " : "") + "-" + combat.lastAction.damage) : "");
    if (statusEl) statusEl.textContent = game?.session?.lastMessage || "Esperando una batalla.";
    if (startButton) startButton.hidden = Boolean(combat);
    if (restartButton) restartButton.hidden = !combat || outcome === window.GameState.OUTCOME.IN_PROGRESS;
    renderHand(combat);
  }

  function resizeCanvas() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    view.lastWidth = rect.width;
    view.lastHeight = rect.height;
  }

  function drawText(text, x, y, size, weight, align = "left", color = "#fff") {
    context.font = weight + " " + size + "px system-ui, sans-serif";
    context.textAlign = align;
    context.textBaseline = "top";
    context.fillStyle = color;
    context.fillText(text, x, y);
  }

  function drawHpBar(x, y, width, height, hp, maxHp) {
    const ratio = Math.min(1, Math.max(0, hp / Math.max(1, maxHp)));
    context.fillStyle = "rgba(0,0,0,.55)";
    context.fillRect(x, y, width, height);
    context.fillStyle = ratio > .5 ? "#39d98a" : ratio > .25 ? "#f1c75b" : "#ff6b6b";
    context.fillRect(x, y, width * ratio, height);
    context.strokeStyle = "rgba(255,255,255,.28)";
    context.strokeRect(x, y, width, height);
  }

  function drawFighter(fighter, x, y, width, height, team) {
    context.fillStyle = "rgba(15,20,35,.9)";
    context.fillRect(x, y, width, height);
    context.strokeStyle = team === "player" ? "rgba(106,181,255,.65)" : "rgba(255,111,150,.65)";
    context.strokeRect(x, y, width, height);
    context.fillStyle = team === "player" ? "rgba(61,132,194,.38)" : "rgba(194,61,103,.38)";
    context.fillRect(x + 8, y + 8, width - 16, height - 78);
    drawText(team === "player" ? "PLAYER" : fighter.name || "ENEMY", x + width / 2, y + height / 2 - 8, 18, "800", "center", "rgba(255,255,255,.7)");
    drawText(team === "player" ? fighter.id : fighter.archetype, x + 10, y + height - 58, 13, "700");
    drawText("HP " + Math.round(fighter.hp) + " / " + Math.round(fighter.maxHp), x + 10, y + height - 38, 12, "600", "left", "rgba(255,255,255,.72)");
    drawHpBar(x + 10, y + height - 20, width - 20, 8, fighter.hp, fighter.maxHp);
  }

  function drawFrame() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== view.lastWidth || rect.height !== view.lastHeight) resizeCanvas();
    const width = view.lastWidth, height = view.lastHeight;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#080d18";
    context.fillRect(0, 0, width, height);
    const game = view.gameState;
    if (!game?.combat) {
      drawText("ROCKET BUNNY PETTY", width / 2, height * .35, 24, "800", "center");
      drawText("Iniciá una batalla MVP para comenzar.", width / 2, height * .35 + 38, 14, "500", "center", "rgba(255,255,255,.65)");
    } else {
      const combat = game.combat;
      drawText("BATTLE  " + combat.battleId, width / 2, 14, 14, "800", "center", "rgba(255,255,255,.8)");
      drawText("PLAYER", 18, 42, 12, "800", "left", "#75c8ff");
      drawText(combat.enemy.name || "ENEMY", width - 18, 42, 12, "800", "right", "#ff83aa");
      drawFighter(combat.player, 14, 62, width / 2 - 28, height - 120, "player");
      drawFighter(combat.enemy, width / 2 + 14, 62, width / 2 - 28, height - 120, "enemy");
    }
    window.requestAnimationFrame(drawFrame);
  }

  window.CariCombat = Object.freeze({
    startBattle,
    restartBattle,
    nextBattle,
    actionButton: playCard,
    getGameState: () => view.gameState
  });

  startButton?.addEventListener("click", () => startBattle());
  restartButton?.addEventListener("click", () => restartBattle());
  window.addEventListener("resize", resizeCanvas, { passive: true });
  initGameState();
  resizeCanvas();
  drawFrame();
})();