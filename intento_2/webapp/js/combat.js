(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d") ?? null;
  const simulateButton = document.getElementById("simulate-turn");
  const combatStatus = document.getElementById("combat-status");

  const state = {
    combatInit: null,
    turnResult: null,
    currentHp: new Map(),
    imageCache: new Map(),
    simulationTurn: 0,
    lastRenderWidth: 0,
    lastRenderHeight: 0,
    impact: null
  };

  function isPlainObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function hasExactKeys(object, keys) {
    if (!isPlainObject(object)) return false;

    const actual = Object.keys(object).sort();
    const expected = [...keys].sort();

    return actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]);
  }

  function isString(value) {
    return typeof value === "string";
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isInteger(value) {
    return Number.isInteger(value);
  }

  function isBoolean(value) {
    return typeof value === "boolean";
  }

  function isTeam(value) {
    return value === "player" || value === "enemy";
  }

  function validateCombatant(value) {
    return hasExactKeys(value, [
      "slot",
      "character_id",
      "name",
      "level",
      "hp",
      "max_hp",
      "card_hd_url",
      "sprite_base_url"
    ]) &&
      isInteger(value.slot) &&
      isString(value.character_id) &&
      isString(value.name) &&
      isInteger(value.level) &&
      isFiniteNumber(value.hp) &&
      isFiniteNumber(value.max_hp) &&
      isString(value.card_hd_url) &&
      isString(value.sprite_base_url);
  }

  function validateTeam(value) {
    return Array.isArray(value) && value.every(validateCombatant);
  }

  function validateCombatInitDTO(dto) {
    return hasExactKeys(dto, [
      "battle_id",
      "player_team",
      "enemy_team"
    ]) &&
      isString(dto.battle_id) &&
      validateTeam(dto.player_team) &&
      validateTeam(dto.enemy_team);
  }

  function validateAttacker(value) {
    return hasExactKeys(value, [
      "team",
      "slot",
      "trigger_cut_in"
    ]) &&
      isTeam(value.team) &&
      isInteger(value.slot) &&
      isBoolean(value.trigger_cut_in);
  }

  function validateTarget(value) {
    return hasExactKeys(value, [
      "team",
      "slot"
    ]) &&
      isTeam(value.team) &&
      isInteger(value.slot);
  }

  function validateCombatMath(value) {
    return hasExactKeys(value, [
      "damage_dealt",
      "is_critical",
      "elemental_modifier"
    ]) &&
      isFiniteNumber(value.damage_dealt) &&
      isBoolean(value.is_critical) &&
      isFiniteNumber(value.elemental_modifier);
  }

  function validatePostActionState(value) {
    return hasExactKeys(value, [
      "target_remaining_hp",
      "is_target_dead"
    ]) &&
      isFiniteNumber(value.target_remaining_hp) &&
      isBoolean(value.is_target_dead);
  }

  function validateTurnResultDTO(dto) {
    return hasExactKeys(dto, [
      "turn_number",
      "action_type",
      "attacker",
      "target",
      "combat_math",
      "post_action_state"
    ]) &&
      isInteger(dto.turn_number) &&
      isString(dto.action_type) &&
      validateAttacker(dto.attacker) &&
      validateTarget(dto.target) &&
      validateCombatMath(dto.combat_math) &&
      validatePostActionState(dto.post_action_state);
  }

  function combatantKey(team, slot) {
    return team + ":" + String(slot);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function allCombatants() {
    if (!state.combatInit) return [];
    return [
      ...state.combatInit.player_team.map((value) => ({ ...value, team: "player" })),
      ...state.combatInit.enemy_team.map((value) => ({ ...value, team: "enemy" }))
    ];
  }

  function findCombatant(team, slot) {
    return allCombatants().find((value) =>
      value.team === team && value.slot === slot
    ) ?? null;
  }

  function resetCurrentHp() {
    state.currentHp.clear();

    for (const combatant of allCombatants()) {
      const key = combatantKey(combatant.team, combatant.slot);
      state.currentHp.set(
        key,
        clamp(combatant.hp, 0, Math.max(0, combatant.max_hp))
      );
    }
  }

  function currentHpFor(combatant) {
    const key = combatantKey(combatant.team, combatant.slot);

    if (!state.currentHp.has(key)) {
      state.currentHp.set(
        key,
        clamp(combatant.hp, 0, Math.max(0, combatant.max_hp))
      );
    }

    return state.currentHp.get(key);
  }

  function applyTurnResult(dto) {
    const target = findCombatant(dto.target.team, dto.target.slot);
    if (!target) return;

    state.currentHp.set(
      combatantKey(dto.target.team, dto.target.slot),
      clamp(
        dto.post_action_state.target_remaining_hp,
        0,
        Math.max(0, target.max_hp)
      )
    );
  }

  function setStatus(message) {
    if (combatStatus) {
      combatStatus.textContent = message;
    }
  }

  function resizeCanvas() {
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.lastRenderWidth = rect.width;
    state.lastRenderHeight = rect.height;
  }

  function getImageUrls(combatant) {
    return [combatant.card_hd_url, combatant.sprite_base_url]
      .filter((value, index, array) =>
        value.length > 0 && array.indexOf(value) === index
      );
  }

  function requestImage(url) {
    if (!url) return null;

    const existing = state.imageCache.get(url);
    if (existing) return existing;

    const entry = {
      status: "loading",
      image: null
    };
    state.imageCache.set(url, entry);

    const image = new Image();
    image.onload = () => {
      entry.status = "ready";
      entry.image = image;
    };
    image.onerror = () => {
      entry.status = "failed";
      entry.image = null;
    };
    image.src = url;

    return entry;
  }

  function findLoadedImage(combatant) {
    for (const url of getImageUrls(combatant)) {
      const entry = requestImage(url);
      if (entry?.status === "ready" && entry.image) {
        return entry.image;
      }
    }

    return null;
  }

  function drawBackground(width, height) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a1020");
    gradient.addColorStop(0.58, "#17213a");
    gradient.addColorStop(1, "#070b14");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const arenaGradient = context.createRadialGradient(
      width / 2,
      height * 0.58,
      30,
      width / 2,
      height * 0.58,
      Math.max(width, height) * 0.65
    );
    arenaGradient.addColorStop(0, "rgba(60, 87, 140, 0.34)");
    arenaGradient.addColorStop(1, "rgba(8, 12, 24, 0)");
    context.fillStyle = arenaGradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(180, 208, 255, 0.10)";
    context.lineWidth = 1;

    for (let x = 0; x <= width; x += Math.max(50, width / 12)) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = 0; y <= height; y += Math.max(50, height / 8)) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.fillStyle = "rgba(255,255,255,0.055)";
    context.beginPath();
    context.ellipse(
      width / 2,
      height * 0.64,
      Math.min(width * 0.30, 360),
      Math.min(height * 0.10, 70),
      0,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  function drawText(text, x, y, size, weight, align = "left", color = "#ffffff") {
    context.font = weight + " " + size + "px system-ui, sans-serif";
    context.textAlign = align;
    context.textBaseline = "top";
    context.fillStyle = color;
    context.fillText(text, x, y);
  }

  function drawHpBar(x, y, width, height, hp, maxHp) {
    const safeMax = Math.max(1, maxHp);
    const ratio = clamp(hp / safeMax, 0, 1);

    context.fillStyle = "rgba(0,0,0,0.48)";
    context.fillRect(x, y, width, height);

    context.fillStyle = ratio > 0.5
      ? "#39d98a"
      : ratio > 0.25
        ? "#f1c75b"
        : "#ff6b6b";
    context.fillRect(x, y, width * ratio, height);

    context.strokeStyle = "rgba(255,255,255,0.26)";
    context.lineWidth = 1;
    context.strokeRect(x, y, width, height);
  }

  function drawPlaceholder(x, y, width, height, combatant) {
    const hue = combatant.team === "player" ? 211 : 342;
    context.fillStyle = "hsl(" + hue + " 42% 24% / 0.95)";
    context.fillRect(x, y, width, height);

    context.strokeStyle = "rgba(255,255,255,0.22)";
    context.strokeRect(x, y, width, height);

    drawText(
      "SPRITE",
      x + width / 2,
      y + height * 0.36,
      11,
      "700",
      "center",
      "rgba(255,255,255,0.62)"
    );
    drawText(
      "NO IMAGE",
      x + width / 2,
      y + height * 0.54,
      12,
      "600",
      "center",
      "rgba(255,255,255,0.46)"
    );
  }

  function drawImageContain(image, x, y, width, height) {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;

    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function drawCombatant(combatant, x, y, width, height) {
    const hp = currentHpFor(combatant);
    const maxHp = Math.max(1, combatant.max_hp);
    const imageHeight = Math.max(84, height - 92);
    const image = findLoadedImage(combatant);

    context.fillStyle = "rgba(15, 20, 35, 0.88)";
    context.fillRect(x, y, width, height);
    context.strokeStyle = combatant.team === "player"
      ? "rgba(106, 181, 255, 0.55)"
      : "rgba(255, 111, 150, 0.55)";
    context.lineWidth = 1.5;
    context.strokeRect(x, y, width, height);

    if (image) {
      drawImageContain(image, x + 8, y + 8, width - 16, imageHeight - 12);
    } else {
      drawPlaceholder(x + 8, y + 8, width - 16, imageHeight - 12, combatant);
    }

    const labelY = y + imageHeight;
    const label = "#" + combatant.slot + " " + combatant.name;

    drawText(
      label.length > 24 ? label.slice(0, 23) + "…" : label,
      x + 8,
      labelY + 2,
      13,
      "700"
    );
    drawText(
      "Lv." + combatant.level,
      x + width - 8,
      labelY + 2,
      11,
      "600",
      "right",
      "rgba(255,255,255,0.62)"
    );

    drawHpBar(x + 8, labelY + 23, width - 16, 9, hp, maxHp);
    drawText(
      Math.round(hp) + " / " + Math.round(maxHp),
      x + 8,
      labelY + 36,
      11,
      "600",
      "left",
      "rgba(255,255,255,0.72)"
    );
  }

  function drawTeam(team, x, y, width, maxHeight) {
    const characters = team === "player"
      ? state.combatInit.player_team
      : state.combatInit.enemy_team;

    if (characters.length === 0) {
      drawText("Sin combatientes", x, y + 54, 14, "600", "left", "rgba(255,255,255,0.45)");
      return;
    }

    const columns = characters.length > 1 && width >= 250 ? 2 : 1;
    const gap = 10;
    const cardWidth = Math.max(120, (width - gap * (columns - 1)) / columns);
    const rows = Math.ceil(characters.length / columns);
    const rowGap = 10;
    const cardHeight = Math.max(
      170,
      Math.min(235, (maxHeight - 70 - rowGap * (rows - 1)) / rows)
    );

    characters.forEach((combatant, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      drawCombatant(
        { ...combatant, team },
        x + column * (cardWidth + gap),
        y + 52 + row * (cardHeight + rowGap),
        cardWidth,
        cardHeight
      );
    });
  }

  function impactTargetPosition() {
    if (!state.impact || !state.combatInit) return null;

    const target = findCombatant(
      state.impact.team,
      state.impact.slot
    );
    if (!target) return null;

    const width = state.lastRenderWidth;
    const height = state.lastRenderHeight;
    const sectionWidth = width / 2 - 28;
    const teamX = state.impact.team === "player" ? 14 : width / 2 + 14;
    const team = state.impact.team === "player"
      ? state.combatInit.player_team
      : state.combatInit.enemy_team;
    const index = team.findIndex((value) => value.slot === state.impact.slot);

    if (index < 0) return null;

    const columns = team.length > 1 && sectionWidth >= 250 ? 2 : 1;
    const gap = 10;
    const cardWidth = Math.max(120, (sectionWidth - gap * (columns - 1)) / columns);
    const column = index % columns;
    const row = Math.floor(index / columns);
    const rows = Math.ceil(team.length / columns);
    const rowGap = 10;
    const cardHeight = Math.max(
      170,
      Math.min(235, (height - 90 - rowGap * (rows - 1)) / rows)
    );

    return {
      x: teamX + column * (cardWidth + gap) + cardWidth / 2,
      y: 76 + row * (cardHeight + rowGap) + 16
    };
  }

  function drawImpact(now) {
    if (!state.impact) return;

    const elapsed = now - state.impact.startedAt;
    const duration = 950;

    if (elapsed >= duration) {
      state.impact = null;
      return;
    }

    const point = impactTargetPosition();
    if (!point) return;

    const progress = elapsed / duration;
    const alpha = 1 - progress;
    const rise = progress * 56;
    const scale = 1 + (state.impact.critical ? Math.sin(progress * Math.PI) * 0.16 : 0);

    context.save();
    context.globalAlpha = alpha;
    context.translate(point.x, point.y - rise);
    context.scale(scale, scale);

    drawText(
      state.impact.critical
        ? "CRÍTICO  -" + Math.round(state.impact.damage)
        : "-" + Math.round(state.impact.damage),
      0,
      0,
      state.impact.critical ? 24 : 21,
      "800",
      "center",
      state.impact.critical ? "#ffd86b" : "#ffffff"
    );

    if (state.impact.critical) {
      drawText(
        "★",
        0,
        -26,
        16,
        "800",
        "center",
        "#ff9d5c"
      );
    }
    context.restore();
  }

  function drawCombatFrame(now = performance.now()) {
    if (!canvas || !context) return;

    if (
      state.lastRenderWidth !== canvas.getBoundingClientRect().width ||
      state.lastRenderHeight !== canvas.getBoundingClientRect().height
    ) {
      resizeCanvas();
    }

    const width = state.lastRenderWidth;
    const height = state.lastRenderHeight;

    context.clearRect(0, 0, width, height);
    drawBackground(width, height);

    if (!state.combatInit) {
      drawText("Esperando CombatInitDTO…", width / 2, height / 2 - 18, 20, "700", "center");
      drawText(
        "Usá «Simular Turno» para abrir una batalla de prueba local.",
        width / 2,
        height / 2 + 16,
        13,
        "500",
        "center",
        "rgba(255,255,255,0.62)"
      );
      drawImpact(now);
      window.requestAnimationFrame(drawCombatFrame);
      return;
    }

    drawText(
      "BATTLE  " + state.combatInit.battle_id,
      width / 2,
      15,
      14,
      "700",
      "center",
      "rgba(255,255,255,0.78)"
    );
    drawText(
      "PLAYER",
      18,
      42,
      12,
      "800",
      "left",
      "#75c8ff"
    );
    drawText(
      "ENEMY",
      width - 18,
      42,
      12,
      "800",
      "right",
      "#ff83aa"
    );

    drawTeam("player", 14, 62, width / 2 - 28, height - 62);
    drawTeam("enemy", width / 2 + 14, 62, width / 2 - 28, height - 62);

    if (state.turnResult) {
      const turn = state.turnResult;
      const criticalText = turn.combat_math.is_critical ? " · CRÍTICO" : "";
      drawText(
        "TURNO " + turn.turn_number + " · " + turn.action_type + criticalText,
        width / 2,
        height - 30,
        12,
        "700",
        "center",
        "rgba(255,255,255,0.72)"
      );
    }

    drawImpact(now);
    window.requestAnimationFrame(drawCombatFrame);
  }

  function logCombatInitDTO(dto) {
    console.log("[CariCombat] CombatInitDTO ready:", {
      battle_id: dto.battle_id,
      player_team: dto.player_team,
      enemy_team: dto.enemy_team
    });
  }

  function logTurnResultDTO(dto) {
    console.log("[CariCombat] TurnResultDTO ready:", {
      turn_number: dto.turn_number,
      action_type: dto.action_type,
      attacker: dto.attacker,
      target: dto.target,
      combat_math: dto.combat_math,
      post_action_state: dto.post_action_state
    });
  }

  function receiveCombatInit(dto) {
    if (!validateCombatInitDTO(dto)) {
      console.error(
        "[CariCombat] Invalid CombatInitDTO. Expected exactly: " +
        "battle_id, player_team, enemy_team."
      );
      return false;
    }

    state.combatInit = structuredClone(dto);
    state.turnResult = null;
    state.simulationTurn = 0;
    resetCurrentHp();

    for (const combatant of allCombatants()) {
      for (const url of getImageUrls(combatant)) {
        requestImage(url);
      }
    }

    logCombatInitDTO(state.combatInit);
    setStatus("CombatInitDTO recibido · " + state.combatInit.battle_id);
    return true;
  }

  function receiveTurnResult(dto) {
    if (!validateTurnResultDTO(dto)) {
      console.error(
        "[CariCombat] Invalid TurnResultDTO. Expected exactly: " +
        "turn_number, action_type, attacker, target, combat_math, " +
        "post_action_state."
      );
      return false;
    }

    state.turnResult = structuredClone(dto);
    applyTurnResult(state.turnResult);

    state.impact = {
      team: dto.target.team,
      slot: dto.target.slot,
      damage: dto.combat_math.damage_dealt,
      critical: dto.combat_math.is_critical,
      startedAt: performance.now()
    };

    logTurnResultDTO(state.turnResult);
    setStatus(
      "TurnResultDTO recibido · turno " + dto.turn_number +
      (dto.combat_math.is_critical ? " · crítico" : "")
    );
    return true;
  }

  function receiveCombatInitJSON(json) {
    try {
      return receiveCombatInit(JSON.parse(json));
    } catch (error) {
      console.error("[CariCombat] Invalid CombatInitDTO JSON:", error);
      return false;
    }
  }

  function receiveTurnResultJSON(json) {
    try {
      return receiveTurnResult(JSON.parse(json));
    } catch (error) {
      console.error("[CariCombat] Invalid TurnResultDTO JSON:", error);
      return false;
    }
  }

  function receiveCombatState(dto) {
    return receiveCombatInit(dto);
  }

  function receiveCombatResult(dto) {
    return receiveTurnResult(dto);
  }

  function receiveCombatEvent(_dto) {}

  function receivePlayerState(_dto) {}

  function createDemoCombat() {
    return {
      battle_id: "demo-pages",
      player_team: [
        {
          slot: 0,
          character_id: "cari-demo",
          name: "Cari",
          level: 12,
          hp: 240,
          max_hp: 240,
          card_hd_url: "",
          sprite_base_url: ""
        },
        {
          slot: 1,
          character_id: "ally-demo",
          name: "Aliada",
          level: 10,
          hp: 185,
          max_hp: 185,
          card_hd_url: "",
          sprite_base_url: ""
        }
      ],
      enemy_team: [
        {
          slot: 0,
          character_id: "enemy-demo",
          name: "Rival",
          level: 11,
          hp: 260,
          max_hp: 260,
          card_hd_url: "",
          sprite_base_url: ""
        },
        {
          slot: 1,
          character_id: "enemy-2-demo",
          name: "Guardia",
          level: 9,
          hp: 170,
          max_hp: 170,
          card_hd_url: "",
          sprite_base_url: ""
        }
      ]
    };
  }

  function livingTarget(team) {
    const candidates = team === "player"
      ? state.combatInit.player_team
      : state.combatInit.enemy_team;

    return candidates.find((combatant) => currentHpFor({ ...combatant, team }) > 0) ?? null;
  }

  function simulateTurn() {
    if (!state.combatInit) {
      receiveCombatInit(createDemoCombat());
      setStatus("Combate demo local listo · URLs de imagen vacías → placeholder activo.");
    }

    const nextTurn = state.simulationTurn + 1;
    const attackingTeam = nextTurn % 2 === 1 ? "player" : "enemy";
    const defendingTeam = attackingTeam === "player" ? "enemy" : "player";
    const attacker = livingTarget(attackingTeam);
    const target = livingTarget(defendingTeam);

    if (!attacker || !target) {
      setStatus("Combate terminado · presioná «Simular Turno» después de cargar un nuevo CombatInitDTO.");
      return false;
    }

    const critical = nextTurn % 4 === 0;
    const baseDamage = 18 + ((nextTurn - 1) % 3) * 7;
    const damage = critical ? baseDamage * 1.5 : baseDamage;
    const remainingHp = clamp(
      currentHpFor({ ...target, team: defendingTeam }) - damage,
      0,
      target.max_hp
    );

    const dto = {
      turn_number: nextTurn,
      action_type: critical ? "critical_attack" : "basic_attack",
      attacker: {
        team: attackingTeam,
        slot: attacker.slot,
        trigger_cut_in: critical
      },
      target: {
        team: defendingTeam,
        slot: target.slot
      },
      combat_math: {
        damage_dealt: damage,
        is_critical: critical,
        elemental_modifier: 1
      },
      post_action_state: {
        target_remaining_hp: remainingHp,
        is_target_dead: remainingHp <= 0
      }
    };

    state.simulationTurn = nextTurn;
    return receiveTurnResult(dto);
  }

  window.CariCombat = Object.freeze({
    canvas,
    context,
    resizeCanvas,
    validateCombatInitDTO,
    validateTurnResultDTO,
    receiveCombatInit,
    receiveTurnResult,
    receiveCombatInitJSON,
    receiveTurnResultJSON,
    receiveCombatState,
    receiveCombatResult,
    receiveCombatEvent,
    receivePlayerState,
    simulateTurn
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });

  simulateButton?.addEventListener("click", simulateTurn);

  resizeCanvas();
  drawCombatFrame();
})();