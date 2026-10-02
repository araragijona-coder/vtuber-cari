(() => {
  "use strict";

  const MAX_EFFECTS = 72;
  const MAX_SEEN_ACTIONS = 128;
  const ASSET_SLOTS = Object.freeze([
    "player.portrait",
    "player.sprite",
    "player.idle",
    "player.attack",
    "player.hurt",
    "player.break",
    "player.victory",
    "player.defeat",
    "player.motorcycle",
    "enemy.portrait",
    "enemy.sprite",
    "enemy.idle",
    "enemy.attack",
    "enemy.hurt",
    "enemy.break",
    "enemy.victory",
    "enemy.defeat",
    "enemy.motorcycle",
    "skill.attack",
    "skill.defense",
    "skill.skill",
    "status.weak",
    "status.exposed",
    "break.icon",
    "burst.icon",
    "telegraph.attack",
    "telegraph.defend",
    "telegraph.debuff"
  ]);
  const CAMERA_PRESETS = Object.freeze({
    IDLE: Object.freeze({ zoom: 1, offsetX: 0, offsetY: 0, duration: 420, shake: 0 }),
    APPROACH: Object.freeze({ zoom: 1.035, offsetX: 10, offsetY: -4, duration: 340, shake: 0 }),
    ATTACK: Object.freeze({ zoom: 1.055, offsetX: 18, offsetY: -8, duration: 260, shake: 2 }),
    IMPACT: Object.freeze({ zoom: 1.085, offsetX: 0, offsetY: -5, duration: 360, shake: 7 }),
    BREAK: Object.freeze({ zoom: 1.11, offsetX: 0, offsetY: -8, duration: 840, shake: 4 }),
    BURST: Object.freeze({ zoom: 1.15, offsetX: 0, offsetY: -12, duration: 760, shake: 10 }),
    VICTORY: Object.freeze({ zoom: 1.03, offsetX: 0, offsetY: -4, duration: 1200, shake: 0 }),
    DEFEAT: Object.freeze({ zoom: .96, offsetX: 0, offsetY: 8, duration: 1000, shake: 0 })
  });

  const VISUAL_STATES = Object.freeze({
    NORMAL: "NORMAL",
    ATTACKING: "ATTACKING",
    HURT: "HURT",
    BREAK: "BREAK",
    BURST_READY: "BURST READY",
    BURST_ACTIVE: "BURST ACTIVE",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  const LAYER_ORDER = Object.freeze([
    "BACKGROUND",
    "FAR_PARALLAX",
    "MIDGROUND",
    "ENEMY",
    "COMBAT_FX",
    "CHARACTER_MOTORCYCLE",
    "FOREGROUND_FX",
    "HUD",
    "CARDS"
  ]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function progress(now, start, duration) {
    return clamp((Number(now) - Number(start)) / Math.max(1, Number(duration) || 1), 0, 1);
  }

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  function create(canvas, context) {
    const state = {
      effects: [],
      seenActions: new Map(),
      assets: {
        player: Object.create(null),
        enemy: Object.create(null),
        skill: Object.create(null),
        status: Object.create(null),
        break: Object.create(null),
        burst: Object.create(null),
        telegraph: Object.create(null)
      },
      imageCache: new Map(),
      audioHooks: Object.create(null),
      combatId: null,
      composition: {
        player: { characterScale: 1, motorcycleScale: .82, motorcycleOffsetX: 0, motorcycleOffsetY: 18, identityLayer: true },
        enemy: { characterScale: 1, motorcycleScale: .78, motorcycleOffsetX: 0, motorcycleOffsetY: 18, identityLayer: true }
      },
      camera: {
        active: "IDLE",
        current: { ...CAMERA_PRESETS.IDLE },
        target: { ...CAMERA_PRESETS.IDLE },
        startedAt: performance.now(),
        until: 0
      }
    };

    function rememberAction(actionId) {
      if (!actionId) return false;
      if (state.seenActions.has(actionId)) return true;
      state.seenActions.set(actionId, true);
      while (state.seenActions.size > MAX_SEEN_ACTIONS) {
        state.seenActions.delete(state.seenActions.keys().next().value);
      }
      return false;
    }

    function addEffect(type, payload = {}, duration = 420) {
      const delayMs = Math.max(0, Number(payload.delayMs) || 0);
      const { delayMs: ignoredDelay, ...effectPayload } = payload;
      void ignoredDelay;
      state.effects.push({
        type,
        start: performance.now() + delayMs,
        duration: Math.max(80, Number(duration) || 80),
        ...effectPayload
      });
      while (state.effects.length > MAX_EFFECTS) state.effects.shift();
    }

    function emitAudio(event, payload) {
      const hook = state.audioHooks[event];
      if (typeof hook !== "function") return;
      try { hook(payload); } catch (error) { void error; }
    }

    function teamForId(combat, id) {
      if (!combat || !id) return null;
      if (String(combat.player?.id) === String(id)) return "player";
      if (String(combat.enemy?.id) === String(id)) return "enemy";
      return null;
    }

    function positionFor(team, width, height) {
      const compact = width < 560;
      return {
        x: team === "player" ? width * (compact ? .29 : .31) : width * (compact ? .71 : .69),
        y: height * (compact ? .58 : .56)
      };
    }


    function compositionFor(team) {
      return state.composition[team] || state.composition.player;
    }

    function setComposition(team, spec = {}) {
      if (!(team === "player" || team === "enemy")) return false;
      const current = compositionFor(team);
      state.composition[team] = {
        ...current,
        ...spec,
        characterScale: clamp(spec.characterScale ?? current.characterScale, .55, 1.5),
        motorcycleScale: clamp(spec.motorcycleScale ?? current.motorcycleScale, .45, 1.4),
        motorcycleOffsetX: clamp(spec.motorcycleOffsetX ?? current.motorcycleOffsetX, -120, 120),
        motorcycleOffsetY: clamp(spec.motorcycleOffsetY ?? current.motorcycleOffsetY, -100, 120),
        identityLayer: spec.identityLayer !== false
      };
      return true;
    }

    function setCameraPreset(name, instant = false, now = performance.now()) {
      const key = Object.prototype.hasOwnProperty.call(CAMERA_PRESETS, name) ? name : "IDLE";
      const preset = CAMERA_PRESETS[key];
      state.camera.active = key;
      state.camera.startedAt = now;
      state.camera.until = now + preset.duration;
      state.camera.target = { ...preset };
      if (instant) state.camera.current = { ...preset };
      return { ...preset, name: key };
    }

    function updateCamera(now, combat) {
      if (combat?.outcome === "VICTORY" && state.camera.active !== "VICTORY") setCameraPreset("VICTORY");
      else if (combat?.outcome === "DEFEAT" && state.camera.active !== "DEFEAT") setCameraPreset("DEFEAT");
      else if (window.BreakSystem?.isBroken?.(combat?.enemy?.breakState) && now >= state.camera.until && state.camera.active !== "BURST") setCameraPreset("BREAK");
      else if (now >= state.camera.until && state.camera.active !== "IDLE" && !window.BreakSystem?.isBroken?.(combat?.enemy?.breakState)) setCameraPreset("IDLE");

      const blend = .16;
      state.camera.current.zoom += (state.camera.target.zoom - state.camera.current.zoom) * blend;
      state.camera.current.offsetX += (state.camera.target.offsetX - state.camera.current.offsetX) * blend;
      state.camera.current.offsetY += (state.camera.target.offsetY - state.camera.current.offsetY) * blend;
      return state.camera.current;
    }

    function applyCamera(width, height, now) {
      const camera = state.camera.current;
      const preset = CAMERA_PRESETS[state.camera.active] || CAMERA_PRESETS.IDLE;
      const elapsed = Math.max(0, now - state.camera.startedAt);
      const progressValue = clamp(elapsed / Math.max(1, preset.duration), 0, 1);
      const shake = preset.shake * (1 - progressValue);
      const shakeX = shake ? Math.sin(now * .085) * shake : 0;
      const shakeY = shake ? Math.cos(now * .071) * shake * .55 : 0;
      context.translate(width / 2 + camera.offsetX + shakeX, height / 2 + camera.offsetY + shakeY);
      context.scale(camera.zoom, camera.zoom);
      context.translate(-width / 2, -height / 2);
    }

    function slotForCatalogRecord(record, combat) {
      if (!record || record.status !== "APPROVED") return null;
      const type = String(record.type || "").toUpperCase();
      const stateName = String(record.state || "IDLE").toLowerCase();
      const entityId = String(record.entityId || "");
      const playerId = String(combat?.characterId || combat?.player?.identity?.characterId || "yuri");
      const enemyId = String(combat?.enemy?.id || "");
      const isPlayer = entityId === playerId;
      const isEnemy = entityId === enemyId;
      if (type === "CHARACTER" && (isPlayer || isEnemy)) return (isPlayer ? "player" : "enemy") + "." + stateName;
      if (type === "PORTRAIT" && (isPlayer || isEnemy)) return (isPlayer ? "player" : "enemy") + ".portrait";
      if (type === "MOTORCYCLE" && (isPlayer || isEnemy)) return (isPlayer ? "player" : "enemy") + ".motorcycle";
      if (type === "STATUS_ICON") return "status." + stateName;
      if (type === "VFX_REFERENCE" && stateName === "break") return "break.icon";
      if (type === "VFX_REFERENCE" && stateName === "burst") return "burst.icon";
      return null;
    }

    function loadApprovedCatalog(combat) {
      if (typeof localStorage === "undefined") return 0;
      try {
        const raw = localStorage.getItem("mach_girls_asset_catalog_v1");
        if (!raw) return 0;
        const registry = JSON.parse(raw);
        const assets = Array.isArray(registry?.assets) ? registry.assets : [];
        let loaded = 0;
        for (const record of assets) {
          const slot = slotForCatalogRecord(record, combat);
          if (!slot || !record.source) continue;
          if (setAsset(slot, record.source)) loaded += 1;
        }
        return loaded;
      } catch (error) {
        void error;
        return 0;
      }
    }

    function assetFor(slot) {
      const parts = String(slot).split(".");
      if (parts.length !== 2) return null;
      return state.assets[parts[0]]?.[parts[1]] || null;
    }

    function imageFor(slot) {
      const source = assetFor(slot);
      if (!source || typeof Image === "undefined") return null;
      const existing = state.imageCache.get(slot);
      if (existing?.src === source) {
        return existing.image.complete && existing.image.naturalWidth > 0 ? existing.image : null;
      }
      const image = new Image();
      image.decoding = "async";
      image.src = source;
      state.imageCache.set(slot, { src: source, image });
      return null;
    }

    function setAsset(slot, source) {
      const key = String(slot);
      if (!ASSET_SLOTS.includes(key)) return false;
      const parts = key.split(".");
      state.assets[parts[0]][parts[1]] = source ? String(source) : "";
      state.imageCache.delete(key);
      return true;
    }

    function drawText(text, x, y, size, weight, align, color, alpha = 1) {
      context.font = weight + " " + size + "px system-ui, sans-serif";
      context.textAlign = align || "left";
      context.textBaseline = "middle";
      context.globalAlpha = clamp(alpha, 0, 1);
      context.fillStyle = color;
      context.fillText(String(text), x, y);
      context.globalAlpha = 1;
    }

    function drawRoundedRect(x, y, width, height, radius, fill, stroke) {
      const r = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + width, y, x + width, y + height, r);
      context.arcTo(x + width, y + height, x, y + height, r);
      context.arcTo(x, y + height, x, y, r);
      context.arcTo(x, y, x + width, y, r);
      context.closePath();
      context.fillStyle = fill;
      context.fill();
      if (stroke) {
        context.strokeStyle = stroke;
        context.stroke();
      }
    }

    function drawMeter(x, y, width, height, value, max, fill, label) {
      const ratio = clamp(Number(value) / Math.max(1, Number(max) || 1), 0, 1);
      drawRoundedRect(x, y, width, height, height / 2, "rgba(0,0,0,.52)", "rgba(255,255,255,.14)");
      if (ratio > 0) drawRoundedRect(x + 1, y + 1, Math.max(2, (width - 2) * ratio), Math.max(2, height - 2), height / 2, fill);
      if (label) drawText(label, x + 7, y + height / 2, Math.max(9, height - 1), "900", "left", "#ffffff");
    }

    function drawBackground(width, height, combat, now) {
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#050711");
      gradient.addColorStop(.46, "#0a1020");
      gradient.addColorStop(1, "#0d1728");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      const horizon = height * .53;
      context.fillStyle = "rgba(18,30,52,.84)";
      context.fillRect(0, horizon - 46, width, 58);
      for (let i = 0; i < 12; i += 1) {
        const x = ((i * 127 + width * .12) % (width + 140)) - 70;
        const h = 18 + ((i * 17) % 46);
        context.fillRect(x, horizon - h - 4, 22 + (i % 3) * 10, h);
      }
      context.fillStyle = combat ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.015)";
      context.fillRect(0, horizon, width, height - horizon);
      context.strokeStyle = "rgba(122,170,232,.16)";
      context.lineWidth = 1;
      for (let line = 1; line <= 9; line += 1) {
        const y = horizon + line * line * 5.4;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      for (let line = -9; line <= 9; line += 1) {
        const x = width / 2 + line * 48;
        context.beginPath();
        context.moveTo(width / 2, horizon);
        context.lineTo(x * 1.9, height);
        context.stroke();
      }
      drawText("MACH-GIRLS // COMBAT STAGE", width / 2, 26, 10, "950", "center", "rgba(255,255,255,.42)");
      if (!combat) {
        drawText("ARENA READY", width / 2, height * .46, 27, "950", "center", "#ffffff");
        drawText("START BATTLE · la escena está lista", width / 2, height * .46 + 32, 12, "700", "center", "rgba(255,255,255,.56)");
      }
    }

    function drawParallax(width, height, now) {
      const drift = (Number(now) / 95) % 54;
      context.strokeStyle = "rgba(91,150,224,.13)";
      context.lineWidth = 1;
      for (let i = 0; i < 10; i += 1) {
        const x = ((i * 131 + drift * .65) % (width + 120)) - 60;
        const y = 92 + ((i * 47) % Math.max(100, height * .38));
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 10, y + 30);
        context.stroke();
      }
      context.fillStyle = "rgba(12,24,42,.72)";
      const horizon = height * .53;
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 173 + drift * .2) % (width + 220)) - 110;
        const w = 36 + (i % 3) * 14;
        const h = 42 + (i % 4) * 18;
        context.fillRect(x, horizon - h, w, h);
        context.fillStyle = "rgba(110,232,211,.12)";
        context.fillRect(x + 7, horizon - h + 10, 4, 4);
        context.fillRect(x + 18, horizon - h + 25, 4, 4);
        context.fillStyle = "rgba(12,24,42,.72)";
      }
    }

    function drawForeground(width, height, now, combat) {
      const velocity = combat ? 1 : .35;
      const drift = (Number(now) / 22) % 90;
      context.strokeStyle = "rgba(255,255,255," + (.05 + .06 * velocity) + ")";
      context.lineWidth = 2;
      for (let i = 0; i < 9; i += 1) {
        const x = ((i * 141 + drift * 2.2) % (width + 160)) - 80;
        const y = height * .62 + ((i * 29) % Math.max(40, height * .3));
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - (18 + i * 2) * velocity, y + 8);
        context.stroke();
      }
      context.strokeStyle = "rgba(110,232,211,.16)";
      context.beginPath();
      context.moveTo(width * .08, height * .88);
      context.lineTo(width * .34, height * .76);
      context.stroke();
      context.beginPath();
      context.moveTo(width * .92, height * .88);
      context.lineTo(width * .66, height * .76);
      context.stroke();
    }

    function drawLighting(width, height, combat) {
      const glow = context.createRadialGradient(width * .5, height * .42, 20, width * .5, height * .42, Math.max(width, height) * .62);
      glow.addColorStop(0, "rgba(91,150,224," + (combat ? ".08" : ".035") + ")");
      glow.addColorStop(.55, "rgba(199,156,255,.025)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      if (combat && window.BreakSystem?.isBroken?.(combat.enemy?.breakState)) {
        context.fillStyle = "rgba(255,178,77,.045)";
        context.fillRect(0, 0, width, height);
      }
    }

    function fighterStatefighterState(team, combat, now) {
      const fighter = team === "player" ? combat?.player : combat?.enemy;
      let lunge = 0;
      let hit = 0;
      let shield = 0;
      for (const effect of state.effects) {
        const p = progress(now, effect.start, effect.duration);
        if (p >= 1) continue;
        if (effect.type === "attack" && effect.attacker === team) {
          const curve = Math.sin(p * Math.PI);
          lunge += (team === "player" ? 1 : -1) * curve * (18 + 18 * effect.intensity);
        }
        if (effect.type === "impact" && effect.targetTeam === team) {
          hit = Math.max(hit, Math.sin(p * Math.PI));
        }
        if (effect.type === "shield" && effect.targetTeam === team) {
          shield = Math.max(shield, 1 - p);
        }
      }
      return { fighter, lunge, hit, shield };
    }

    function drawPlaceholderFighter(team, fighter, x, y, scale, mode, now = performance.now()) {
      const enemy = team === "enemy";
      const main = enemy ? "#ff648e" : "#6fb7ff";
      const shadow = enemy ? "#3b1730" : "#173354";
      const w = 132 * scale;
      const h = 172 * scale;
      const bob = Math.sin(now / 420) * 2.4 * scale;
      context.save();
      context.translate(x, y + bob);
      if (mode === "hurt") context.translate((enemy ? -1 : 1) * -5 * scale, 0);
      if (mode === "attack") context.translate((enemy ? -1 : 1) * 7 * scale, 0);
      if (mode === "defeat") context.rotate(enemy ? -.04 : .04);
      if (mode === "victory") context.rotate(enemy ? .03 : -.03);
      context.globalAlpha = .22;
      context.fillStyle = "#000000";
      context.beginPath();
      context.ellipse(0, 74 * scale, 64 * scale, 13 * scale, 0, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.fillStyle = shadow;
      context.beginPath();
      context.moveTo(-w / 3 + 18 * scale, -4 * scale);
      context.arcTo(w * .66 - w / 3, -4 * scale, w * .66 - w / 3, h * .55 - 4 * scale, 18 * scale);
      context.arcTo(w * .66 - w / 3, h * .55 - 4 * scale, -w / 3, h * .55 - 4 * scale, 18 * scale);
      context.arcTo(-w / 3, h * .55 - 4 * scale, -w / 3, -4 * scale, 18 * scale);
      context.arcTo(-w / 3, -4 * scale, w * .66 - w / 3, -4 * scale, 18 * scale);
      context.closePath();
      context.fill();
      context.fillStyle = main;
      context.beginPath();
      context.arc(0, -44 * scale, 30 * scale, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f7f9ff";
      context.fillRect(-16 * scale, -48 * scale, 32 * scale, 9 * scale);
      context.fillStyle = enemy ? "#2b1222" : "#10233d";
      context.fillRect(-19 * scale, -39 * scale, 38 * scale, 6 * scale);
      context.fillStyle = main;
      context.fillRect(-48 * scale, 12 * scale, 18 * scale, 50 * scale);
      context.fillRect(30 * scale, 12 * scale, 18 * scale, 50 * scale);
      context.globalAlpha = .9;
      context.fillStyle = "#ffffff";
      context.fillRect(-38 * scale, 23 * scale, 15 * scale, 5 * scale);
      context.fillRect(23 * scale, 23 * scale, 15 * scale, 5 * scale);
      context.globalAlpha = 1;
      if (mode === "break") {
        context.strokeStyle = "#ffb24d";
        context.lineWidth = Math.max(2, 4 * scale);
        context.setLineDash([8 * scale, 6 * scale]);
        context.strokeRect(-w / 2, -82 * scale, w, h * .96);
        context.setLineDash([]);
      }
      if (mode === "burst") {
        context.strokeStyle = "rgba(255,213,107,.8)";
        context.lineWidth = Math.max(2, 4 * scale);
        context.beginPath();
        context.arc(0, -40 * scale, 44 * scale, 0, Math.PI * 2);
        context.stroke();
      }
      drawText("TECHNICAL CHARACTER PLACEHOLDER · NOT FINAL ART", 0, 111, Math.max(7, 9 * scale), "850", "center", "rgba(255,255,255,.72)");
      context.restore();
    }

    function drawPlaceholderMotorcycle(team, x, y, scale, mode, now) {
      const enemy = team === "enemy";
      const main = enemy ? "#ff4f7b" : "#5cb7ff";
      const accent = enemy ? "#ffd1dc" : "#dff4ff";
      const lean = mode === "hurt" ? -0.08 : mode === "attack" || mode === "burst" ? .06 * (enemy ? -1 : 1) : 0;
      const bob = Math.sin(now / 260) * 1.5 * scale;
      context.save();
      context.translate(x, y + bob);
      context.rotate(lean);
      context.globalAlpha = .9;
      context.strokeStyle = "rgba(0,0,0,.7)";
      context.lineWidth = 5 * scale;
      context.beginPath();
      context.moveTo(-58 * scale, 35 * scale);
      context.lineTo(-22 * scale, 12 * scale);
      context.lineTo(22 * scale, 12 * scale);
      context.lineTo(58 * scale, 35 * scale);
      context.stroke();
      context.strokeStyle = main;
      context.beginPath();
      context.moveTo(-42 * scale, 28 * scale);
      context.lineTo(-12 * scale, 4 * scale);
      context.lineTo(22 * scale, 6 * scale);
      context.lineTo(46 * scale, 26 * scale);
      context.stroke();
      context.fillStyle = "rgba(5,8,14,.95)";
      context.beginPath();
      context.arc(-46 * scale, 35 * scale, 14 * scale, 0, Math.PI * 2);
      context.arc(48 * scale, 35 * scale, 14 * scale, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = accent;
      context.lineWidth = 2 * scale;
      context.beginPath();
      context.arc(-46 * scale, 35 * scale, 9 * scale, 0, Math.PI * 2);
      context.arc(48 * scale, 35 * scale, 9 * scale, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = main;
      context.fillRect(-19 * scale, 8 * scale, 36 * scale, 12 * scale);
      context.fillStyle = accent;
      context.fillRect(5 * scale, -1 * scale, 26 * scale, 5 * scale);
      if (mode === "burst") {
        context.strokeStyle = "rgba(255,213,107,.8)";
        context.lineWidth = 3 * scale;
        context.beginPath();
        context.moveTo(-65 * scale, 18 * scale);
        context.lineTo(-96 * scale, 18 * scale);
        context.moveTo(-68 * scale, 30 * scale);
        context.lineTo(-108 * scale, 30 * scale);
        context.stroke();
      }
      context.restore();
    }

    function drawMotorcycle(team, point, baseScale, mode, now) {
      const composition = compositionFor(team);
      const scale = baseScale * composition.motorcycleScale;
      const image = imageFor(team + ".motorcycle");
      const x = point.x + (team === "enemy" ? -composition.motorcycleOffsetX : composition.motorcycleOffsetX);
      const y = point.y + composition.motorcycleOffsetY;
      if (image) {
        const width = 226 * scale;
        const height = 120 * scale;
        context.drawImage(image, x - width / 2, y - height * .44, width, height);
      } else {
        drawPlaceholderMotorcycle(team, x, y, scale, mode, now);
        drawText("TECHNICAL MOTORCYCLE PLACEHOLDER · NOT FINAL ART", x, y + 70, 8, "850", "center", "rgba(255,255,255,.58)");
      }
    }

    function assetSlotForFighterassetSlotForFighter(team, mode) {
      const candidates = [
        team + "." + mode,
        team + ".sprite",
        team + ".portrait"
      ];
      for (const slot of candidates) {
        if (ASSET_SLOTS.includes(slot) && assetFor(slot)) return slot;
      }
      return null;
    }

    function visualStateFor(team, combat, now, stateForFighter) {
      if (!combat) return VISUAL_STATES.NORMAL;
      if (combat.outcome === "VICTORY") return VISUAL_STATES.VICTORY;
      if (combat.outcome === "DEFEAT") return VISUAL_STATES.DEFEAT;
      if (team === "enemy" && window.BreakSystem?.isBroken?.(combat.enemy?.breakState)) return VISUAL_STATES.BREAK;
      const burstActive = state.effects.some((effect) => effect.type === "burst" && progress(now, effect.start, effect.duration) < 1);
      if (burstActive) return VISUAL_STATES.BURST_ACTIVE;
      if (team === "player" && window.BurstSystem?.canUse?.(combat)) return VISUAL_STATES.BURST_READY;
      if (stateForFighter.hit > .34) return VISUAL_STATES.HURT;
      if (Math.abs(stateForFighter.lunge) > 2) return VISUAL_STATES.ATTACKING;
      return VISUAL_STATES.NORMAL;
    }

    function drawFighter(team, combat, width, height, now) {
      const stateForFighter = fighterState(team, combat, now);
      const fighter = stateForFighter.fighter;
      if (!fighter) return;
      const point = positionFor(team, width, height);
      const baseScale = clamp(Math.min(width / 860, height / 590), .72, 1.15);
      const composition = compositionFor(team);
      const scale = baseScale * composition.characterScale;
      const visualState = visualStateFor(team, combat, now, stateForFighter);
      const modeMap = {
        [VISUAL_STATES.HURT]: "hurt",
        [VISUAL_STATES.ATTACKING]: "attack",
        [VISUAL_STATES.BREAK]: "break",
        [VISUAL_STATES.BURST_ACTIVE]: "burst",
        [VISUAL_STATES.VICTORY]: "victory",
        [VISUAL_STATES.DEFEAT]: "defeat",
        [VISUAL_STATES.BURST_READY]: "idle",
        [VISUAL_STATES.NORMAL]: "idle"
      };
      const mode = modeMap[visualState] || "idle";
      const spriteSlot = assetSlotForFighter(team, mode);
      const image = spriteSlot ? imageFor(spriteSlot) : null;
      context.save();
      context.translate(stateForFighter.lunge, 0);
      drawMotorcycle(team, point, baseScale, mode, now);
      if (image) {
        const imageWidth = 190 * scale;
        const imageHeight = 224 * scale;
        context.globalAlpha = .98;
        context.drawImage(image, point.x - imageWidth / 2, point.y - imageHeight + 74, imageWidth, imageHeight);
      } else {
        drawPlaceholderFighter(team, fighter, point.x, point.y, scale, mode, now);
      }
      if (composition.identityLayer) {
        context.fillStyle = team === "enemy" ? "rgba(255,100,142,.16)" : "rgba(111,183,255,.16)";
        context.beginPath();
        context.arc(point.x, point.y - 68 * scale, 82 * scale, 0, Math.PI * 2);
        context.fill();
      }
      if (visualState === VISUAL_STATES.BURST_READY) {
        context.strokeStyle = "rgba(255,213,107,.6)";
        context.lineWidth = 2.5;
        context.setLineDash([5, 7]);
        context.beginPath();
        context.arc(point.x, point.y - 48, 92, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
      }
      if (stateForFighter.hit > 0) {
        context.fillStyle = "rgba(255,255,255," + (0.22 * stateForFighter.hit) + ")";
        context.beginPath();
        context.arc(point.x, point.y - 58 * scale, 60 * scale, 0, Math.PI * 2);
        context.fill();
      }
      if (stateForFighter.shield > 0) {
        context.strokeStyle = "rgba(110,232,211," + (0.25 + 0.45 * stateForFighter.shield) + ")";
        context.lineWidth = 4 * scale;
        context.beginPath();
        context.arc(point.x, point.y - 35 * scale, 96 * scale, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();

      const barWidth = Math.min(230, width * .28);
      const barX = point.x - barWidth / 2;
      const barY = point.y + 92;
      drawMeter(barX, barY, barWidth, 14, fighter.hp, fighter.maxHp, team === "enemy" ? "#ff648e" : "#6fb7ff", Math.ceil(fighter.hp) + " / " + fighter.maxHp);
      if (team === "player") drawText("SHIELD " + Math.ceil(fighter.block || 0), point.x, barY + 27, 10, "900", "center", "#6ee8d3");
      drawText(team === "enemy" ? String(fighter.name || "ENEMY") : String(fighter.identity?.displayName || combat?.character?.displayName || "YURI"), point.x, barY + (team === "player" ? 45 : 29), 12, "950", "center", "#ffffff");
      drawText(visualState, point.x, barY + (team === "player" ? 61 : 45), 8, "900", "center", team === "enemy" ? "#ffb1c5" : "#a7d6ff", .72);
      const statuses = window.StatusSystem?.entries?.(fighter) || [];
      statuses.slice(0, 3).forEach((status, index) => {
        const text = status.label + (status.remainingMs > 0 ? " " + (status.remainingMs / 1000).toFixed(1) : "");
        const color = status.type === "EXPOSED" ? "#ffb24d" : "#c79cff";
        drawText(text, point.x + (index - (statuses.slice(0, 3).length - 1) / 2) * 72, barY + 76, 9, "850", "center", color);
      });
    }

    function drawIntentdrawIntent(combat, width, height, now) {
      const intent = combat?.enemyIntent;
      if (!intent) return;
      const enemyPoint = positionFor("enemy", width, height);
      const playerPoint = positionFor("player", width, height);
      const leadMs = Number(combat?.enemyBehavior?.telegraphMs || intent.remainingMs || 1);
      const remaining = Math.max(0, Number(intent.remainingMs || 0));
      const pulse = .45 + .3 * Math.sin(now / 120);
      const progressValue = 1 - remaining / Math.max(1, leadMs);
      const type = String(intent.type || "ATTACK");
      const icon = type === "ATTACK" ? "!" : type === "DEFEND" ? "◆" : "☄";
      context.strokeStyle = "rgba(255,178,77," + pulse + ")";
      context.lineWidth = 3;
      context.setLineDash([10, 8]);
      context.beginPath();
      context.arc(enemyPoint.x, enemyPoint.y - 50, 82 + 14 * progressValue, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      drawText(icon, enemyPoint.x, enemyPoint.y - 155, 24, "1000", "center", "#ffd88c", .95);
      if (type === "ATTACK") {
        const startX = enemyPoint.x - 10;
        const startY = enemyPoint.y - 55;
        const targetX = playerPoint.x + 10;
        const targetY = playerPoint.y - 58;
        context.strokeStyle = "rgba(255,178,77," + (.24 + .36 * progressValue) + ")";
        context.lineWidth = 2.5;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(targetX, targetY);
        context.stroke();
        const dx = targetX - startX;
        const dy = targetY - startY;
        const length = Math.max(1, Math.hypot(dx, dy));
        const nx = dx / length;
        const ny = dy / length;
        const px = -ny;
        const py = nx;
        context.fillStyle = "rgba(255,178,77,.78)";
        context.beginPath();
        context.moveTo(targetX, targetY);
        context.lineTo(targetX - nx * 14 + px * 6, targetY - ny * 14 + py * 6);
        context.lineTo(targetX - nx * 14 - px * 6, targetY - ny * 14 - py * 6);
        context.closePath();
        context.fill();
        context.strokeStyle = "rgba(255,178,77,.34)";
        context.beginPath();
        context.arc(playerPoint.x, playerPoint.y - 58, 66 + 8 * Math.sin(now / 100), 0, Math.PI * 2);
        context.stroke();
      }
    }

    function drawImpactdrawImpact(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      const point = positionFor(effect.targetTeam || teamForId(combat, effect.targetId), width, height);
      if (!point) return;
      if (effect.damage > 0) drawText("-" + effect.damage, point.x + (effect.critical ? 22 : 0), point.y - 118 - p * 52, effect.critical ? 23 : 18, "1000", "center", effect.critical ? "#ffd36b" : "#ffffff", alpha);
      if (effect.blockAbsorbed > 0) drawText("BLOCK " + effect.blockAbsorbed, point.x, point.y - 92, 12, "900", "center", "#6ee8d3", alpha);
      if (effect.breakDamage > 0) drawText("BRK -" + effect.breakDamage, point.x, point.y - 78, 10, "900", "center", "#ffb24d", alpha);
      if (effect.damageReductionApplied > 0) drawText("DR -" + effect.damageReductionApplied, point.x, point.y - 62, 10, "900", "center", "#8df1e1", alpha);
      const radius = 24 + p * 30;
      context.strokeStyle = "rgba(255,255,255," + (.42 * alpha) + ")";
      context.lineWidth = Math.max(1, 4 * alpha);
      context.beginPath();
      context.arc(point.x, point.y - 54, radius, 0, Math.PI * 2);
      context.stroke();
      const sparks = effect.damage > 0 ? 8 : 4;
      for (let i = 0; i < sparks; i += 1) {
        const angle = (Math.PI * 2 * i) / sparks + .3;
        const inner = 18 + p * 8;
        const outer = inner + (18 + i * 2) * (1 - p * .35);
        context.strokeStyle = "rgba(255,213,107," + (.65 * alpha) + ")";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(point.x + Math.cos(angle) * inner, point.y - 54 + Math.sin(angle) * inner);
        context.lineTo(point.x + Math.cos(angle) * outer, point.y - 54 + Math.sin(angle) * outer);
        context.stroke();
      }
    }

    function drawAttackdrawAttack(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const a = positionFor(effect.attacker, width, height);
      const b = positionFor(effect.targetTeam, width, height);
      if (!a || !b) return;
      const eased = smoothstep(p);
      const x = a.x + (b.x - a.x) * eased;
      const y = a.y - 56 + (b.y - a.y) * eased;
      const alpha = p > .78 ? (1 - p) / .22 : 1;
      context.globalAlpha = alpha;
      context.strokeStyle = effect.kind === "skill" ? "#c79cff" : effect.attacker === "enemy" ? "#ff648e" : "#6fb7ff";
      context.lineWidth = effect.kind === "burst" ? 8 : 4;
      context.beginPath();
      context.moveTo(a.x, a.y - 60);
      context.lineTo(x, y);
      context.stroke();
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(x, y, effect.kind === "burst" ? 9 : 5, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }

    function drawMotionTrail(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const from = positionFor(effect.attacker || "player", width, height);
      const to = positionFor(effect.targetTeam || "enemy", width, height);
      if (!from || !to) return;
      const alpha = 1 - smoothstep(p);
      for (let i = 0; i < 4; i += 1) {
        const offset = (i - 1.5) * 8;
        context.strokeStyle = "rgba(111,183,255," + (.2 * alpha) + ")";
        context.lineWidth = Math.max(1, 3 - i * .5);
        context.beginPath();
        context.moveTo(from.x + offset, from.y - 52 + offset * .2);
        context.lineTo(to.x + offset * (1 - p), to.y - 52);
        context.stroke();
      }
    }

    function drawBurstReady(combat, width, height, now) {
      if (!combat || !window.BurstSystem?.canUse?.(combat)) return;
      const point = positionFor("player", width, height);
      const pulse = .55 + .2 * Math.sin(now / 130);
      context.strokeStyle = "rgba(255,213,107," + pulse + ")";
      context.lineWidth = 3;
      context.setLineDash([6, 8]);
      context.beginPath();
      context.arc(point.x, point.y - 54, 104 + 3 * Math.sin(now / 100), 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      drawText("BURST READY", point.x, point.y - 168, 10, "1000", "center", "#ffd56b", pulse);
    }

    function drawEnergyPulse(effect, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const point = positionFor("player", width, height);
      const radius = 35 + p * 90;
      context.strokeStyle = "rgba(110,232,211," + (0.5 * (1 - p)) + ")";
      context.lineWidth = 5;
      context.beginPath();
      context.arc(point.x, point.y - 50, radius, 0, Math.PI * 2);
      context.stroke();
      if (effect.amount) drawText((effect.amount > 0 ? "+" : "") + effect.amount + " ENERGY", point.x, point.y - 150 - p * 26, 12, "950", "center", "#6ee8d3", 1 - p);
    }

    function drawHeal(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      const point = positionFor(effect.targetTeam || "player", width, height);
      context.strokeStyle = "rgba(110,232,154," + (.75 * alpha) + ")";
      context.lineWidth = 6 * alpha;
      context.beginPath();
      context.arc(point.x, point.y - 54, 34 + p * 54, 0, Math.PI * 2);
      context.stroke();
      drawText("+" + effect.amount + " HP", point.x, point.y - 138 - p * 18, 15, "1000", "center", "#8ff0b0", alpha);
    }

    function drawBuff(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      const point = positionFor(effect.targetTeam || "player", width, height);
      context.strokeStyle = "rgba(199,156,255," + (.8 * alpha) + ")";
      context.lineWidth = 5 * alpha;
      context.beginPath();
      context.arc(point.x, point.y - 52, 52 + p * 30, 0, Math.PI * 2);
      context.stroke();
      drawText("POWER +" + Math.round(effect.amount * 100) + "%", point.x, point.y - 132 - p * 18, 12, "1000", "center", "#d6bcff", alpha);
    }

    function drawCleanse(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      const point = positionFor(effect.targetTeam || "player", width, height);
      context.strokeStyle = "rgba(255,255,255," + (.82 * alpha) + ")";
      context.lineWidth = 4 * alpha;
      context.beginPath();
      context.arc(point.x, point.y - 54, 42 + p * 40, 0, Math.PI * 2);
      context.stroke();
      drawText("CLEANSE ×" + effect.count, point.x, point.y - 132 - p * 18, 12, "1000", "center", "#ffffff", alpha);
    }

    function drawDamageReduction(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      const point = positionFor(effect.targetTeam || "player", width, height);
      context.strokeStyle = "rgba(110,232,211," + (.78 * alpha) + ")";
      context.lineWidth = 7 * alpha;
      context.setLineDash([10, 7]);
      context.beginPath();
      context.arc(point.x, point.y - 52, 78 - p * 16, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      drawText("DMG -" + Math.round(effect.amount * 100) + "%", point.x, point.y - 132 - p * 18, 12, "1000", "center", "#8df1e1", alpha);
    }

    function drawBreak(effect, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      context.fillStyle = "rgba(255,178,77," + (.16 * alpha) + ")";
      context.fillRect(0, 0, width, height);
      const radius = 54 + p * Math.max(width, height) * .46;
      context.strokeStyle = "rgba(255,211,107," + (.72 * alpha) + ")";
      context.lineWidth = 8 * alpha;
      context.beginPath();
      context.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      context.stroke();
      drawText("BREAK!", width / 2, height * .44, Math.min(56, width * .095), "1000", "center", "#ffe18a", alpha);
      drawText("BURST WINDOW", width / 2, height * .44 + 36, 11, "950", "center", "#fff4c4", alpha);
    }

    function drawBurst(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      context.fillStyle = "rgba(255,213,107," + (.24 * alpha) + ")";
      context.fillRect(0, 0, width, height);
      const point = positionFor("player", width, height);
      context.strokeStyle = "rgba(255,255,255," + (.62 * alpha) + ")";
      context.lineWidth = 8 * alpha;
      context.beginPath();
      context.arc(point.x, point.y - 54, 44 + p * 88, 0, Math.PI * 2);
      context.stroke();
      drawText("BURST!", width / 2, height * .34, Math.min(60, width * .11), "1000", "center", "#fff0ae", alpha);
      if (effect.damage > 0) drawText("-" + effect.damage, width / 2, height * .34 + 52, 24, "1000", "center", "#ffffff", alpha);
    }

    function drawShield(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const point = positionFor(effect.targetTeam || "player", width, height);
      const alpha = 1 - p;
      context.strokeStyle = "rgba(110,232,211," + (.72 * alpha) + ")";
      context.lineWidth = 7 * alpha;
      context.beginPath();
      context.arc(point.x, point.y - 48, 70 + p * 24, 0, Math.PI * 2);
      context.stroke();
      if (effect.amount > 0) drawText("+" + effect.amount + " SHIELD", point.x, point.y - 140 - p * 18, 11, "950", "center", "#6ee8d3", alpha);
    }

    function drawStatus(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const point = positionFor(effect.targetTeam || "enemy", width, height);
      const label = effect.status || "STATUS";
      const color = label === "EXPOSED" ? "#ffb24d" : "#c79cff";
      context.strokeStyle = "rgba(255,255,255," + (.24 * (1 - p)) + ")";
      context.lineWidth = 4;
      context.beginPath();
      context.arc(point.x, point.y - 50, 58 + p * 20, 0, Math.PI * 2);
      context.stroke();
      drawText(label, point.x, point.y - 134 - p * 18, 12, "1000", "center", color, 1 - p);
    }

    function renderEffects(combat, width, height, now) {
      const active = [];
      for (const effect of state.effects) {
        if (progress(now, effect.start, effect.duration) >= 1) continue;
        active.push(effect);
        if (effect.type === "attack") drawAttack(effect, combat, width, height, now);
        if (effect.type === "trail") drawMotionTrail(effect, combat, width, height, now);
        if (effect.type === "impact") drawImpact(effect, combat, width, height, now);
        if (effect.type === "energy") drawEnergyPulse(effect, width, height, now);
        if (effect.type === "heal") drawHeal(effect, combat, width, height, now);
        if (effect.type === "buff") drawBuff(effect, combat, width, height, now);
        if (effect.type === "cleanse") drawCleanse(effect, combat, width, height, now);
        if (effect.type === "damageReduction") drawDamageReduction(effect, combat, width, height, now);
        if (effect.type === "shield") drawShield(effect, combat, width, height, now);
        if (effect.type === "status") drawStatus(effect, combat, width, height, now);
        if (effect.type === "break") drawBreak(effect, width, height, now);
        if (effect.type === "burst") drawBurst(effect, combat, width, height, now);
      }
      state.effects = active;
    }

    function onCombatStart(combat) {
      state.effects = [];
      state.seenActions.clear();
      state.combatId = combat?.battleId ? String(combat.battleId) : null;
      state.composition = {
        player: { characterScale: 1, motorcycleScale: .82, motorcycleOffsetX: 0, motorcycleOffsetY: 18, identityLayer: true },
        enemy: { characterScale: 1, motorcycleScale: .78, motorcycleOffsetX: 0, motorcycleOffsetY: 18, identityLayer: true }
      };
      setCameraPreset("IDLE", true);
      loadApprovedCatalog(combat);
    }

    function onAction(combat, action) {
      if (!action) return;
      if (combat?.battleId && state.combatId !== String(combat.battleId)) {
        onCombatStart(combat);
      }
      if (rememberAction(action.actionId)) return;

      const actionType = String(action.actionType || action.type || "");
      const targetTeam = teamForId(combat, action.targetId) || (
        action.source === "ENEMY_AUTO_ATTACK" ? "player" : "enemy"
      );
      const attacker = action.source === "ENEMY_AUTO_ATTACK" || action.actionType === "ENEMY_BEHAVIOR" ? "enemy" : "player";

      if (action.outcome === "VICTORY") setCameraPreset("VICTORY");
      else if (action.outcome === "DEFEAT") setCameraPreset("DEFEAT");
      else if (actionType === "BURST") setCameraPreset("BURST");
      else if (action.broke) setCameraPreset("BREAK");
      else if (Number(action.damage || 0) > 0 || Number(action.blockAbsorbed || 0) > 0) setCameraPreset("IMPACT");
      else if (["AUTO_ATTACK", "SKILL", "CARD", "ABILITY", "ENEMY_BEHAVIOR"].includes(actionType)) setCameraPreset("ATTACK");

      if (actionType === "AUTO_ATTACK" || actionType === "ENEMY_BEHAVIOR" && action.intent?.type === "ATTACK") {
        addEffect("attack", {
          attacker,
          targetTeam,
          intensity: actionType === "AUTO_ATTACK" ? .35 : .55,
          kind: "auto"
        }, 330);
        emitAudio(attacker === "enemy" ? "enemyAttack" : "autoAttack", action);
      }

      const isMultiHit = Array.isArray(action.hits) && action.hits.length > 0;
      if (actionType === "SKILL" || actionType === "CARD") {
        const definition = window.CombatEngine?.cardDefinitionFor?.(combat, action.cardId) ||
          window.CardSystem?.definitionFor?.(action.cardId);
        const skillType = String(definition?.type || "SKILL").toLowerCase();
        if (isMultiHit) {
          action.hits.forEach((hit, index) => {
            addEffect("attack", {
              attacker: "player", targetTeam: "enemy",
              intensity: .72, kind: "skill", delayMs: index * 90
            }, 320);
            addEffect("trail", {
              attacker: "player", targetTeam: "enemy", intensity: .72, delayMs: index * 90
            }, 260);
            addEffect("impact", {
              targetTeam: "enemy", targetId: action.targetId,
              damage: Number(hit.damage || 0),
              blockAbsorbed: Number(hit.blockAbsorbed || 0),
              breakDamage: Number(hit.breakDamage || 0),
              critical: Boolean(hit.critical),
              delayMs: index * 90 + 110
            }, 440);
          });
          emitAudio("skill", action);
        } else if (action.damage > 0) {
          addEffect("attack", {
            attacker: "player", targetTeam: "enemy",
            intensity: .8, kind: "skill"
          }, 360);
          emitAudio("skill", action);
        } else if (skillType === "defense") {
          addEffect("shield", {
            targetTeam: "player",
            amount: Number(action.blockGained || definition?.effects?.block || 0)
          }, 400);
          emitAudio("shield", action);
        } else {
          emitAudio("skill", action);
        }
      }

      if (!isMultiHit && (action.damage > 0 || action.blockAbsorbed > 0 || action.breakDamage > 0)) {
        addEffect("impact", {
          targetTeam,
          targetId: action.targetId,
          damage: Number(action.damage || 0),
          blockAbsorbed: Number(action.blockAbsorbed || 0),
          breakDamage: Number(action.breakDamage || 0),
          critical: Boolean(action.critical),
          damageReductionApplied: Number(action.damageReductionApplied || 0)
        }, 560);
        emitAudio(targetTeam === "player" ? "enemyHit" : "impact", action);
      }

      if (Number(action.energyGain || 0) !== 0 && actionType !== "SKILL" && actionType !== "CARD") {
        addEffect("energy", { amount: Number(action.energyGain) }, 420);
      }

      if (action.statusApplied) {
        addEffect("status", {
          targetTeam: action.targetId ? targetTeam : "enemy",
          status: String(action.statusApplied)
        }, 650);
      }

      if (Number(action.healAmount || 0) > 0) {
        addEffect("heal", { targetTeam: "player", amount: Number(action.healAmount) }, 650);
        emitAudio("heal", action);
      }

      if (action.buffApplied) {
        addEffect("buff", { targetTeam: "player", amount: Number(action.buffApplied.amount || 0) }, 780);
        emitAudio("buff", action);
      }

      if (Array.isArray(action.cleanseRemoved) && action.cleanseRemoved.length > 0) {
        addEffect("cleanse", { targetTeam: "player", count: action.cleanseRemoved.length }, 620);
        emitAudio("cleanse", action);
      }

      if (action.damageReductionApplied) {
        addEffect("damageReduction", {
          targetTeam: "player",
          amount: Number(action.damageReductionApplied.amount || 0)
        }, 820);
        emitAudio("damageReduction", action);
      }

      if (actionType === "BURST") {
        addEffect("burst", { damage: Number(action.damage || 0) }, 760);
        emitAudio("burst", action);
      }

      if (actionType === "ABILITY") {
        addEffect("shield", { targetTeam: "player", amount: Number(action.blockGained || 0) }, 500);
        emitAudio("skill", action);
      }

      if (
        ["SKILL", "CARD", "ABILITY"].includes(actionType) &&
        Number.isFinite(Number(action.energyBefore)) &&
        Number.isFinite(Number(action.energyAfter))
      ) {
        const energyDelta = Number(action.energyAfter) - Number(action.energyBefore);
        if (energyDelta !== 0) {
          addEffect("energy", { amount: energyDelta }, 420);
        }
      }

      if (action.broke) {
        addEffect("break", {}, 840);
        emitAudio("break", action);
      }

      if (actionType === "BREAK_END") {
        emitAudio("breakEnd", action);
      }

      if (actionType === "MODIFIER_EXPIRED") {
        addEffect("status", {
          targetTeam: teamForId(combat, action.targetId) || "player",
          status: "EFFECT EXPIRED"
        }, 560);
        emitAudio("modifierExpired", action);
      }

      if (action.outcome === "VICTORY") emitAudio("victory", action);
      if (action.outcome === "DEFEAT") emitAudio("defeat", action);

      if (actionType === "ENEMY_BEHAVIOR" && action.intent?.type === "DEFEND") {
        addEffect("shield", { targetTeam: "enemy", amount: Number(action.intent.value || 0) }, 500);
        emitAudio("enemyHit", action);
      }

      if (actionType === "ENEMY_BEHAVIOR" && action.intent?.type === "DEBUFF") {
        addEffect("status", { targetTeam: "player", status: "WEAK" }, 650);
        emitAudio("telegraph", action);
      }
    }

    function render(combat, now = performance.now()) {
      if (!canvas || !context) return;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 1;
      const height = rect.height || 1;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = 1;
      context.lineWidth = 1;

      updateCamera(now, combat);
      context.save();
      applyCamera(width, height, now);
      drawBackground(width, height, combat, now);
      drawParallax(width, height, now);
      if (combat) {
        drawFighter("enemy", combat, width, height, now);
        drawFighter("player", combat, width, height, now);
        drawIntent(combat, width, height, now);
        renderEffects(combat, width, height, now);
        drawBurstReady(combat, width, height, now);
      }
      drawForeground(width, height, now, combat);
      drawLighting(width, height, combat);
      context.restore();
      context.globalAlpha = 1;
      context.setLineDash([]);
    }

    function setAudioHooks(hooks = {}) {
      state.audioHooks = { ...hooks };
    }

    return Object.freeze({
      onCombatStart,
      onAction,
      render,
      setAsset,
      setAudioHooks,
      setCameraPreset,
      setComposition,
      slotForCatalogRecord,
      getCameraState: () => ({ active: state.camera.active, current: { ...state.camera.current }, target: { ...state.camera.target } }),
      getAsset: assetFor
    });
  }

  window.CombatPresentation = Object.freeze({
    ASSET_SLOTS,
    CAMERA_PRESETS,
    VISUAL_STATES,
    LAYER_ORDER,
    create
  });
})();
