(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d", { alpha: false }) ?? null;
  const simulateButton = document.getElementById("simulate-turn");
  const combatStatus = document.getElementById("combat-status");

  const ANIMATION = Object.freeze({
    IDLE: Object.freeze({ frames: [0, 1, 2, 3], fps: 7, loop: true }),
    ATTACK: Object.freeze({ frames: [4, 5, 6, 7], fps: 18, loop: false }),
    HIT: Object.freeze({ frames: [8, 9, 10], fps: 14, loop: false }),
    DODGE: Object.freeze({ frames: [12, 13, 14, 15], fps: 20, loop: false })
  });

  const state = {
    combatInit: null,
    turnResult: null,
    currentHp: new Map(),
    imageCache: new Map(),
    animationStates: new Map(),
    simulationTurn: 0,
    lastRenderWidth: 0,
    lastRenderHeight: 0,
    impact: null,
    serverState: null,
    lastCorrection: null,
    frozen: false,
    lastFrameAt: 0
  };

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
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

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (_error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function validateCombatant(value) {
    return isPlainObject(value) &&
      isInteger(value.slot) &&
      isString(value.character_id) &&
      isString(value.name) &&
      isInteger(value.level) &&
      isFiniteNumber(value.hp) &&
      isFiniteNumber(value.max_hp) &&
      isString(value.card_hd_url) &&
      isString(value.sprite_base_url);
  }

  function validateCombatInitDTO(dto) {
    return isPlainObject(dto) &&
      isString(dto.battle_id) &&
      Array.isArray(dto.player_team) &&
      dto.player_team.every(validateCombatant) &&
      Array.isArray(dto.enemy_team) &&
      dto.enemy_team.every(validateCombatant);
  }

  function validateTurnResultDTO(dto) {
    return isPlainObject(dto) &&
      isInteger(dto.turn_number) &&
      isString(dto.action_type) &&
      isPlainObject(dto.attacker) &&
      isTeam(dto.attacker.team) &&
      isInteger(dto.attacker.slot) &&
      isBoolean(dto.attacker.trigger_cut_in) &&
      isPlainObject(dto.target) &&
      isTeam(dto.target.team) &&
      isInteger(dto.target.slot) &&
      isPlainObject(dto.combat_math) &&
      isFiniteNumber(dto.combat_math.damage_dealt) &&
      isBoolean(dto.combat_math.is_critical) &&
      isFiniteNumber(dto.combat_math.elemental_modifier) &&
      isPlainObject(dto.post_action_state) &&
      isFiniteNumber(dto.post_action_state.target_remaining_hp) &&
      isBoolean(dto.post_action_state.is_target_dead);
  }

  function combatantKey(team, slot) {
    return team + ":" + String(slot);
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
      state.currentHp.set(
        combatantKey(combatant.team, combatant.slot),
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

  function setStatus(message) {
    if (combatStatus) combatStatus.textContent = message;
  }

  function getSpriteManifest(character) {
    const manifest = window.CariSpriteManifest;
    if (!manifest || typeof manifest !== "object") return null;

    const entry = manifest[character.character_id];
    return isPlainObject(entry) ? entry : null;
  }

  function getSpriteSource(character) {
    const manifest = getSpriteManifest(character);
    const url = manifest?.url || manifest?.spriteSheetUrl || character.sprite_base_url;
    if (!isString(url) || !url) return null;

    const columns = Math.max(1, Number.isInteger(manifest?.columns) ? manifest.columns : 16);
    const rows = Math.max(1, Number.isInteger(manifest?.rows) ? manifest.rows : 1);

    return {
      url,
      columns,
      rows,
      states: isPlainObject(manifest?.states) ? manifest.states : ANIMATION,
      pixelSize: Math.max(1, Number(manifest?.pixelSize) || 1)
    };
  }

  function requestImage(url) {
    if (!url) return null;
    const cached = state.imageCache.get(url);
    if (cached) return cached;

    const entry = { status: "loading", image: null };
    state.imageCache.set(url, entry);

    const image = new Image();
    image.decoding = "async";
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

  function animationKey(character) {
    return combatantKey(character.team, character.slot);
  }

  function setCombatantAnimation(team, slot, mode, durationMs = null) {
    const normalized = isString(mode) ? mode.toUpperCase() : "IDLE";
    const nextMode = ANIMATION[normalized] ? normalized : "IDLE";
    const key = combatantKey(team, slot);
    const now = performance.now();

    state.animationStates.set(key, {
      mode: nextMode,
      startedAt: now,
      lockedUntil: durationMs === null ? null : now + Math.max(0, durationMs)
    });
  }

  function getAnimationState(character, now) {
    const key = animationKey(character);
    const current = state.animationStates.get(key);

    if (!current) {
      return {
        mode: "IDLE",
        elapsed: 0
      };
    }

    if (current.lockedUntil !== null && now >= current.lockedUntil) {
      state.animationStates.set(key, {
        mode: "IDLE",
        startedAt: now,
        lockedUntil: null
      });
      return {
        mode: "IDLE",
        elapsed: 0
      };
    }

    const definition = getSpriteSource(character)?.states?.[current.mode] || ANIMATION[current.mode];
    const elapsed = Math.max(0, now - current.startedAt);
    const duration = Math.max(1, (1000 / Math.max(1, definition?.fps || 8)) * (definition?.frames?.length || 1));

    if (current.mode !== "IDLE" && elapsed >= duration && !definition?.loop) {
      state.animationStates.set(key, {
        mode: "IDLE",
        startedAt: now,
        lockedUntil: null
      });
      return { mode: "IDLE", elapsed: 0 };
    }

    return { mode: current.mode, elapsed };
  }

  function frameFor(character, animationState) {
    const source = getSpriteSource(character);
    const definition = source?.states?.[animationState.mode] ||
      ANIMATION[animationState.mode] ||
      ANIMATION.IDLE;

    const frames = Array.isArray(definition.frames) && definition.frames.length
      ? definition.frames
      : ANIMATION.IDLE.frames;
    const fps = Math.max(1, Number(definition.fps) || 8);
    const index = Math.floor(animationState.elapsed / (1000 / fps));
    const frame = frames[definition.loop ? index % frames.length : Math.min(index, frames.length - 1)];

    return {
      frame: Math.max(0, Number(frame) || 0),
      columns: Math.max(1, source?.columns || 16),
      rows: Math.max(1, source?.rows || 1),
      image: source ? requestImage(source.url)?.image : null,
      source
    };
  }

  function spriteTransform(character, animationState, width, height) {
    const centerDirection = character.team === "player" ? 1 : -1;
    const idleBounce = Math.sin(animationState.elapsed / 130) * 2.5;

    if (animationState.mode === "ATTACK") {
      const progress = clamp(animationState.elapsed / 230, 0, 1);
      const punch = Math.sin(progress * Math.PI);
      return {
        x: centerDirection * punch * 28,
        y: -Math.sin(progress * Math.PI) * 12,
        scaleX: 1 + punch * 0.05,
        scaleY: 1 - punch * 0.04,
        alpha: 1
      };
    }

    if (animationState.mode === "HIT") {
      const progress = clamp(animationState.elapsed / 220, 0, 1);
      return {
        x: -centerDirection * (1 - progress) * 18,
        y: progress * 5,
        scaleX: 1 - progress * 0.02,
        scaleY: 1 + progress * 0.02,
        alpha: 1
      };
    }

    if (animationState.mode === "DODGE") {
      const progress = clamp(animationState.elapsed / 230, 0, 1);
      return {
        x: -centerDirection * Math.sin(progress * Math.PI) * 34,
        y: -Math.sin(progress * Math.PI) * 5,
        scaleX: 1,
        scaleY: 1,
        alpha: progress < 0.7 ? 0.28 : 0.82
      };
    }

    return {
      x: 0,
      y: -idleBounce,
      scaleX: 1,
      scaleY: 1,
      alpha: 1
    };
  }

  function drawPixelSprite(character, x, y, width, height, now) {
    const animationState = getAnimationState(character, now);
    const sourceInfo = frameFor(character, animationState);

    if (!sourceInfo.image) {
      return false;
    }

    const frameWidth = sourceInfo.image.naturalWidth / sourceInfo.columns;
    const frameHeight = sourceInfo.image.naturalHeight / sourceInfo.rows;

    if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) ||
        frameWidth <= 0 || frameHeight <= 0) {
      return false;
    }

    const column = sourceInfo.frame % sourceInfo.columns;
    const row = Math.floor(sourceInfo.frame / sourceInfo.columns) % sourceInfo.rows;

    const transform = spriteTransform(character, animationState, width, height);
    const drawWidth = Math.max(1, width * transform.scaleX);
    const drawHeight = Math.max(1, height * transform.scaleY);

    context.save();
    context.imageSmoothingEnabled = false;
    context.globalAlpha = transform.alpha;
    context.translate(
      x + width / 2 + transform.x,
      y + height / 2 + transform.y
    );

    context.drawImage(
      sourceInfo.image,
      column * frameWidth,
      row * frameHeight,
      frameWidth,
      frameHeight,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    if (animationState.mode === "HIT") {
      const flash = 0.22 + Math.abs(Math.sin(animationState.elapsed / 38)) * 0.62;
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = "rgba(255,255,255," + flash + ")";
      context.fillRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }

    context.restore();
    return true;
  }

  function drawPlaceholder(x, y, width, height, combatant, now) {
    const animation = getAnimationState(combatant, now);
    const transform = spriteTransform(combatant, animation, width, height);

    context.save();
    context.translate(x + width / 2 + transform.x, y + height / 2 + transform.y);
    context.globalAlpha = transform.alpha;

    const hue = combatant.team === "player" ? 205 : 340;
    context.fillStyle = "hsl(" + hue + " 35% 24% / 0.95)";
    context.fillRect(-width / 2, -height / 2, width, height);

    context.strokeStyle = "rgba(255,255,255,.22)";
    context.strokeRect(-width / 2, -height / 2, width, height);

    context.fillStyle = "rgba(255,255,255,.62)";
    context.font = "700 11px monospace";
    context.textAlign = "center";
    context.fillText("PIXEL SPRITE", 0, -4);
    context.fillStyle = "rgba(255,255,255,.42)";
    context.font = "600 10px monospace";
    context.fillText(animation.mode, 0, 14);

    context.restore();
  }

  function drawHpBar(x, y, width, height, hp, maxHp) {
    const safeMax = Math.max(1, maxHp);
    const ratio = clamp(hp / safeMax, 0, 1);

    context.fillStyle = "rgba(0,0,0,.48)";
    context.fillRect(x, y, width, height);

    context.fillStyle = ratio > .5 ? "#39d98a" : ratio > .25 ? "#f1c75b" : "#ff6b6b";
    context.fillRect(x, y, width * ratio, height);

    context.strokeStyle = "rgba(255,255,255,.26)";
    context.strokeRect(x, y, width, height);
  }

  function drawText(text, x, y, size, weight, align = "left", color = "#fff") {
    context.font = weight + " " + size + "px system-ui,sans-serif";
    context.textAlign = align;
    context.textBaseline = "top";
    context.fillStyle = color;
    context.fillText(text, x, y);
  }

  function drawBackground(width, height) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a1020");
    gradient.addColorStop(.58, "#17213a");
    gradient.addColorStop(1, "#070b14");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(180,208,255,.09)";
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

    context.fillStyle = "rgba(255,255,255,.05)";
    context.beginPath();
    context.ellipse(width / 2, height * .65, Math.min(width * .3, 360), Math.min(height * .1, 70), 0, 0, Math.PI * 2);
    context.fill();
  }

  function layoutCharacter(team, index, total, width, height) {
    const sectionWidth = width / 2 - 28;
    const sectionX = team === "player" ? 14 : width / 2 + 14;
    const columns = total > 1 && sectionWidth >= 250 ? 2 : 1;
    const gap = 10;
    const cardWidth = Math.max(120, (sectionWidth - gap * (columns - 1)) / columns);
    const rows = Math.ceil(total / columns);
    const rowGap = 10;
    const cardHeight = Math.max(170, Math.min(235, (height - 110 - rowGap * (rows - 1)) / rows));
    const column = index % columns;
    const row = Math.floor(index / columns);

    return {
      x: sectionX + column * (cardWidth + gap),
      y: 68 + row * (cardHeight + rowGap),
      width: cardWidth,
      height: cardHeight
    };
  }

  function drawCombatant(combatant, x, y, width, height, now) {
    context.fillStyle = "rgba(15,20,35,.88)";
    context.fillRect(x, y, width, height);
    context.strokeStyle = combatant.team === "player"
      ? "rgba(106,181,255,.55)"
      : "rgba(255,111,150,.55)";
    context.strokeRect(x, y, width, height);

    const imageX = x + 8;
    const imageY = y + 8;
    const imageWidth = width - 16;
    const imageHeight = Math.max(84, height - 82);

    if (!drawPixelSprite(combatant, imageX, imageY, imageWidth, imageHeight, now)) {
      drawPlaceholder(imageX, imageY, imageWidth, imageHeight, combatant, now);
    }

    const labelY = y + imageHeight + 10;
    drawText(
      "#" + combatant.slot + " " + (combatant.name.length > 22 ? combatant.name.slice(0, 21) + "…" : combatant.name),
      x + 8,
      labelY,
      13,
      "700"
    );

    drawText(
      "Lv." + combatant.level,
      x + width - 8,
      labelY,
      11,
      "600",
      "right",
      "rgba(255,255,255,.62)"
    );

    drawHpBar(
      x + 8,
      labelY + 22,
      width - 16,
      9,
      currentHpFor(combatant),
      Math.max(1, combatant.max_hp)
    );

    drawText(
      Math.round(currentHpFor(combatant)) + " / " + Math.round(combatant.max_hp),
      x + 8,
      labelY + 35,
      11,
      "600",
      "left",
      "rgba(255,255,255,.72)"
    );
  }

  function drawTeam(team, width, height, now) {
    const characters = team === "player" ? state.combatInit.player_team : state.combatInit.enemy_team;

    characters.forEach((combatant, index) => {
      const position = layoutCharacter(team, index, characters.length, width, height);
      drawCombatant({ ...combatant, team }, position.x, position.y, position.width, position.height, now);
    });
  }

  function impactTargetPosition() {
    if (!state.impact || !state.combatInit) return null;

    const team = state.impact.team;
    const characters = team === "player" ? state.combatInit.player_team : state.combatInit.enemy_team;
    const index = characters.findIndex((value) => value.slot === state.impact.slot);

    if (index < 0) return null;

    const position = layoutCharacter(team, index, characters.length, state.lastRenderWidth, state.lastRenderHeight);
    return {
      x: position.x + position.width / 2,
      y: position.y + 32
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
    const scale = 1 + (state.impact.critical ? Math.sin(progress * Math.PI) * .16 : 0);

    context.save();
    context.globalAlpha = alpha;
    context.translate(point.x, point.y - rise);
    context.scale(scale, scale);

    drawText(
      state.impact.critical ? "CRÍTICO -" + Math.round(state.impact.damage) : "-" + Math.round(state.impact.damage),
      0,
      0,
      state.impact.critical ? 24 : 21,
      "800",
      "center",
      state.impact.critical ? "#ff1a1a" : "#fff"
    );

    context.restore();
  }

  function emit(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (_error) {
      // Optional DOM event bridge.
    }
  }

  function syncServerState(serverState, response) {
    if (!isPlainObject(serverState)) return false;
    state.serverState = clone(serverState);

    const targetId = serverState.target?.id;
    if (typeof targetId === "string") {
      const target = allCombatants().find((combatant) =>
        combatant.character_id === targetId ||
        combatant.id === targetId
      );

      if (target) {
        state.currentHp.set(
          combatantKey(target.team, target.slot),
          clamp(Number(serverState.target.hp), 0, Math.max(0, target.max_hp))
        );
      }
    }

    if (Number.isInteger(serverState.turn) && serverState.turn > 0) {
      state.simulationTurn = Math.max(state.simulationTurn, serverState.turn - 1);
    }

    if (response?.resolution) {
      state.impact = {
        team: findCombatantById(response, "target")?.team || "enemy",
        slot: findCombatantById(response, "target")?.slot ?? serverState.target?.slot ?? 0,
        damage: Number(response.resolution.damage) || 0,
        critical: Boolean(response.resolution.isCritical),
        startedAt: performance.now()
      };
    }

    return true;
  }

  function findCombatantById(response, role) {
    const id = response?.[role]?.id;
    if (!id) return null;
    return allCombatants().find((combatant) =>
      combatant.character_id === id || combatant.id === id
    ) || null;
  }

  function receiveCombatInit(dto) {
    if (!validateCombatInitDTO(dto)) {
      console.error("[CariCombat] Invalid CombatInitDTO.");
      return false;
    }

    state.combatInit = clone(dto);
    state.turnResult = null;
    state.simulationTurn = 0;
    state.serverState = null;
    state.lastCorrection = null;
    state.animationStates.clear();
    resetCurrentHp();

    for (const combatant of allCombatants()) {
      const source = getSpriteSource(combatant);
      if (source) requestImage(source.url);
      setCombatantAnimation(combatant.team, combatant.slot, "IDLE");
    }

    setStatus("Combate listo · Pixel Art Chibi.");
    emit("cari:combat-init", { combatInit: clone(state.combatInit) });
    return true;
  }

  function receiveTurnResult(dto) {
    if (!validateTurnResultDTO(dto)) {
      console.error("[CariCombat] Invalid TurnResultDTO.");
      return false;
    }

    state.turnResult = clone(dto);

    const target = findCombatant(dto.target.team, dto.target.slot);
    if (target) {
      state.currentHp.set(
        combatantKey(dto.target.team, dto.target.slot),
        clamp(dto.post_action_state.target_remaining_hp, 0, Math.max(0, target.max_hp))
      );
    }

    setCombatantAnimation(dto.attacker.team, dto.attacker.slot, "ATTACK", 260);
    setCombatantAnimation(dto.target.team, dto.target.slot, "HIT", 250);

    if (dto.combat_math.is_critical) {
      emit("critical_hit", {
        team: dto.target.team,
        slot: dto.target.slot,
        damage: dto.combat_math.damage_dealt,
        critical: true
      });
    } else {
      emit("damage_taken", {
        team: dto.target.team,
        slot: dto.target.slot,
        damage: dto.combat_math.damage_dealt,
        critical: false
      });
    }

    state.impact = {
      team: dto.target.team,
      slot: dto.target.slot,
      damage: dto.combat_math.damage_dealt,
      critical: dto.combat_math.is_critical,
      startedAt: performance.now()
    };

    setStatus(
      "Turno " + dto.turn_number +
      (dto.combat_math.is_critical ? " · CRÍTICO" : " · IMPACTO")
    );

    emit("cari:combat-turn", {
      turnResult: clone(state.turnResult)
    });
    return true;
  }

  function setFrozen(frozen) {
    state.frozen = Boolean(frozen);
  }

  function resolveUltimateImpact(detail = {}) {
    const target = detail.target || state.turnResult?.target;
    if (target && isTeam(target.team) && Number.isInteger(target.slot)) {
      setCombatantAnimation(target.team, target.slot, "HIT", 250);
    }
    if (detail.damage !== undefined) {
      state.impact = {
        team: target?.team || "enemy",
        slot: target?.slot ?? 0,
        damage: Number(detail.damage) || 0,
        critical: true,
        startedAt: performance.now()
      };
    }
    emit("cari:ultimate-impact", clone(detail));
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
    const candidates = team === "player" ? state.combatInit.player_team : state.combatInit.enemy_team;
    return candidates.find((combatant) => currentHpFor({ ...combatant, team }) > 0) ?? null;
  }

  function simulateTurn() {
    if (!state.combatInit) {
      receiveCombatInit(createDemoCombat());
    }

    const nextTurn = state.simulationTurn + 1;
    const attackingTeam = nextTurn % 2 === 1 ? "player" : "enemy";
    const defendingTeam = attackingTeam === "player" ? "enemy" : "player";
    const attacker = livingTarget(attackingTeam);
    const target = livingTarget(defendingTeam);

    if (!attacker || !target) {
      setStatus("Combate terminado.");
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

  function getState() {
    return {
      combatInit: clone(state.combatInit),
      turnResult: clone(state.turnResult),
      serverState: clone(state.serverState),
      frozen: state.frozen
    };
  }

  if (canvas) {
    canvas.style.imageRendering = "pixelated";
  }

  window.CariNetwork?.configure({
    onServerState: syncServerState,
    onCorrection: (correction) => {
      state.lastCorrection = clone(correction);
      emit("correction", clone(correction));
      setStatus("Servidor corrigió la resolución.");
    },
    onReplay: () => setStatus("Acción reenviada · estado confirmado.")
  });

  window.CariCombat = Object.freeze({
    canvas,
    context,
    resizeCanvas: () => resizeCanvas(),
    validateCombatInitDTO,
    validateTurnResultDTO,
    receiveCombatInit,
    receiveTurnResult,
    receiveCombatInitJSON,
    receiveTurnResultJSON,
    receiveCombatState,
    receiveCombatResult,
    simulateTurn,
    syncServerState,
    setFrozen,
    setCombatantAnimation,
    resolveUltimateImpact,
    getUltimateEnergy: () => {
      const candidates = [
        window.CombatStateMachine?.instance?.ultimateEnergy,
        window.CombatStateMachine?.instance?.ultimate_energy,
        window.combat?.ultimateEnergy,
        window.combat?.ultimate_energy
      ];
      return candidates.find((value) => isFiniteNumber(value)) ?? 0;
    },
    getState
  });

  function resizeCanvas() {
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = false;

    state.lastRenderWidth = rect.width;
    state.lastRenderHeight = rect.height;
  }

  function drawCombatFrame(now = performance.now()) {
    if (!canvas || !context) return;

    if (state.frozen) {
      window.requestAnimationFrame(drawCombatFrame);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (state.lastRenderWidth !== rect.width || state.lastRenderHeight !== rect.height) {
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
        "rgba(255,255,255,.62)"
      );
      window.requestAnimationFrame(drawCombatFrame);
      return;
    }

    drawText("BATTLE " + state.combatInit.battle_id, width / 2, 15, 14, "700", "center", "rgba(255,255,255,.78)");
    drawText("PLAYER", 18, 42, 12, "800", "left", "#75c8ff");
    drawText("ENEMY", width - 18, 42, 12, "800", "right", "#ff83aa");

    drawTeam("player", width, height, now);
    drawTeam("enemy", width, height, now);
    drawImpact(now);

    if (state.turnResult) {
      const criticalText = state.turnResult.combat_math.is_critical ? " · CRÍTICO" : "";
      drawText(
        "TURNO " + state.turnResult.turn_number + " · " + state.turnResult.action_type + criticalText,
        width / 2,
        height - 30,
        12,
        "700",
        "center",
        "rgba(255,255,255,.72)"
      );
    }

    state.lastFrameAt = now;
    window.requestAnimationFrame(drawCombatFrame);
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  simulateButton?.addEventListener("click", simulateTurn);

  resizeCanvas();
  drawCombatFrame();
})();