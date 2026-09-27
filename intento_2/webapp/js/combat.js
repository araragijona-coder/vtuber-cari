(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d") ?? null;
  const statusEl = document.getElementById("combat-status");
  const resultEl = document.getElementById("combat-result");
  const playerHpEl = document.getElementById("combat-player-hp");
  const enemyHpEl = document.getElementById("combat-enemy-hp");
  const turnEl = document.getElementById("combat-turn");
  const actorEl = document.getElementById("combat-actor");
  const lastActionEl = document.getElementById("combat-last-action");
  const statusValueEl = document.getElementById("combat-status-value");
  const startButton = document.getElementById("start-battle");
  const attackButton = document.getElementById("attack-action");
  const defendButton = document.getElementById("defend-action");
  const skillButton = document.getElementById("skill-action");
  const restartButton = document.getElementById("restart-battle");
  let battleSequence = 0;

  const view = {
    gameState: null,
    imageCache: new Map(),
    lastWidth: 0,
    lastHeight: 0,
    impact: null
  };

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasExactKeys(object, keys) {
    if (!isPlainObject(object)) return false;
    const actual = Object.keys(object).sort();
    const expected = [...keys].sort();
    return actual.length === expected.length && actual.every((key, i) => key === expected[i]);
  }

  function isCombatant(value) {
    return hasExactKeys(value, [
      "slot", "character_id", "name", "level", "hp", "max_hp", "card_hd_url", "sprite_base_url"
    ]) &&
      Number.isInteger(value.slot) &&
      typeof value.character_id === "string" &&
      typeof value.name === "string" &&
      Number.isInteger(value.level) &&
      Number.isFinite(value.hp) &&
      Number.isFinite(value.max_hp) &&
      typeof value.card_hd_url === "string" &&
      typeof value.sprite_base_url === "string";
  }

  function validateCombatInitDTO(dto) {
    return hasExactKeys(dto, ["battle_id", "player_team", "enemy_team"]) &&
      typeof dto.battle_id === "string" &&
      Array.isArray(dto.player_team) && dto.player_team.every(isCombatant) &&
      Array.isArray(dto.enemy_team) && dto.enemy_team.every(isCombatant);
  }

  function validateTurnResultDTO(dto) {
    return hasExactKeys(dto, [
      "turn_number", "action_type", "attacker", "target", "combat_math", "post_action_state"
    ]) &&
      Number.isInteger(dto.turn_number) &&
      typeof dto.action_type === "string" &&
      isPlainObject(dto.attacker) &&
      ["player", "enemy"].includes(dto.attacker.team) &&
      Number.isInteger(dto.attacker.slot) &&
      typeof dto.attacker.trigger_cut_in === "boolean" &&
      isPlainObject(dto.target) &&
      ["player", "enemy"].includes(dto.target.team) &&
      Number.isInteger(dto.target.slot) &&
      isPlainObject(dto.combat_math) &&
      Number.isFinite(dto.combat_math.damage_dealt) &&
      typeof dto.combat_math.is_critical === "boolean" &&
      Number.isFinite(dto.combat_math.elemental_modifier) &&
      isPlainObject(dto.post_action_state) &&
      Number.isFinite(dto.post_action_state.target_remaining_hp) &&
      typeof dto.post_action_state.is_target_dead === "boolean";
  }

  function createDemoBattle() {
    battleSequence += 1;
    const battleId = typeof window.generateUUID === "function"
      ? window.generateUUID()
      : "battle-mvp-" + Date.now() + "-" + battleSequence;

    return {
      battleId,
      player: {
        id: "player-demo",
        hp: 120,
        maxHp: 120,
        stats: { atk: 20, def: 5, skillDamage: 40 }
      },
      enemy: {
        id: "enemy-demo-" + battleSequence,
        hp: 100 + Math.max(0, battleSequence - 1) * 10,
        maxHp: 100 + Math.max(0, battleSequence - 1) * 10,
        stats: { atk: 15, def: 3, skillDamage: 30 }
      }
    };
  }

  function initGameState() {
    view.gameState = window.GameState.createGameState({ playerId: "local-player" });
    view.gameState.screen = "MAIN";
    renderUi();
  }

  function startBattle(config = null) {
    window.GameState.startBattle(view.gameState, config || createDemoBattle());
    view.impact = null;
    renderUi();
  }

  function showResult(resolution) {
    view.impact = {
      team: resolution.targetId === view.gameState.combat.player.id ? "player" : "enemy",
      damage: resolution.damage,
      critical: resolution.critical,
      startedAt: performance.now()
    };
  }

  function actionButton(type) {
    if (!view.gameState?.combat) return;
    if (view.gameState.combat.activeActor !== "player") return;
    if (view.gameState.combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return;

    try {
      const action = window.GameActions.createPlayerAction(view.gameState, type);
      const resolution = window.CombatEngine.resolveAction(view.gameState, action);
      showResult(resolution);
      renderUi();

      if (resolution.outcome === window.GameState.OUTCOME.IN_PROGRESS &&
          view.gameState.combat.activeActor === "enemy") {
        window.setTimeout(runEnemyTurn, 260);
      }
    } catch (error) {
      view.gameState.session.lastMessage = "Acción rechazada · " + error.message;
      renderUi();
    }
  }

  function runEnemyTurn() {
    if (!view.gameState?.combat ||
        view.gameState.combat.outcome !== window.GameState.OUTCOME.IN_PROGRESS ||
        view.gameState.combat.activeActor !== "enemy") {
      return;
    }

    const action = window.EnemyAI.decide(view.gameState);
    if (!action) {
      renderUi();
      return;
    }

    try {
      const resolution = window.CombatEngine.resolveAction(view.gameState, action);
      showResult(resolution);
      renderUi();
    } catch (error) {
      view.gameState.session.lastMessage = "Turno enemigo rechazado · " + error.message;
      renderUi();
    }
  }

  function formatLastAction(combat) {
    const lastAction = combat?.lastAction;
    if (!lastAction) return "—";

    if (lastAction.actorId === combat.enemy.id) {
      return "ENEMY " + lastAction.actionType;
    }

    return lastAction.actionType;
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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function requestImage(url) {
    if (!url || view.imageCache.has(url)) return view.imageCache.get(url) || null;
    const entry = { status: "loading", image: null };
    view.imageCache.set(url, entry);
    const image = new Image();
    image.onload = () => { entry.status = "ready"; entry.image = image; };
    image.onerror = () => { entry.status = "failed"; };
    image.src = url;
    return entry;
  }

  function drawText(text, x, y, size, weight, align = "left", color = "#fff") {
    context.font = weight + " " + size + "px system-ui, sans-serif";
    context.textAlign = align;
    context.textBaseline = "top";
    context.fillStyle = color;
    context.fillText(text, x, y);
  }

  function drawHpBar(x, y, width, height, hp, maxHp) {
    const ratio = clamp(hp / Math.max(1, maxHp), 0, 1);
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

    const imageEntry = fighter.sprite ? requestImage(fighter.sprite) : null;
    if (imageEntry?.status === "ready") {
      const image = imageEntry.image;
      const scale = Math.min((width - 16) / image.naturalWidth, (height - 80) / image.naturalHeight);
      const dw = image.naturalWidth * scale;
      const dh = image.naturalHeight * scale;
      context.drawImage(image, x + (width - dw) / 2, y + 8, dw, dh);
    } else {
      context.fillStyle = team === "player" ? "rgba(61,132,194,.38)" : "rgba(194,61,103,.38)";
      context.fillRect(x + 8, y + 8, width - 16, height - 78);
      drawText("SPRITE PLACEHOLDER", x + width / 2, y + height / 2 - 8, 13, "700", "center", "rgba(255,255,255,.65)");
    }

    drawText(fighter.id, x + 10, y + height - 58, 13, "700");
    drawText("HP " + Math.round(fighter.hp) + " / " + Math.round(fighter.maxHp), x + 10, y + height - 38, 12, "600", "left", "rgba(255,255,255,.72)");
    drawHpBar(x + 10, y + height - 20, width - 20, 8, fighter.hp, fighter.maxHp);
  }

  function drawFrame(now = performance.now()) {
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width !== view.lastWidth || rect.height !== view.lastHeight) resizeCanvas();

    const width = view.lastWidth;
    const height = view.lastHeight;
    context.clearRect(0, 0, width, height);

    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a1020");
    gradient.addColorStop(1, "#070b14");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const game = view.gameState;
    if (!game?.combat) {
      drawText("ROCKET BUNNY PETTY", width / 2, height * .35, 24, "800", "center");
      drawText("Iniciá una batalla MVP para comenzar.", width / 2, height * .35 + 38, 14, "500", "center", "rgba(255,255,255,.65)");
      window.requestAnimationFrame(drawFrame);
      return;
    }

    const combat = game.combat;
    drawText("BATTLE  " + combat.battleId, width / 2, 14, 14, "800", "center", "rgba(255,255,255,.8)");
    drawText("PLAYER", 18, 42, 12, "800", "left", "#75c8ff");
    drawText("ENEMY", width - 18, 42, 12, "800", "right", "#ff83aa");

    drawFighter(combat.player, 14, 62, width / 2 - 28, height - 120, "player");
    drawFighter(combat.enemy, width / 2 + 14, 62, width / 2 - 28, height - 120, "enemy");

    if (view.impact) {
      const elapsed = now - view.impact.startedAt;
      const duration = 850;
      if (elapsed >= duration) {
        view.impact = null;
      } else {
        const pointX = view.impact.team === "player" ? width * .25 : width * .75;
        const pointY = height * .62 - (elapsed / duration) * 50;
        context.save();
        context.globalAlpha = 1 - elapsed / duration;
        drawText(
          "-" + Math.round(view.impact.damage),
          pointX,
          pointY,
          24,
          "800",
          "center",
          view.impact.critical ? "#ffd86b" : "#fff"
        );
        context.restore();
      }
    }

    window.requestAnimationFrame(drawFrame);
  }

  function renderUi() {
    const game = view.gameState;
    const combat = game?.combat;
    const outcome = combat?.outcome || null;
    const inProgress = outcome === window.GameState.OUTCOME.IN_PROGRESS;
    const playerTurn = inProgress && combat.activeActor === "player";

    if (playerHpEl) {
      playerHpEl.textContent = combat ? Math.round(combat.player.hp) + " / " + Math.round(combat.player.maxHp) : "—";
    }
    if (enemyHpEl) {
      enemyHpEl.textContent = combat ? Math.round(combat.enemy.hp) + " / " + Math.round(combat.enemy.maxHp) : "—";
    }
    if (turnEl) turnEl.textContent = combat ? String(combat.turn) : "—";
    if (actorEl) actorEl.textContent = combat
      ? (combat.activeActor === "player" ? "PLAYER" : "ENEMY")
      : "—";
    if (lastActionEl) lastActionEl.textContent = formatLastAction(combat);

    if (statusValueEl) {
      statusValueEl.textContent = outcome || "READY";
    }

    if (resultEl) {
      resultEl.textContent = outcome === window.GameState.OUTCOME.VICTORY
        ? "VICTORY"
        : outcome === window.GameState.OUTCOME.DEFEAT
          ? "DEFEAT"
          : "";
    }

    if (statusEl) {
      statusEl.textContent = game?.session?.lastMessage || "Esperando una batalla.";
    }

    if (attackButton) attackButton.disabled = !playerTurn;
    if (defendButton) defendButton.disabled = !playerTurn;
    if (skillButton) skillButton.disabled = !playerTurn || combat.resources.playerSkill <= 0;

    if (startButton) startButton.hidden = Boolean(combat);
    if (restartButton) restartButton.hidden = !combat || inProgress;
  }

  window.CariCombat = Object.freeze({
    validateCombatInitDTO,
    validateTurnResultDTO,
    startBattle,
    actionButton,
    getGameState: () => view.gameState
  });

  startButton?.addEventListener("click", startBattle);
  attackButton?.addEventListener("click", () => actionButton(window.GameActions.ACTION_TYPES.ATTACK));
  defendButton?.addEventListener("click", () => actionButton(window.GameActions.ACTION_TYPES.DEFEND));
  skillButton?.addEventListener("click", () => actionButton(window.GameActions.ACTION_TYPES.SKILL));
  restartButton?.addEventListener("click", startBattle);
  window.addEventListener("resize", resizeCanvas, { passive: true });

  initGameState();
  resizeCanvas();
  drawFrame();
})();
