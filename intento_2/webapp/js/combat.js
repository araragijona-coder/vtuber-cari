(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d") ?? null;
  const statusEl = document.getElementById("combat-status");
  const resultEl = document.getElementById("combat-result");
  const playerHpEl = document.getElementById("combat-player-hp");
  const playerBlockEl = document.getElementById("combat-player-block");
  const playerStatusesEl = document.getElementById("combat-player-statuses");
  const playerAutoEl = document.getElementById("combat-player-auto");
  const enemyNameEl = document.getElementById("combat-enemy-name");
  const enemyHpEl = document.getElementById("combat-enemy-hp");
  const enemyBlockEl = document.getElementById("combat-enemy-block");
  const enemyBreakEl = document.getElementById("combat-enemy-break");
  const enemyStatusesEl = document.getElementById("combat-enemy-statuses");
  const enemyIntentEl = document.getElementById("combat-enemy-intent");
  const enemyAutoEl = document.getElementById("combat-enemy-auto");
  const combatTimeEl = document.getElementById("combat-time");
  const combatPhaseEl = document.getElementById("combat-phase");
  const lastActionEl = document.getElementById("combat-last-action");
  const statusValueEl = document.getElementById("combat-status-value");
  const energyEl = document.getElementById("combat-energy");
  const energyRegenEl = document.getElementById("combat-energy-regen");
  const abilityEl = document.getElementById("combat-ability-status");
  const burstEl = document.getElementById("combat-burst");
  const handEl = document.getElementById("combat-hand");
  const startButton = document.getElementById("start-battle");
  const burstButton = document.getElementById("burst-action");
  const abilityButton = document.getElementById("character-ability");
  const restartButton = document.getElementById("restart-battle");

  let battleSequence = 0;
  let enemySequence = -1;
  let currentEnemyId = null;
  let simulationFrame = null;
  let lastSimulationTime = null;
  const view = { gameState: null, lastWidth: 0, lastHeight: 0, impact: null, lastTelemetryActionId: null };
  const combatTelemetry = new Map();

  function nextEnemyId() {
    enemySequence += 1;
    return window.EnemyCatalog.sequenceAt(enemySequence);
  }

  function createBattleConfig(enemyId = null) {
    battleSequence += 1;
    const id = enemyId || nextEnemyId();
    const battleId = typeof window.generateUUID === "function"
      ? window.generateUUID()
      : "battle-phase18-" + Date.now() + "-" + battleSequence;
    const enemy = window.EnemyCatalog.createEnemy(id);
    currentEnemyId = enemy.id;
    const saved = typeof window.SaveManager?.load === "function"
      ? window.SaveManager.load().save
      : null;
    return {
      battleId,
      seed: battleSequence * 7919 + 170000,
      player: {
        id: "player-demo",
        hp: 120,
        maxHp: 120,
        stats: { atk: 20, def: 5, skillDamage: 40 }
      },
      enemy,
      progression: saved?.progression || {}
    };
  }

  function stopSimulation() {
    if (simulationFrame !== null) {
      window.cancelAnimationFrame(simulationFrame);
      simulationFrame = null;
    }
    lastSimulationTime = null;
  }

  function startSimulation() {
    stopSimulation();
    lastSimulationTime = performance.now();

    function frame(now) {
      const combat = view.gameState?.combat;
      if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
        stopSimulation();
        return;
      }

      const deltaMs = Math.min(
        500,
        Math.max(0, Number(now) - Number(lastSimulationTime))
      );
      lastSimulationTime = now;

      window.CombatEngine.advanceTime(view.gameState, deltaMs);
      captureLatestAction(combat);

      if (combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
        stopSimulation();
        completeBattleTelemetry(combat);
        renderUi();
        return;
      }

      renderUi();
      simulationFrame = window.requestAnimationFrame(frame);
    }

    simulationFrame = window.requestAnimationFrame(frame);
  }

  function captureLatestAction(combat) {
    const action = combat?.lastAction;
    if (!action || action.actionId === view.lastTelemetryActionId) return;
    view.lastTelemetryActionId = action.actionId;
    window.RocketBunnyTelemetry?.recordCombatAction(combat, {
      ...action,
      type: action.actionType
    });
  }

  function initGameState() {
    view.gameState = window.GameState.createGameState({ playerId: "local-player" });
    renderUi();
  }

  function startBattle(config = null) {
    stopSimulation();
    const battleConfig = config || createBattleConfig();
    currentEnemyId = battleConfig.enemy?.id || currentEnemyId;
    if (battleConfig.progression && typeof window.ProgressionSystem?.normalizeProgression === "function") {
      view.gameState.progression = window.ProgressionSystem.normalizeProgression(battleConfig.progression);
    }

    window.GameState.startBattle(view.gameState, battleConfig);
    view.gameState.combat.progression = view.gameState.progression;
    view.impact = null;
    view.lastTelemetryActionId = null;

    const combat = view.gameState.combat;
    combatTelemetry.set(combat.battleId, {
      initialPlayerHp: combat.player.hp,
      cards: Object.create(null)
    });

    window.RocketBunnyTelemetry?.beginCombat(combat);
    renderUi();
    startSimulation();
  }

  function restartBattle() {
    startBattle(createBattleConfig(currentEnemyId));
  }

  function nextBattle() {
    startBattle();
  }

  function showResult(resolution) {
    view.impact = {
      targetId: resolution?.targetId || null,
      damage: Number(resolution?.damage || 0),
      critical: Boolean(resolution?.critical),
      startedAt: performance.now()
    };
  }

  function completeBattleTelemetry(combat) {
    const metrics = combatTelemetry.get(combat.battleId);
    if (!metrics) return;
    const initialHp = Math.max(1, metrics.initialPlayerHp);
    window.RocketBunnyTelemetry?.completeCombat(combat, combat.outcome, {
      turns_elapsed: Math.ceil(combat.elapsedMs / 1000),
      damage_taken: Math.max(0, metrics.initialPlayerHp - combat.player.hp),
      hp_remaining_pct: Math.round((Math.max(0, combat.player.hp) / initialHp) * 10000) / 100,
      nitro_spent: null,
      redline_turns_active: null,
      redline_max_level: null,
      cards_played_distribution: { ...metrics.cards }
    });
    combatTelemetry.delete(combat.battleId);
  }

  function recordCardUsage(combat, cardId) {
    const metrics = combatTelemetry.get(combat.battleId);
    if (!metrics || !cardId) return;
    metrics.cards[cardId] = (metrics.cards[cardId] || 0) + 1;
  }

  function playCard(cardInstanceId) {
    const combat = view.gameState?.combat;
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return;
    try {
      const action = window.GameActions.createPlayerSkillAction(view.gameState, cardInstanceId);
      const resolution = window.CombatEngine.resolveAction(view.gameState, action);
      recordCardUsage(combat, action.cardId);
      view.lastTelemetryActionId = resolution.actionId;
      window.RocketBunnyTelemetry?.recordCombatAction(combat, {
        ...resolution,
        type: resolution.actionType
      });
      showResult(resolution);
      if (resolution.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
        stopSimulation();
        completeBattleTelemetry(combat);
      }
      renderUi();
    } catch (error) {
      view.gameState.session.lastMessage = "Skill rechazada · " + error.message;
      renderUi();
    }
  }

  function useBurst() {
    const combat = view.gameState?.combat;
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return;
    try {
      const action = window.GameActions.createPlayerBurstAction(view.gameState);
      const resolution = window.CombatEngine.resolveAction(view.gameState, action);
      view.lastTelemetryActionId = resolution.actionId;
      window.RocketBunnyTelemetry?.recordCombatAction(combat, {
        ...resolution,
        type: resolution.actionType
      });
      view.gameState.session.lastMessage = "BURST · " + resolution.damage + " DAMAGE" +
        (resolution.brokenPayoff ? " · BREAK PAYOFF" : "");
      showResult(resolution);
      renderUi();
    } catch (error) {
      view.gameState.session.lastMessage = "Burst rechazada · " + error.message;
      renderUi();
    }
  }

  function useAbility() {
    const combat = view.gameState?.combat;
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return;
    try {
      const action = window.GameActions.createPlayerAbilityAction(view.gameState);
      const resolution = window.CombatEngine.resolveAction(view.gameState, action);
      view.lastTelemetryActionId = resolution.actionId;
      window.RocketBunnyTelemetry?.recordCombatAction(combat, {
        ...resolution,
        type: resolution.actionType
      });
      view.gameState.session.lastMessage = "ABILITY · " + window.CharacterAbilitySystem.definition().name;
      renderUi();
    } catch (error) {
      view.gameState.session.lastMessage = "Ability rechazada · " + error.message;
      renderUi();
    }
  }

  function formatLastAction(combat) {
    const action = combat?.lastAction;
    if (!action) return "—";
    if (action.cardId) return window.CardSystem.definitionFor(action.cardId)?.name || action.cardId;
    if (action.actionType === "ABILITY") return "ABILITY · PULSO BŌSŌZOKU";
    if (action.actionType === "BURST") return "BURST · " + (action.damage || 0) + " DMG";
    if (action.actionType === "AUTO_ATTACK") return action.source === "ENEMY_AUTO_ATTACK" ? "ENEMY AUTO ATTACK" : "PLAYER AUTO ATTACK";
    if (action.actionType === "ENEMY_BEHAVIOR") return "ENEMY · " + (action.intent?.label || "BEHAVIOR");
    return action.actionType || "ACTION";
  }

  function statusText(combatant) {
    return window.StatusSystem.entries(combatant)
      .map((status) => {
        if (status.remainingMs > 0) {
          return status.label + " " + (status.remainingMs / 1000).toFixed(1) + "s";
        }
        if (status.durationTicks > 0) {
          return status.label + " " + (status.durationTicks / 10).toFixed(1) + "s";
        }
        return status.label + " " + status.turns;
      })
      .join(" · ") || "—";
  }

  function formatIntent(combat) {
    const intent = combat?.enemyIntent;
    if (!intent) {
      const cooldown = Number(combat?.enemyBehavior?.cooldownMs || 0);
      return cooldown > 0
        ? "ENEMY RECOVERING · " + (cooldown / 1000).toFixed(1) + "s"
        : "—";
    }
    const seconds = Math.max(0, Number(intent.remainingMs || 0)) / 1000;
    return intent.label + " · " + seconds.toFixed(1) + "s";
  }

  function formatAuto(fighter) {
    const attack = fighter?.autoAttack;
    if (!attack) return "—";
    return "AUTO · " + Math.max(0, attack.cooldownMs / 1000).toFixed(1) + "s";
  }

  function cardEffectText(definition) {
    const effects = definition.effects || {};
    const parts = [];
    if (definition.damage > 0) parts.push("DMG " + definition.damage);
    if (definition.breakDamage > 0) parts.push("BRK " + definition.breakDamage);
    if (effects.block) parts.push("SHIELD " + effects.block);
    if (effects.draw) parts.push("DRAW " + effects.draw);
    if (effects.energyGain) parts.push("+" + effects.energyGain + " EN");
    if (effects.applyStatus) parts.push(effects.applyStatus);
    if (effects.conditional) parts.push("COND");
    return parts.join(" · ") || "UTILITY";
  }

  function renderHand(combat) {
    if (!handEl) return;
    handEl.replaceChildren();
    if (!combat) return;

    for (const card of combat.cards.hand) {
      const definition = window.CombatEngine.cardDefinitionFor(combat, card.cardId);
      if (!definition) continue;
      const cooldown = Number(combat.cooldowns[card.cardId] || 0);
      const disabled =
        combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS ||
        !window.EnergySystem.canSpend(combat.resources, definition.cost) ||
        cooldown > 0;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "card-button card-" + definition.type.toLowerCase();
      button.dataset.cardInstanceId = card.instanceId;
      button.disabled = disabled;
      const cooldownText = cooldown > 0
        ? "CD " + (cooldown / 1000).toFixed(1) + "s"
        : "READY";
      button.innerHTML =
        "<strong>" + definition.name + "</strong>" +
        "<span class=\"card-cost\">⚡ " + definition.cost + "</span>" +
        "<small class=\"card-type\">" + definition.type + " SKILL · " + cooldownText + "</small>" +
        "<small>" + cardEffectText(definition) + " · " + definition.description + "</small>";
      button.addEventListener("click", () => playCard(card.instanceId));
      handEl.appendChild(button);
    }
  }

  function renderUi() {
    const game = view.gameState;
    const combat = game?.combat;
    const outcome = combat?.outcome || null;
    const ability = window.CharacterAbilitySystem?.definition?.();

    if (playerHpEl) playerHpEl.textContent = combat ? Math.ceil(combat.player.hp) + " / " + combat.player.maxHp : "—";
    if (playerBlockEl) playerBlockEl.textContent = combat ? String(Math.ceil(combat.player.block || 0)) : "—";
    if (playerStatusesEl) playerStatusesEl.textContent = combat ? statusText(combat.player) : "—";
    if (playerAutoEl) playerAutoEl.textContent = combat ? formatAuto(combat.player) : "—";

    if (enemyNameEl) enemyNameEl.textContent = combat?.enemy?.name || "—";
    if (enemyHpEl) enemyHpEl.textContent = combat ? Math.ceil(combat.enemy.hp) + " / " + combat.enemy.maxHp : "—";
    if (enemyBlockEl) enemyBlockEl.textContent = combat ? String(Math.ceil(combat.enemy.block || 0)) : "—";
    if (enemyBreakEl) {
      enemyBreakEl.textContent = combat
        ? (window.BreakSystem.isBroken(combat.enemy.breakState)
          ? "0 / " + combat.enemy.breakState.max + " · BURST"
          : Math.ceil(combat.enemy.breakState.current) + " / " + combat.enemy.breakState.max)
        : "—";
    }
    if (enemyStatusesEl) enemyStatusesEl.textContent = combat ? statusText(combat.enemy) : "—";
    if (enemyAutoEl) enemyAutoEl.textContent = combat ? formatAuto(combat.enemy) : "—";
    if (enemyIntentEl) enemyIntentEl.textContent = combat ? formatIntent(combat) : "—";

    if (combatTimeEl) combatTimeEl.textContent = combat ? (combat.elapsedMs / 1000).toFixed(1) + " s" : "—";
    if (combatPhaseEl) combatPhaseEl.textContent = combat
      ? (window.BurstSystem.isActive(combat) ? "BREAK WINDOW" : combat.phase)
      : "READY";
    if (energyEl) energyEl.textContent = combat ? Math.floor(combat.resources.energy) + " / " + combat.resources.maxEnergy : "—";
    if (energyRegenEl) energyRegenEl.textContent = combat ? combat.resources.energyRegen.toFixed(1) + " /s" : "—";
    if (burstEl) {
      burstEl.textContent = combat
        ? Math.floor(window.BurstSystem.chargeOf(combat)) + " / " + window.BurstSystem.maxChargeOf(combat)
        : "—";
    }
    if (burstButton) {
      burstButton.disabled = !combat || !window.BurstSystem.canUse(combat);
      burstButton.hidden = !combat || outcome !== window.GameState.OUTCOME.IN_PROGRESS;
      burstButton.textContent = combat && window.BurstSystem.isActive(combat) ? "BURST · BREAK" : "BURST";
    }
    if (abilityEl) {
      abilityEl.textContent = combat
        ? ability.name + " · " + combat.resources.playerAbilityUses + "/1"
        : "—";
      abilityButton?.setAttribute("aria-label", ability.name + " · " + ability.condition);
    }
    if (lastActionEl) {
      lastActionEl.textContent =
        formatLastAction(combat) +
        (combat?.lastAction?.critical ? " · CRÍTICO" : "") +
        (combat?.lastAction?.blockAbsorbed ? " · BLOCK " + combat.lastAction.blockAbsorbed : "") +
        (combat?.lastAction?.broke ? " · BREAK" : "");
    }
    if (statusValueEl) statusValueEl.textContent = outcome || "READY";
    if (statusEl) statusEl.textContent = game?.session?.lastMessage || "Esperando una batalla.";

    if (startButton) startButton.hidden = Boolean(combat);
    if (restartButton) restartButton.hidden = !combat;
    if (abilityButton) {
      abilityButton.disabled = !combat || !window.CharacterAbilitySystem.canUse(combat);
      abilityButton.hidden = !combat || outcome !== window.GameState.OUTCOME.IN_PROGRESS;
    }

    if (resultEl) {
      if (!combat) resultEl.textContent = "";
      else if (outcome === window.GameState.OUTCOME.VICTORY) resultEl.textContent = "VICTORY";
      else if (outcome === window.GameState.OUTCOME.DEFEAT) resultEl.textContent = "DEFEAT";
      else if (window.BurstSystem.isActive(combat)) resultEl.textContent = "BREAK WINDOW · DAMAGE x" + window.BurstSystem.multiplier(combat).toFixed(2);
      else if (combat.lastAction?.damage > 0) {
        resultEl.textContent =
          (combat.lastAction.critical ? "CRÍTICO · " : "") +
          "-" + combat.lastAction.damage +
          (combat.lastAction.breakDamage ? " · BRK " + combat.lastAction.breakDamage : "");
      } else {
        resultEl.textContent = "";
      }
    }

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

  function drawBar(x, y, width, height, value, max, fillColor) {
    const ratio = Math.min(1, Math.max(0, value / Math.max(1, max)));
    context.fillStyle = "rgba(0,0,0,.55)";
    context.fillRect(x, y, width, height);
    context.fillStyle = fillColor;
    context.fillRect(x, y, width * ratio, height);
    context.strokeStyle = "rgba(255,255,255,.25)";
    context.strokeRect(x, y, width, height);
  }

  function drawFighter(fighter, x, y, width, height, team) {
    context.fillStyle = "rgba(15,20,35,.9)";
    context.fillRect(x, y, width, height);
    context.strokeStyle = team === "player" ? "rgba(106,181,255,.65)" : "rgba(255,111,150,.65)";
    context.strokeRect(x, y, width, height);

    drawText(
      team === "player" ? "PLAYER" : fighter.name || "ENEMY",
      x + width / 2, y + 24, 18, "800", "center", "rgba(255,255,255,.82)"
    );
    drawText("AUTO · " + (fighter.autoAttack?.damage || 0) + " DMG", x + width / 2, y + 50, 11, "700", "center", "rgba(255,255,255,.58)");

    drawText("HP " + Math.ceil(fighter.hp) + " / " + fighter.maxHp, x + 10, y + height - 86, 12, "600");
    drawText("SHIELD " + Math.ceil(fighter.block || 0), x + 10, y + height - 66, 12, "700");
    drawText(statusText(fighter), x + 10, y + height - 46, 11, "700", "left", "rgba(255,255,255,.65)");
    drawBar(x + 10, y + height - 30, width - 20, 8, fighter.hp, fighter.maxHp, "#54d58c");

    if (team === "enemy" && fighter.breakState) {
      drawText(
        window.BreakSystem.isBroken(fighter.breakState)
          ? "BURST " + (fighter.breakState.remainingMs / 1000).toFixed(1) + "s"
          : "BREAK " + fighter.breakState.current + " / " + fighter.breakState.max,
        x + 10, y + 8, 11, "800", "left", "#ffd36a"
      );
      drawBar(x + 10, y + 18, width - 20, 6, fighter.breakState.current, fighter.breakState.max, "#ffd36a");
    }
  }

  function drawFrame() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width !== view.lastWidth || rect.height !== view.lastHeight) resizeCanvas();

    const width = view.lastWidth;
    const height = view.lastHeight;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#080d18";
    context.fillRect(0, 0, width, height);

    const combat = view.gameState?.combat;
    if (!combat) {
      drawText("ROCKET BUNNY PETTY", width / 2, height * .34, 24, "800", "center");
      drawText("Iniciá un combate semi-real-time.", width / 2, height * .34 + 38, 14, "500", "center", "rgba(255,255,255,.65)");
    } else {
      drawText("TIME " + (combat.elapsedMs / 1000).toFixed(1) + "s", width / 2, 12, 14, "800", "center", "rgba(255,255,255,.82)");
      drawText(formatIntent(combat), width / 2, 34, 12, "800", "center", "#ffd36a");
      if (window.BurstSystem.isActive(combat)) {
        drawText("BURST WINDOW · x" + window.BurstSystem.multiplier(combat).toFixed(2), width / 2, 54, 12, "900", "center", "#ff8fbd");
      }

      drawFighter(combat.player, 14, 76, width / 2 - 28, height - 116, "player");
      drawFighter(combat.enemy, width / 2 + 14, 76, width / 2 - 28, height - 116, "enemy");
    }

    window.requestAnimationFrame(drawFrame);
  }

  window.CariCombat = Object.freeze({
    startBattle,
    restartBattle,
    nextBattle,
    actionButton: playCard,
    useAbility,
    useBurst,
    getGameState: () => view.gameState
  });

  startButton?.addEventListener("click", () => startBattle());
  burstButton?.addEventListener("click", useBurst);
  abilityButton?.addEventListener("click", useAbility);
  restartButton?.addEventListener("click", restartBattle);
  window.addEventListener("resize", resizeCanvas, { passive: true });

  initGameState();
  resizeCanvas();
  drawFrame();
})();