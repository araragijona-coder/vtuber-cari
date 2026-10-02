(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d") ?? null;
  const statusEl = document.getElementById("combat-status");
  const resultEl = document.getElementById("combat-result");
  const playerHpEl = document.getElementById("combat-player-hp");
  const playerHpFillEl = document.getElementById("combat-player-hp-fill");
  const playerBlockEl = document.getElementById("combat-player-block");
  const playerStatusesEl = document.getElementById("combat-player-statuses");
  const playerAutoEl = document.getElementById("combat-player-auto");
  const playerNameEl = document.getElementById("combat-player-name");
  const enemyNameEl = document.getElementById("combat-enemy-name");
  const enemyHpEl = document.getElementById("combat-enemy-hp");
  const enemyHpFillEl = document.getElementById("combat-enemy-hp-fill");
  const enemyBlockEl = document.getElementById("combat-enemy-block");
  const enemyBreakEl = document.getElementById("combat-enemy-break");
  const enemyBreakFillEl = document.getElementById("combat-enemy-break-fill");
  const enemyStatusesEl = document.getElementById("combat-enemy-statuses");
  const enemyIntentEl = document.getElementById("combat-enemy-intent");
  const enemyIntentIconEl = document.getElementById("combat-enemy-intent-icon");
  const enemyIntentTimeEl = document.getElementById("combat-enemy-intent-time");
  const enemyAutoEl = document.getElementById("combat-enemy-auto");
  const combatTimeEl = document.getElementById("combat-time");
  const combatPhaseEl = document.getElementById("combat-phase");
  const lastActionEl = document.getElementById("combat-last-action");
  const statusValueEl = document.getElementById("combat-status-value");
  const energyEl = document.getElementById("combat-energy");
  const energyFillEl = document.getElementById("combat-energy-fill");
  const energyRegenEl = document.getElementById("combat-energy-regen");
  const abilityEl = document.getElementById("combat-ability-status");
  const burstEl = document.getElementById("combat-burst");
  const burstFillEl = document.getElementById("combat-burst-fill");
  const burstReadyEl = document.getElementById("combat-burst-ready");
  const burstButton = document.getElementById("burst-action");
  const abilityButton = document.getElementById("character-ability");
  const handEl = document.getElementById("combat-hand");
  const breakBannerEl = document.getElementById("combat-break-banner");
  const burstBannerEl = document.getElementById("combat-burst-banner");
  const startButton = document.getElementById("start-battle");
  const restartButton = document.getElementById("restart-battle");
  const cinematicSliceButton = document.getElementById("cinematic-slice");
  const combatTimerEl = document.getElementById("combat-timer");
  const combatSceneStateEl = document.getElementById("combat-scene-state");

  const presentation = window.CombatPresentation?.create?.(canvas, context) || null;
  let battleSequence = 0;
  let enemySequence = -1;
  let currentEnemyId = null;
  let mainLoopFrame = null;
  let lastSimulationTime = null;
  let cinematicToken = 0;
  let cinematicRunning = false;
  const view = {
    gameState: null,
    lastWidth: 0,
    lastHeight: 0,
    lastTelemetryActionId: null,
    lastEnemyIntentKey: null
  };
  const combatTelemetry = new Map();
  const handButtonCache = new Map();

  function setText(element, value) {
    if (element && element.textContent !== String(value)) element.textContent = String(value);
  }

  function setBar(element, value, max) {
    if (!element) return;
    const ratio = Math.min(1, Math.max(0, Number(value || 0) / Math.max(1, Number(max || 1))));
    if (element.style) element.style.width = (ratio * 100).toFixed(2) + "%";
    element.setAttribute("aria-valuenow", String(Math.round(Number(value || 0) * 10) / 10));
    element.setAttribute("aria-valuemax", String(Number(max || 0)));
  }

  function setHidden(element, hidden) {
    if (element) element.hidden = Boolean(hidden);
  }

  function formatCombatTimer(elapsedMs) {
    const totalSeconds = Math.max(0, Math.floor(Number(elapsedMs || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function iconForIntent(type) {
    if (type === "ATTACK") return "!";
    if (type === "DEFEND") return "◆";
    if (type === "DEBUFF") return "☄";
    return "•";
  }

  function nextEnemyId() {
    enemySequence += 1;
    return window.EnemyCatalog.sequenceAt(enemySequence);
  }

  function createBattleConfig(enemyId = null) {
    battleSequence += 1;
    const id = enemyId || nextEnemyId();
    const battleId = typeof window.generateUUID === "function"
      ? window.generateUUID()
      : "battle-phase19-" + Date.now() + "-" + battleSequence;
    const enemy = window.EnemyCatalog.createEnemy(id);
    currentEnemyId = enemy.id;
    const search = String(window.location?.search || "");
    const requestedCharacterId = /(?:^|[?&])phase21=support(?:&|$)/.test(search)
      ? "test_support"
      : "yuri";
    const character = window.CharacterKitSystem?.definitionFor?.(requestedCharacterId) || null;
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
      characterId: character?.characterId || null,
      character,
      cardIds: character?.cardIds ? [...character.cardIds] : null,
      progression: saved?.progression || {}
    };
  }

  function cancelCinematic() {
    cinematicToken += 1;
    cinematicRunning = false;
    if (cinematicSliceButton) cinematicSliceButton.disabled = false;
  }

  function cinematicSleep(ms, token) {
    return new Promise((resolve, reject) => {
      window.setTimeout(() => {
        if (token !== cinematicToken) {
          reject(new Error("CINEMATIC_CANCELLED"));
          return;
        }
        resolve();
      }, Math.max(0, Number(ms) || 0));
    });
  }

  function assertCinematic(token) {
    if (token !== cinematicToken) throw new Error("CINEMATIC_CANCELLED");
    const combat = view.gameState?.combat;
    if (!combat || combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
      throw new Error("CINEMATIC_COMBAT_ENDED");
    }
    return combat;
  }

  function readyCardInstance(cardId) {
    const combat = view.gameState?.combat;
    const definition = window.CardSystem?.definitionFor?.(cardId);
    if (!combat || !definition) return null;
    const cooldown = Number(combat.cooldowns?.[cardId] || 0);
    if (cooldown > 0) return null;
    if (!window.EnergySystem?.canSpend?.(combat.resources, definition.cost)) return null;
    const card = combat.cards?.hand?.find((entry) => entry.cardId === cardId);
    return card?.instanceId || null;
  }

  async function waitForCardReady(cardId, token, timeoutMs = 9000) {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    while (true) {
      assertCinematic(token);
      const instanceId = readyCardInstance(cardId);
      if (instanceId) return instanceId;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - startedAt >= timeoutMs) throw new Error("CINEMATIC_CARD_TIMEOUT:" + cardId);
      await cinematicSleep(80, token);
    }
  }

  async function waitForCondition(condition, token, timeoutMs = 12000) {
    const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    while (true) {
      assertCinematic(token);
      if (condition()) return true;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - startedAt >= timeoutMs) return false;
      await cinematicSleep(100, token);
    }
  }

  async function playCinematicSlice() {
    if (!presentation || cinematicRunning) return false;

    cinematicToken += 1;
    const token = cinematicToken;
    cinematicRunning = true;
    if (cinematicSliceButton) cinematicSliceButton.disabled = true;

    try {
      startBattle(createBattleConfig("iron_guard"), { cinematic: true });

      presentation.setSceneEntity?.("COMPANION_LEFT", {
        enabled: true, baselineScale: 0.58, focusScale: 0.72,
        focusOffsetX: 0, focusOffsetY: 0, parallax: 0.6, depth: 0.28
      });
      presentation.setSceneEntity?.("COMPANION_RIGHT", {
        enabled: true, baselineScale: 0.58, focusScale: 0.72,
        focusOffsetX: 0, focusOffsetY: 0, parallax: 0.6, depth: 0.28
      });

      presentation.setShot("ESTABLISHING", true);
      await cinematicSleep(650, token);
      assertCinematic(token);

      presentation.setShot("PLAYER_FOCUS");
      presentation.stageMotion?.("PLAYER", { dx: 64, dy: -3, dz: 0.04, duration: 850 });
      await cinematicSleep(650, token);
      assertCinematic(token);

      presentation.setShot("ENEMY_FOCUS");
      await cinematicSleep(620, token);

      let broke = false;
      for (let strike = 0; strike < 5; strike += 1) {
        assertCinematic(token);
        presentation.setShot("ATTACK_APPROACH");
        await cinematicSleep(260, token);
        const instanceId = await waitForCardReady("yuri_break_drive", token);
        const resolution = playCard(instanceId);
        if (!resolution) throw new Error("CINEMATIC_CARD_REJECTED");
        await cinematicSleep(300, token);
        if (resolution.broke || window.BreakSystem?.isBroken?.(view.gameState?.combat?.enemy?.breakState)) {
          broke = true;
          break;
        }
        await cinematicSleep(720, token);
      }

      assertCinematic(token);
      if (!broke) {
        broke = await waitForCondition(
          () => Boolean(window.BreakSystem?.isBroken?.(view.gameState?.combat?.enemy?.breakState)),
          token,
          3000
        );
      }
      if (!broke) throw new Error("CINEMATIC_BREAK_NOT_REACHED");

      presentation.setShot("BREAK");
      await cinematicSleep(620, token);

      const burstReady = await waitForCondition(
        () => Boolean(window.BurstSystem?.canUse?.(view.gameState?.combat)),
        token,
        12000
      );
      if (!burstReady) throw new Error("CINEMATIC_BURST_NOT_READY");

      presentation.setShot("BURST");
      await cinematicSleep(160, token);
      useBurst();
      await cinematicSleep(360, token);

      presentation.setShot("IMPACT");
      await cinematicSleep(320, token);
      presentation.setShot("PLAYER_FOCUS");
      await cinematicSleep(900, token);

      return true;
    } catch (error) {
      if (String(error?.message || "") !== "CINEMATIC_CANCELLED") {
        const message = error?.message || "CINEMATIC_ERROR";
        if (view.gameState?.session) view.gameState.session.lastMessage = "Cinematic slice · " + message;
        renderUi();
      }
      return false;
    } finally {
      if (token === cinematicToken) {
        cinematicRunning = false;
        if (cinematicSliceButton) cinematicSliceButton.disabled = false;
        presentation.setSceneEntity?.("COMPANION_LEFT", { enabled: false });
        presentation.setSceneEntity?.("COMPANION_RIGHT", { enabled: false });
      }
    }
  }

  function resetSimulationClock() {
    lastSimulationTime = null;
  }

  function startMainLoop() {
    if (mainLoopFrame !== null) return;

    function frame(now) {
      mainLoopFrame = window.requestAnimationFrame(frame);

      const combat = view.gameState?.combat;
      if (combat && combat.outcome === window.GameState.OUTCOME.IN_PROGRESS) {
        const deltaMs = Math.min(
          500,
          Math.max(0, Number(now) - Number(lastSimulationTime ?? now))
        );
        lastSimulationTime = now;

        window.CombatEngine.advanceTime(view.gameState, deltaMs);
        captureLatestAction(combat);

        if (combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
          completeBattleTelemetry(combat);
          resetSimulationClock();
        }
      } else {
        resetSimulationClock();
      }

      renderUi();
      presentation?.render(view.gameState?.combat || null, now);
    }

    mainLoopFrame = window.requestAnimationFrame(frame);
  }

  function captureLatestAction(combat) {
    const action = combat?.lastAction;
    if (action && action.actionId !== view.lastTelemetryActionId) {
      view.lastTelemetryActionId = action.actionId;
      window.RocketBunnyTelemetry?.recordCombatAction(combat, {
        ...action,
        type: action.actionType
      });

      presentation?.onAction(combat, action);

      if (action.actionType === "AUTO_ATTACK" && action.source === "ENEMY_AUTO_ATTACK") {
        window.RocketBunnyTelemetry?.enemyAttackResolved(combat, action);
      }
      if (action.actionType === "ENEMY_BEHAVIOR" && action.intent?.type === "ATTACK") {
        window.RocketBunnyTelemetry?.enemyAttackResolved(combat, action);
      }
      if (action.broke) {
        window.RocketBunnyTelemetry?.breakStarted(combat, action);
      }
      if (action.actionType === "BREAK_END") {
        window.RocketBunnyTelemetry?.breakEnded(combat);
      }
    }

    const intentKey = combat?.enemyIntent
      ? String(combat.enemyIntent.startedTick) + ":" + String(combat.enemyIntent.type)
      : null;
    if (intentKey && intentKey !== view.lastEnemyIntentKey) {
      view.lastEnemyIntentKey = intentKey;
      window.RocketBunnyTelemetry?.enemyTelegraph(combat, combat.enemyIntent);
    }
    if (!combat?.enemyIntent) view.lastEnemyIntentKey = null;
  }

  function initGameState() {
    view.gameState = window.GameState.createGameState({ playerId: "local-player" });
    renderUi();
  }

  function startBattle(config = null, options = {}) {
    if (!options.cinematic) cancelCinematic();
    resetSimulationClock();
    const battleConfig = config || createBattleConfig();
    currentEnemyId = battleConfig.enemy?.id || currentEnemyId;
    if (battleConfig.progression && typeof window.ProgressionSystem?.normalizeProgression === "function") {
      view.gameState.progression = window.ProgressionSystem.normalizeProgression(battleConfig.progression);
    }

    window.GameState.startBattle(view.gameState, battleConfig);
    view.gameState.combat.progression = view.gameState.progression;
    const combat = view.gameState.combat;
    combatTelemetry.set(combat.battleId, {
      initialPlayerHp: combat.player.hp,
      cards: Object.create(null)
    });

    presentation?.onCombatStart(combat);
    window.RocketBunnyTelemetry?.beginCombat(combat);
    renderUi();
    resetSimulationClock();
  }

  function restartBattle() {
    cancelCinematic();
    startBattle(createBattleConfig(currentEnemyId));
  }

  function nextBattle() {
    startBattle();
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

  function showResult(resolution, combat) {
    presentation?.onAction(combat, resolution);
    if (resultEl) {
      const parts = [];
      if (resolution?.critical) parts.push("CRÍTICO");
      if (resolution?.damage > 0) parts.push("-" + resolution.damage);
      if (resolution?.breakDamage > 0) parts.push("BRK -" + resolution.breakDamage);
      if (resolution?.blockAbsorbed > 0) parts.push("BLOCK " + resolution.blockAbsorbed);
      if (resolution?.broke) parts.push("BREAK");
      setText(resultEl, parts.join(" · ") || "SKILL");
    }
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
      showResult(resolution, combat);
      if (resolution.outcome !== window.GameState.OUTCOME.IN_PROGRESS) {
        resetSimulationClock();
        completeBattleTelemetry(combat);
      }
      renderUi();
      return resolution;
    } catch (error) {
      view.gameState.session.lastMessage = "Skill rechazada · " + error.message;
      renderUi();
      return null;
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
      window.RocketBunnyTelemetry?.burstUsed(combat, resolution);
      view.gameState.session.lastMessage = "BURST · " + resolution.damage + " DAMAGE" +
        (resolution.brokenPayoff ? " · BREAK PAYOFF" : "");
      showResult(resolution, combat);
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
      showResult(resolution, combat);
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
    const statuses = window.StatusSystem.entries(combatant)
      .map((status) => {
        if (status.remainingMs > 0) return status.label + " " + (status.remainingMs / 1000).toFixed(1) + "s";
        if (status.durationTicks > 0) return status.label + " " + (status.durationTicks / 10).toFixed(1) + "s";
        return status.label + " " + status.turns;
      });
    const modifiers = window.ModifierSystem?.entries?.(combatant)
      .map((modifier) => modifier.label + " " + (modifier.remainingMs / 1000).toFixed(1) + "s") || [];
    return [...statuses, ...modifiers].join(" · ") || "—";
  }

  function formatIntent(combat) {
    const intent = combat?.enemyIntent;
    if (!intent) {
      const cooldown = Number(combat?.enemyBehavior?.cooldownMs || 0);
      return cooldown > 0 ? "RECOVERING · " + (cooldown / 1000).toFixed(1) + "s" : "—";
    }
    return intent.label || intent.type || "UNKNOWN";
  }

  function formatAuto(fighter) {
    const attack = fighter?.autoAttack;
    if (!attack) return "—";
    return Math.max(0, attack.cooldownMs / 1000).toFixed(1) + "s";
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
    if (effects.heal) parts.push("HEAL " + effects.heal);
    if (effects.buff) parts.push("BUFF +" + Math.round(Number(effects.buff.amount || 0) * 100) + "% DMG");
    if (effects.cleanse) parts.push("CLEANSE " + effects.cleanse.join("/"));
    if (effects.damageReduction) parts.push("DMG -" + Math.round(Number(effects.damageReduction.amount || 0) * 100) + "%");
    if (effects.multiHit) parts.push("HITS " + effects.multiHit.hits + "×" + effects.multiHit.damagePerHit);
    if (effects.conditional) parts.push("COND");
    return parts.join(" · ") || "UTILITY";
  }

  function cardVisual(definition) {
    if (definition.type === "ATTACK") return { glyph: "✦", role: "ATTACK" };
    if (definition.type === "DEFENSE") return { glyph: "◇", role: "DEFENSE" };
    return { glyph: "⚡", role: "SKILL" };
  }

  function renderHand(combat) {
    if (!handEl) return;

    if (!combat) {
      for (const button of handButtonCache.values()) button.remove();
      handButtonCache.clear();
      handEl.replaceChildren();
      return;
    }

    const visibleIds = new Set();
    combat.cards.hand.forEach((card, index) => {
      const definition = window.CombatEngine.cardDefinitionFor(combat, card.cardId);
      if (!definition) return;

      const cardInstanceId = String(card.instanceId);
      visibleIds.add(cardInstanceId);

      let button = handButtonCache.get(cardInstanceId);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.addEventListener("click", () => {
          const currentCardInstanceId = button.dataset.cardInstanceId;
          if (currentCardInstanceId) playCard(currentCardInstanceId);
        });
        handButtonCache.set(cardInstanceId, button);
      }

      const cooldown = Number(combat.cooldowns[card.cardId] || 0);
      const visual = cardVisual(definition);
      const disabled =
        cinematicRunning ||
        combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS ||
        !window.EnergySystem.canSpend(combat.resources, definition.cost) ||
        cooldown > 0;
      const cooldownText = cooldown > 0 ? "CD " + (cooldown / 1000).toFixed(1) + "s" : "READY";
      const ownerId = definition.characterId || "TEAM";
      const signature = [
        definition.name,
        definition.type,
        definition.cost,
        ownerId,
        cardEffectText(definition),
        definition.description,
        cooldownText,
        disabled
      ].join("|");

      button.className = "card-button card-" + definition.type.toLowerCase();
      button.dataset.cardInstanceId = cardInstanceId;
      button.dataset.ready = String(!disabled);
      button.disabled = disabled;
      button.setAttribute(
        "aria-label",
        definition.name + " · " + visual.role +
        (definition.subrole ? " · " + definition.subrole : "") +
        " · " + definition.cost + " Energy"
      );
      button.setAttribute("aria-keyshortcuts", "Enter Space");

      if (button.dataset.renderSignature !== signature) {
        button.innerHTML =
          "<span class='card-glyph' aria-hidden='true'>" + visual.glyph + "</span>" +
          "<span class='card-main'><strong>" + definition.name + "</strong><span class='card-role'>" + visual.role + "</span></span>" +
          "<span class='card-cost'>⚡ " + definition.cost + "</span>" +
          "<span class='card-owner'>" + ownerId.toUpperCase() + "</span>" +
          "<span class='card-description'>" + definition.description + "</span>" +
          "<span class='card-effect'>" + cardEffectText(definition) + "</span>" +
          "<span class='card-cooldown'>" + cooldownText + "</span>";
        button.dataset.renderSignature = signature;
      }

      const currentChild = handEl.children[index] || null;
      if (currentChild !== button) handEl.insertBefore(button, currentChild);
    });

    for (const [cardInstanceId, button] of handButtonCache) {
      if (visibleIds.has(cardInstanceId)) continue;
      button.remove();
      handButtonCache.delete(cardInstanceId);
    }
  }

  function renderUi() {
    const game = view.gameState;
    const combat = game?.combat;
    const outcome = combat?.outcome || null;
    const ability = window.CharacterAbilitySystem?.definition?.();
    const broken = Boolean(combat && window.BreakSystem.isBroken(combat.enemy.breakState));

    const sceneTimer = combat ? formatCombatTimer(combat.elapsedMs) : "00:00";
    const sceneState = !combat
      ? "READY"
      : outcome === window.GameState.OUTCOME.VICTORY
        ? "VICTORY"
        : outcome === window.GameState.OUTCOME.DEFEAT
          ? "DEFEAT"
          : broken
            ? "BREAK"
            : "LIVE";
    setText(combatTimerEl, sceneTimer);
    setText(combatSceneStateEl, sceneState);

    setText(playerHpEl, combat ? Math.ceil(combat.player.hp) + " / " + combat.player.maxHp : "—");
    setBar(playerHpFillEl, combat?.player?.hp, combat?.player?.maxHp);
    setText(playerBlockEl, combat ? String(Math.ceil(combat.player.block || 0)) : "—");
    setText(playerStatusesEl, combat ? statusText(combat.player) : "—");
    setText(playerAutoEl, combat ? formatAuto(combat.player) : "—");
    setText(playerNameEl, combat?.player?.identity?.displayName || "BŌSŌZOKU");

    setText(enemyNameEl, combat?.enemy?.name || "—");
    setText(enemyHpEl, combat ? Math.ceil(combat.enemy.hp) + " / " + combat.enemy.maxHp : "—");
    setBar(enemyHpFillEl, combat?.enemy?.hp, combat?.enemy?.maxHp);
    setText(enemyBlockEl, combat ? String(Math.ceil(combat.enemy.block || 0)) : "—");

    if (enemyBreakEl) {
      setText(enemyBreakEl, combat
        ? (broken ? "VULNERABLE · " + (combat.enemy.breakState.remainingMs / 1000).toFixed(1) + "s" : Math.ceil(combat.enemy.breakState.current) + " / " + combat.enemy.breakState.max)
        : "—");
    }
    setBar(enemyBreakFillEl, combat?.enemy?.breakState?.current, combat?.enemy?.breakState?.max);
    setText(enemyStatusesEl, combat ? statusText(combat.enemy) : "—");
    setText(enemyAutoEl, combat ? formatAuto(combat.enemy) : "—");

    const intent = combat?.enemyIntent || null;
    setText(enemyIntentEl, combat ? formatIntent(combat) : "—");
    setText(enemyIntentTimeEl, intent ? (Math.max(0, Number(intent.remainingMs || 0)) / 1000).toFixed(1) + "s" : "—");
    setText(enemyIntentIconEl, iconForIntent(intent?.type));

    if (combatTimeEl) setText(combatTimeEl, combat ? (combat.elapsedMs / 1000).toFixed(1) + " s · T" + combat.simulationTick : "—");
    setText(combatPhaseEl, combat ? (broken ? "BREAK WINDOW" : combat.phase) : "READY");

    const energy = combat ? Number(combat.resources.energy || 0) : 0;
    const maxEnergy = combat ? Number(combat.resources.maxEnergy || 0) : 0;
    setText(energyEl, combat ? Math.floor(energy) + " / " + maxEnergy : "—");
    setBar(energyFillEl, energy, maxEnergy);
    setText(energyRegenEl, combat ? combat.resources.energyRegen.toFixed(1) + " /s" : "—");

    const burstCharge = combat ? Number(window.BurstSystem.chargeOf(combat)) : 0;
    const burstMax = combat ? Number(window.BurstSystem.maxChargeOf(combat)) : 100;
    const burstReady = Boolean(combat && window.BurstSystem.canUse(combat));
    setText(burstEl, combat ? Math.floor(burstCharge) + " / " + burstMax : "—");
    setBar(burstFillEl, burstCharge, burstMax);
    setText(burstReadyEl, combat ? (burstReady ? "BURST READY" : "CHARGING") : "CHARGING");
    if (burstReadyEl) burstReadyEl.dataset.ready = String(burstReady);
    if (burstReadyEl) burstReadyEl.className = "resource-subline ready-state" + (burstReady ? " burst-ready" : "");

    if (burstButton) {
      burstButton.disabled = cinematicRunning || !combat || !burstReady;
      burstButton.hidden = !combat || outcome !== window.GameState.OUTCOME.IN_PROGRESS;
      burstButton.textContent = broken ? "BURST · BREAK" : "BURST";
      burstButton.setAttribute("aria-label", broken ? "BURST during BREAK window" : "BURST");
    }

    if (abilityEl) {
      setText(abilityEl, combat ? ability.name + " · " + combat.resources.playerAbilityUses + "/1" : "—");
    }
    if (abilityButton) {
      abilityButton.disabled = cinematicRunning || !combat || !window.CharacterAbilitySystem.canUse(combat);
      abilityButton.hidden = !combat || outcome !== window.GameState.OUTCOME.IN_PROGRESS;
      abilityButton.textContent = ability?.name || "ABILITY";
      abilityButton.setAttribute("aria-label", ability ? ability.name + " · " + ability.condition : "Character ability");
    }

    if (lastActionEl) {
      setText(lastActionEl,
        formatLastAction(combat) +
        (combat?.lastAction?.critical ? " · CRÍTICO" : "") +
        (combat?.lastAction?.blockAbsorbed ? " · BLOCK " + combat.lastAction.blockAbsorbed : "") +
        (combat?.lastAction?.broke ? " · BREAK" : "")
      );
    }
    setText(statusValueEl, outcome || "READY");
    if (statusEl) setText(statusEl, game?.session?.lastMessage || "Esperando una batalla.");

    setHidden(startButton, Boolean(combat));
    setHidden(restartButton, !combat);

    if (breakBannerEl) {
      breakBannerEl.hidden = !broken;
      breakBannerEl.dataset.active = String(broken);
    }
    if (burstBannerEl) {
      burstBannerEl.hidden = !combat || !combat.lastAction || combat.lastAction.actionType !== "BURST";
      burstBannerEl.dataset.active = String(combat?.lastAction?.actionType === "BURST");
    }

    if (resultEl && combat) {
      if (outcome === window.GameState.OUTCOME.VICTORY) setText(resultEl, "VICTORY");
      else if (outcome === window.GameState.OUTCOME.DEFEAT) setText(resultEl, "DEFEAT");
      else if (broken) setText(resultEl, "BREAK WINDOW · BURST");
      else if (combat.lastAction?.damage > 0) {
        setText(resultEl,
          (combat.lastAction.critical ? "CRÍTICO · " : "") +
          "-" + combat.lastAction.damage +
          (combat.lastAction.breakDamage ? " · BRK " + combat.lastAction.breakDamage : "")
        );
      } else if (!resultEl.textContent || resultEl.textContent === "VICTORY" || resultEl.textContent === "DEFEAT") {
        setText(resultEl, "");
      }
    } else if (resultEl) {
      setText(resultEl, "");
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

  window.CariCombat = Object.freeze({
    startBattle,
    restartBattle,
    nextBattle,
    playCinematicSlice,
    actionButton: playCard,
    useAbility,
    useBurst,
    getGameState: () => view.gameState,
    getPresentation: () => presentation
  });

  startButton?.addEventListener("click", () => startBattle());
  cinematicSliceButton?.addEventListener("click", () => { void playCinematicSlice(); });
  burstButton?.addEventListener("click", useBurst);
  abilityButton?.addEventListener("click", useAbility);
  restartButton?.addEventListener("click", restartBattle);
  window.addEventListener("resize", resizeCanvas, { passive: true });

  initGameState();
  resizeCanvas();
  startMainLoop();
})();
