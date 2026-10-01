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
    "enemy.portrait",
    "enemy.sprite",
    "enemy.idle",
    "enemy.attack",
    "enemy.hurt",
    "enemy.break",
    "enemy.victory",
    "enemy.defeat",
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
      combatId: null
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
      gradient.addColorStop(0, "#070a12");
      gradient.addColorStop(.55, "#0b1020");
      gradient.addColorStop(1, "#0d1322");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const horizon = height * .54;
      context.strokeStyle = "rgba(107,152,210,.12)";
      context.lineWidth = 1;
      for (let line = 1; line <= 8; line += 1) {
        const y = horizon + line * line * 5;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      for (let line = -8; line <= 8; line += 1) {
        const x = width / 2 + line * 54;
        context.beginPath();
        context.moveTo(width / 2, horizon);
        context.lineTo(x * 1.8, height);
        context.stroke();
      }

      const drift = (Number(now) / 80) % 44;
      const intensity = combat ? .75 : .25;
      context.strokeStyle = "rgba(128,190,255," + (0.08 * intensity) + ")";
      for (let index = 0; index < 14; index += 1) {
        const x = ((index * 97 + drift * 2) % (width + 100)) - 50;
        const y = 76 + ((index * 43) % Math.max(80, horizon - 100));
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - 18, y + 12);
        context.stroke();
      }

      if (!combat) {
        drawText("ROCKET BUNNY PETTY", width / 2, height * .46, 26, "950", "center", "#ffffff");
        drawText("START BATTLE · la arena está lista", width / 2, height * .46 + 32, 12, "700", "center", "rgba(255,255,255,.56)");
      }
    }

    function fighterState(team, combat, now) {
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

    function drawPlaceholderFighter(team, fighter, x, y, scale, mode) {
      const enemy = team === "enemy";
      const main = enemy ? "#ff648e" : "#6fb7ff";
      const shadow = enemy ? "#3b1730" : "#173354";
      const w = 132 * scale;
      const h = 172 * scale;
      const bob = Math.sin(performance.now() / 420) * 2.4 * scale;
      context.save();
      context.translate(x, y + bob);

      context.globalAlpha = .22;
      context.fillStyle = "#000000";
      context.beginPath();
      context.ellipse(0, 74 * scale, 64 * scale, 13 * scale, 0, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;

      if (mode === "hurt") {
        context.translate((enemy ? -1 : 1) * -5 * scale, 0);
      }
      if (mode === "attack") {
        context.translate((enemy ? -1 : 1) * 7 * scale, 0);
      }

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

      context.restore();
    }

    function assetSlotForFighter(team, mode) {
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

    function drawFighter(team, combat, width, height, now) {
      const stateForFighter = fighterState(team, combat, now);
      const fighter = stateForFighter.fighter;
      if (!fighter) return;
      const point = positionFor(team, width, height);
      const scale = clamp(Math.min(width / 860, height / 590), .72, 1.15);
      const mode = stateForFighter.hit > .4
        ? "hurt"
        : team === "enemy" && window.BreakSystem?.isBroken?.(fighter.breakState)
          ? "break"
          : stateForFighter.lunge !== 0
            ? "attack"
            : "idle";

      const spriteSlot = assetSlotForFighter(team, mode);
      const image = spriteSlot ? imageFor(spriteSlot) : null;
      context.save();
      context.translate(stateForFighter.lunge, 0);
      if (image) {
        const imageWidth = 180 * scale;
        const imageHeight = 210 * scale;
        context.drawImage(image, point.x - imageWidth / 2, point.y - imageHeight + 74, imageWidth, imageHeight);
      } else {
        drawPlaceholderFighter(team, fighter, point.x, point.y, scale, mode);
      }

      if (stateForFighter.hit > 0) {
        context.fillStyle = "rgba(255,255,255," + (0.18 * stateForFighter.hit) + ")";
        context.beginPath();
        context.arc(point.x, point.y - 58 * scale, 56 * scale, 0, Math.PI * 2);
        context.fill();
      }

      if (stateForFighter.shield > 0) {
        context.strokeStyle = "rgba(110,232,211," + (0.25 + 0.45 * stateForFighter.shield) + ")";
        context.lineWidth = 4 * scale;
        context.beginPath();
        context.arc(point.x, point.y - 35 * scale, 92 * scale, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();

      const barWidth = Math.min(230, width * .28);
      const barX = point.x - barWidth / 2;
      const barY = point.y + 92;
      drawMeter(
        barX,
        barY,
        barWidth,
        14,
        fighter.hp,
        fighter.maxHp,
        team === "enemy" ? "#ff648e" : "#6fb7ff",
        Math.ceil(fighter.hp) + " / " + fighter.maxHp
      );
      if (team === "player") {
        drawText("SHIELD " + Math.ceil(fighter.block || 0), point.x, barY + 27, 10, "900", "center", "#6ee8d3");
      }
      drawText(
        team === "enemy" ? String(fighter.name || "ENEMY") : "BŌSŌZOKU",
        point.x,
        barY + (team === "player" ? 45 : 29),
        12,
        "950",
        "center",
        "#ffffff"
      );
      const statuses = window.StatusSystem?.entries?.(fighter) || [];
      statuses.slice(0, 3).forEach((status, index) => {
        const text = status.label + (status.remainingMs > 0 ? " " + (status.remainingMs / 1000).toFixed(1) : "");
        const color = status.type === "EXPOSED" ? "#ffb24d" : "#c79cff";
        drawText(text, point.x + (index - (statuses.slice(0, 3).length - 1) / 2) * 72, barY + 62, 9, "850", "center", color);
      });
    }

    function drawIntent(combat, width, height, now) {
      const intent = combat?.enemyIntent;
      if (!intent) return;
      const enemyPoint = positionFor("enemy", width, height);
      const leadMs = Number(combat?.enemyBehavior?.telegraphMs || intent.remainingMs || 1);
      const pulse = .45 + .25 * Math.sin(now / 120);
      const remaining = Math.max(0, Number(intent.remainingMs || 0));
      context.strokeStyle = "rgba(255,178,77," + pulse + ")";
      context.lineWidth = 3;
      context.setLineDash([10, 8]);
      context.beginPath();
      context.arc(enemyPoint.x, enemyPoint.y - 50, 82 + 8 * (1 - remaining / Math.max(1, leadMs)), 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);

      const type = String(intent.type || "ATTACK");
      const icon = type === "ATTACK" ? "!" : type === "DEFEND" ? "◆" : "☄";
      drawText(icon, enemyPoint.x, enemyPoint.y - 155, 24, "1000", "center", "#ffd88c", .9);
    }

    function drawImpact(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      const point = positionFor(effect.targetTeam || teamForId(combat, effect.targetId), width, height);
      if (!point) return;
      if (effect.damage > 0) {
        const lift = p * 52;
        const offset = effect.critical ? 22 : 0;
        drawText(
          "-" + effect.damage,
          point.x + offset,
          point.y - 118 - lift,
          effect.critical ? 23 : 18,
          "1000",
          "center",
          effect.critical ? "#ffd36b" : "#ffffff",
          alpha
        );
      }
      if (effect.blockAbsorbed > 0) {
        drawText("BLOCK " + effect.blockAbsorbed, point.x, point.y - 92, 12, "900", "center", "#6ee8d3", alpha);
      }
      if (effect.breakDamage > 0) {
        drawText("BRK -" + effect.breakDamage, point.x, point.y - 78, 10, "900", "center", "#ffb24d", alpha);
      }
      if (effect.damageReductionApplied > 0) {
        drawText("DR -" + effect.damageReductionApplied, point.x, point.y - 62, 10, "900", "center", "#8df1e1", alpha);
      }
      const radius = 24 + p * 30;
      context.strokeStyle = "rgba(255,255,255," + (.42 * alpha) + ")";
      context.lineWidth = Math.max(1, 4 * alpha);
      context.beginPath();
      context.arc(point.x, point.y - 54, radius, 0, Math.PI * 2);
      context.stroke();
    }

    function drawAttack(effect, combat, width, height, now) {
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

      drawBackground(width, height, combat, now);

      if (combat) {
        drawIntent(combat, width, height, now);
        drawFighter("player", combat, width, height, now);
        drawFighter("enemy", combat, width, height, now);
        renderEffects(combat, width, height, now);

        if (window.BreakSystem?.isBroken?.(combat.enemy.breakState)) {
          context.fillStyle = "rgba(255,178,77,.05)";
          context.fillRect(0, 0, width, height);
        }
      }

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
      getAsset: assetFor
    });
  }

  window.CombatPresentation = Object.freeze({
    ASSET_SLOTS,
    create
  });
})();
