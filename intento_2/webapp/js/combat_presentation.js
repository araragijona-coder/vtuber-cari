(() => {
  "use strict";

  const MAX_EFFECTS = 72;
  const MAX_SEEN_ACTIONS = 128;
  const ATTACK_STYLE_CONTRACTS = Object.freeze({
    yuri_racha_neon: Object.freeze({
      styleId: "YURI_RACHA_NEON",
      characterId: "yuri",
      abilityId: "yuri_racha_neon",
      attackState: "ATTACK",
      motion: Object.freeze({ dx: 154, dy: -24, dz: -0.08, rotation: 0.045, scale: 0.055, duration: 360 }),
      cameraShot: "ATTACK_APPROACH"
    }),
    yuri_break_drive: Object.freeze({
      styleId: "YURI_BREAK_DRIVE",
      characterId: "yuri",
      abilityId: "yuri_break_drive",
      attackState: "ATTACK",
      motion: Object.freeze({ dx: 108, dy: -42, dz: 0.1, rotation: -0.085, scale: 0.035, duration: 470 }),
      cameraShot: "ATTACK_APPROACH"
    })
  });
  const TWO_POINT_FIVE_D_ATTACK_CONFIGS = Object.freeze({
    yuri_break_drive: Object.freeze({
      characterId: "yuri",
      layerId: "yuri-body",
      layerZ: 0.22,
      mesh: Object.freeze({
        enabled: true,
        width: 180,
        height: 220,
        subdivisions: Object.freeze({ x: 2, y: 2 })
      }),
      motion: Object.freeze({
        enabled: true,
        amplitude: 0.018,
        frequency: 1.15,
        phase: 0
      }),
      lighting: Object.freeze({
        enabled: true,
        ambient: 0.24,
        intensity: 0.32,
        direction: Object.freeze({ x: 0.35, y: -1 }),
        tint: Object.freeze({ r: 1, g: 0.92, b: 0.78 })
      }),
      deformation: Object.freeze({ x: 0.055, y: 0.032 })
    })
  });

  const NON_ATTACK_STYLE_CONTRACTS = Object.freeze({
    yuri_impulso_mach: Object.freeze({
      styleId: "YURI_IMPULSO_MACH",
      characterId: "yuri",
      abilityId: "yuri_impulso_mach",
      presentationType: "BUFF",
      cameraShot: "PLAYER_FOCUS"
    })
  });

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
    "telegraph.debuff",
    "scene.companion_left_character",
    "scene.companion_left_motorcycle",
    "scene.companion_right_character",
    "scene.companion_right_motorcycle",
    "scene.enemy_secondary_character",
    "scene.enemy_secondary_motorcycle",
    "scene.enemy_far_character",
    "scene.enemy_far_motorcycle"
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
    const sceneCamera = window.MachGirlsSceneCamera?.create?.({ x: 600, y: 350 }) || null;
    const scene = window.MachGirlsScene?.create?.({ camera: sceneCamera }) || null;
    const sceneRenderer = window.MachGirlsSceneRenderer?.create?.({ context, camera: sceneCamera }) || null;
    const presentationEvents = window.MachGirlsPresentationEvents?.create?.() || null;

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
        telegraph: Object.create(null),
        scene: Object.create(null)
      },
      shotDirector: window.MachGirlsShotDirector?.create?.({ stageSeed: "mach-girls-phase28" }) || null,
      scene,
      sceneRenderer,
      presentationEvents,
      imageCache: new Map(),
      audioHooks: Object.create(null),
      combatId: null,
      composition: {
        player: { characterScale: 1, motorcycleScale: .98, motorcycleOffsetX: 0, motorcycleOffsetY: 34, identityLayer: true },
        enemy: { characterScale: 1, motorcycleScale: .78, motorcycleOffsetX: 0, motorcycleOffsetY: 18, identityLayer: true }
      },
      shotFrame: {
        current: { ...CAMERA_PRESETS.IDLE }
      },
      motionTracks: new Map(),
      attackStyle: null,
      presentationStyle: null,
      presentationRecovery: null,
      visualFreezeStartsAt: 0,
      visualFreezeUntil: 0,
      visualFreezeNow: 0,
      presentationEventCursor: 0,
      lastPresentationEvent: null,
      twoPointFiveDBaselines: new Map(),
      twoPointFiveDAttackTracks: new Map(),
      twoPointFiveDLightingModes: new Map(),
      sceneVfxSequence: 0,
      sceneVfxIds: new Set()
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
      const effectEntry = {
        type,
        start: performance.now() + delayMs,
        duration: Math.max(80, Number(duration) || 80),
        ...effectPayload
      };

      const sceneVfxType = {
        attack: "MOTION_TRAIL",
        trail: "MOTION_TRAIL",
        impact: "IMPACT",
        break: "BREAK",
        burst: "BURST"
      }[String(type || "").toLowerCase()] || null;

      if (sceneVfxType && state.scene?.addEffect) {
        const actorTeam =
          type === "impact" || type === "break"
            ? effectPayload.targetTeam || "enemy"
            : effectPayload.attacker || "player";
        const actorRole = actorTeam === "player" ? "PLAYER" : "ENEMY_PRIMARY";
        const sceneVfxId = "presentation-vfx:" + (++state.sceneVfxSequence);
        const added = state.scene.addEffect(sceneVfxId, {
          type: sceneVfxType,
          scope: "ACTOR",
          actorId: "scene:" + actorRole,
          layerId: actorRole === "PLAYER" ? "yuri-body" : null,
          anchor: "CENTER",
          offset: { x: 0, y: 0 },
          scale: 1,
          opacity: 1,
          intensity: clamp(effectPayload.intensity ?? 1, 0, 1),
          durationMs: effectEntry.duration,
          startTime: effectEntry.start,
          data: { ...effectPayload, type }
        });
        if (added) {
          effectEntry.sceneVfxId = sceneVfxId;
          state.sceneVfxIds.add(sceneVfxId);
        }
      }

      state.effects.push(effectEntry);
      while (state.effects.length > MAX_EFFECTS) {
        const removed = state.effects.shift();
        if (removed?.sceneVfxId) {
          state.scene?.removeEffect?.(removed.sceneVfxId);
          state.sceneVfxIds.delete(removed.sceneVfxId);
        }
      }
    }

    function renderSceneVfx(combat, width, height, now) {
      if (!state.scene?.renderables) return;
      const localType = {
        MOTION_TRAIL: "trail",
        IMPACT: "impact",
        BREAK: "break",
        BURST: "burst",
        FLASH: "impact",
        GLOW: "attack"
      };
      for (const item of state.scene.renderables(now)) {
        if (item.type !== "FX" || !item.effect?.visible || item.effect.scope !== "ACTOR") continue;
        const mapped = localType[item.effect.type];
        if (!mapped) continue;
        const effect = {
          type: mapped,
          start: item.effect.startTime,
          duration: item.effect.durationMs,
          ...(item.effect.data || {})
        };
        if (mapped === "trail") drawMotionTrail(effect, combat, width, height, now);
        if (mapped === "impact") drawImpact(effect, combat, width, height, now);
        if (mapped === "break") drawBreak(effect, width, height, now);
        if (mapped === "burst") drawBurst(effect, combat, width, height, now);
        if (mapped === "attack") drawAttack(effect, combat, width, height, now);
      }
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

    function scheduleMotion(role, spec = {}, now = performance.now()) {
      const key = String(role || "").toUpperCase();
      if (!key) return;
      state.motionTracks.set(key, {
        start: Number(now) || 0,
        duration: Math.max(1, Number(spec.duration) || 240),
        dx: Number(spec.dx) || 0,
        dy: Number(spec.dy) || 0,
        dz: Number(spec.dz) || 0,
        rotation: Number(spec.rotation) || 0,
        scale: Number(spec.scale) || 0
      });
    }

    function motionFor(role, now = performance.now()) {
      const key = String(role || "").toUpperCase();
      const track = state.motionTracks.get(key);
      if (!track) return { x: 0, y: 0, z: 0, rotation: 0, scale: 1 };
      const elapsed = Math.max(0, (Number(now) || 0) - track.start);
      const raw = progress(elapsed + track.start, track.start, track.duration);
      if (raw >= 1) {
        state.motionTracks.delete(key);
        return { x: 0, y: 0, z: 0, rotation: 0, scale: 1 };
      }
      const wave = Math.sin(Math.PI * smoothstep(raw));
      return {
        x: track.dx * wave,
        y: track.dy * wave,
        z: track.dz * wave,
        rotation: track.rotation * wave,
        scale: 1 + track.scale * wave
      };
    }

    function positionFor(team, width, height) {
      const role = team === "player" ? "PLAYER" : "ENEMY_PRIMARY";
      const actor = state.scene?.getActor?.("scene:" + role);
      if (actor?.transform?.visible) {
        return { x: actor.transform.x, y: actor.transform.y };
      }

      const staged = state.shotDirector?.getEntityFrame?.(role, width, height);
      if (staged?.coordinateSpace === "WORLD_STAGE_PX") {
        return { x: staged.x, y: staged.y };
      }

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
      const width = state.viewport?.width || 1000;
      const height = state.viewport?.height || 600;
      if (state.scene?.camera) {
        const target = {
          x: width / 2,
          y: height / 2,
          zoom: preset.zoom,
          offsetX: preset.offsetX,
          offsetY: preset.offsetY,
          durationMs: preset.duration,
          name: key,
          shake: preset.shake
        };
        if (instant) state.scene.camera.snap(target);
        else state.scene.camera.setTarget(target, now);
      }
      state.shotFrame = {
        current: { ...preset },
        target: { ...preset },
        active: key
      };
      return { ...preset, name: key };
    }

    function setShot(name, instant = false, now = performance.now()) {
      if (!state.shotDirector) return setCameraPreset(name, instant, now);
      const shot = state.shotDirector.setShot(name, instant, now);
      const profile = shot.profile || CAMERA_PRESETS.IDLE;
      const target = state.shotDirector.resolveTarget?.(profile.target) || { x: .5, y: .5 };
      const width = state.viewport?.width || 1000;
      const height = state.viewport?.height || 600;
      const cameraTarget = {
        x: target.x * width,
        y: target.y * height,
        zoom: Number(profile.zoom || 1),
        offsetX: Number(profile.offsetX || 0),
        offsetY: Number(profile.offsetY || 0),
        durationMs: Number(profile.duration || 0),
        name: shot.name,
        shake: Number(profile.shake || 0)
      };
      if (state.scene?.camera) {
        if (instant) state.scene.camera.snap(cameraTarget);
        else state.scene.camera.setTarget(cameraTarget, now);
      }
      state.shotFrame = {
        active: shot.name,
        profile: { ...profile },
        current: {
          ...CAMERA_PRESETS[shot.cameraPreset || "IDLE"],
          parallaxMultiplier: Number(profile.parallaxMultiplier || 1),
          foregroundIntensity: Number(profile.foregroundIntensity || 1),
          lightingIntensity: Number(profile.lightingIntensity || 1)
        },
        target: { ...cameraTarget }
      };
      return { ...shot, camera: state.scene?.camera?.getState?.() || cameraTarget };
    }

    const TRANSIENT_PRESENTATION_EFFECTS = Object.freeze([
      "attack",
      "trail",
      "impact",
      "break",
      "burst"
    ]);

    function markPresentationTransient(kind, actionId) {
      const priorities = { ATTACK: 1, IMPACT: 2, BREAK: 3, BURST: 4 };
      const nextKind = String(kind || "ACTION").toUpperCase();
      const nextActionId = String(actionId || "");
      const current = state.presentationRecovery;
      if (
        current &&
        current.actionId === nextActionId &&
        (priorities[current.kind] || 0) > (priorities[nextKind] || 0)
      ) return;
      state.presentationRecovery = Object.freeze({ kind: nextKind, actionId: nextActionId });
      state.presentationStyle = null;
    }

    function hasActiveTransientPresentation(now) {
      const activeMotion = [...state.motionTracks.values()].some((track) =>
        progress(now, track.start, track.duration) < 1
      );
      if (activeMotion) return true;

      return state.effects.some((effect) =>
        TRANSIENT_PRESENTATION_EFFECTS.includes(effect.type) &&
        progress(now, effect.start, effect.duration) < 1
      );
    }

    function stableShotFor(combat) {
      if (combat?.outcome === "VICTORY") return "VICTORY";
      if (combat?.outcome === "DEFEAT") return "DEFEAT";
      return "PLAYER_FOCUS";
    }

    function recoverPresentation(now, combat) {
      if (!state.presentationRecovery) return false;
      if (hasActiveTransientPresentation(now)) return false;

      const activeShot =
        state.shotDirector?.getShotState?.(now)?.name ||
        state.shotFrame?.active ||
        "IDLE";
      const transientShots = ["ATTACK_APPROACH", "IMPACT", "BREAK", "BURST"];
      const stableShot = stableShotFor(combat);

      if (transientShots.includes(activeShot) && activeShot !== stableShot) {
        state.shotDirector
          ? setShot(stableShot, false, now)
          : setCameraPreset(stableShot, false, now);
      }

      if (state.presentationRecovery?.kind === "BURST") {
        state.lastPresentationEvent = Object.freeze({
          type: "BURST_FINISH",
          actionId: state.presentationRecovery.actionId
        });
      }
      state.attackStyle = null;
      state.presentationRecovery = null;
      clear2_5DTransientPresentation();
      return true;
    }

    function updateCamera(now, combat, width = 1000, height = 600) {
      state.viewport = { width, height };

      recoverPresentation(now, combat);

      if (combat?.outcome === "VICTORY" && state.shotDirector?.getShotState?.(now)?.name !== "VICTORY") setShot("VICTORY", false, now);
      else if (combat?.outcome === "DEFEAT" && state.shotDirector?.getShotState?.(now)?.name !== "DEFEAT") setShot("DEFEAT", false, now);

      const cameraState = state.scene?.camera?.update?.(now) || {
        zoom: 1, offsetX: 0, offsetY: 0, x: width / 2, y: height / 2, shake: 0, active: "IDLE"
      };
      const profile = state.shotDirector?.getShotState?.(now)?.profile || CAMERA_PRESETS.IDLE;
      state.shotFrame = {
        ...(state.shotFrame || {}),
        active: state.shotDirector?.getShotState?.(now)?.name || cameraState.active,
        profile: { ...profile },
        current: {
          ...cameraState,
          parallaxMultiplier: Number(profile.parallaxMultiplier || 1),
          foregroundIntensity: Number(profile.foregroundIntensity || 1),
          lightingIntensity: Number(profile.lightingIntensity || 1)
        }
      };
      return cameraState;
    }

    function active2_5DConfig(combat) {
      const characterId = String(combat?.player?.identity?.characterId || combat?.characterId || "");
      const abilityId = String(state.attackStyle?.abilityId || "");
      const config = TWO_POINT_FIVE_D_ATTACK_CONFIGS[abilityId];
      return config?.characterId === characterId ? config : null;
    }

    function configure2_5DActor(actor, role, combat) {
      if (!actor || role !== "PLAYER") return false;
      const config = active2_5DConfig(combat);
      if (!config) return false;
      const currentLayers = actor.getRenderLayers?.() || [];
      if (currentLayers.length === 0) {
        actor.setLayers([{
          id: config.layerId,
          assetId: "player.attack",
          z: config.layerZ,
          visible: true,
          opacity: 1,
          mesh: config.mesh,
          motion: config.motion,
          lighting: config.lighting
        }]);
      }
      for (const layer of actor.getRenderLayers?.() || []) {
        const key = actor.id + "::" + layer.id;
        if (layer.lighting?.getSnapshot && !state.twoPointFiveDBaselines.has(key)) {
          state.twoPointFiveDBaselines.set(key, layer.lighting.getSnapshot());
        }
      }
      return true;
    }

    function meshAttackOffsets(layer, track, now) {
      const mesh = layer?.mesh;
      const base = mesh?.getBaseVertices?.() || [];
      if (!track || base.length === 0) return base.map(() => ({ x: 0, y: 0 }));
      const raw = progress(now, track.start, track.duration);
      if (raw >= 1) return base.map(() => ({ x: 0, y: 0 }));
      const wave = Math.sin(Math.PI * smoothstep(raw));
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const vertex of base) {
        minX = Math.min(minX, Number(vertex.x) || 0);
        maxX = Math.max(maxX, Number(vertex.x) || 0);
        minY = Math.min(minY, Number(vertex.y) || 0);
        maxY = Math.max(maxY, Number(vertex.y) || 0);
      }
      const spanX = Math.max(1, maxX - minX);
      const spanY = Math.max(1, maxY - minY);
      return base.map((vertex) => {
        const xNorm = ((Number(vertex.x) || 0) - minX) / spanX;
        const yNorm = ((Number(vertex.y) || 0) - minY) / spanY;
        return {
          x: track.x * wave * (0.35 + 0.65 * xNorm),
          y: -track.y * wave * (0.2 + 0.8 * (1 - yNorm))
        };
      });
    }

    function apply2_5DPresentation(now) {
      for (const role of ["PLAYER", "ENEMY_PRIMARY"]) {
        const actor = state.scene?.getActor?.("scene:" + role);
        if (!actor) continue;
        const attackTrack = state.twoPointFiveDAttackTracks.get(role) || null;
        for (const layer of actor.getRenderLayers?.() || []) {
          if (!layer.mesh?.setDeformationOffsets) continue;
          const base = layer.mesh.getBaseVertices?.() || [];
          const procedural = attackTrack && layer.motion?.evaluate
            ? layer.motion.evaluate(now, layer.mesh)
            : base.map(() => ({ x: 0, y: 0 }));
          const attack = meshAttackOffsets(layer, attackTrack, now);
          const combined = base.map((_, index) => ({
            x: (procedural[index]?.x || 0) + (attack[index]?.x || 0),
            y: (procedural[index]?.y || 0) + (attack[index]?.y || 0)
          }));
          layer.mesh.setDeformationOffsets(combined);
        }

        const lightingMode = state.twoPointFiveDLightingModes.get(role) || null;
        for (const layer of actor.getRenderLayers?.() || []) {
          if (!layer.lighting?.setProfile) continue;
          const baseline = state.twoPointFiveDBaselines.get(actor.id + "::" + layer.id);
          if (!baseline) continue;
          if (lightingMode) {
            const extraAmbient = lightingMode === "IMPACT" ? 0.1 : lightingMode === "BREAK" ? 0.08 : 0.05;
            const extraIntensity = lightingMode === "IMPACT" ? 0.3 : lightingMode === "BREAK" ? 0.22 : 0.14;
            layer.lighting.setProfile({
              ...baseline,
              ambient: clamp(baseline.ambient + extraAmbient, 0, 1),
              intensity: clamp(baseline.intensity + extraIntensity, 0, 1)
            });
          } else {
            layer.lighting.setProfile(baseline);
          }
        }
      }
    }

    function clear2_5DTransientPresentation() {
      state.twoPointFiveDAttackTracks.clear();
      state.twoPointFiveDLightingModes.clear();
      for (const [key, baseline] of state.twoPointFiveDBaselines.entries()) {
        const split = key.indexOf("::");
        const actorId = key.slice(0, split);
        const layerId = key.slice(split + 2);
        const actor = state.scene?.getActor?.(actorId);
        const layer = actor?.getRenderLayers?.().find((entry) => entry.id === layerId);
        if (layer?.mesh?.resetDeformation) layer.mesh.resetDeformation();
        if (layer?.lighting?.setProfile) layer.lighting.setProfile(baseline);
      }
    }

    function ensureFoundationActor(role, transform, stateName = "IDLE", combat = null) {
      if (!state.scene || !window.MachGirlsActor) return null;
      const id = "scene:" + role;
      let actor = state.scene.getActor(id);
      if (!actor) {
        actor = window.MachGirlsActor.create({
          id,
          role,
          layer: "ACTORS",
          transform: {
            x: transform.x,
            y: transform.y,
            z: transform.z,
            scale: transform.scale,
            rotation: transform.rotation,
            state: stateName,
            visible: transform.visible !== false
          },
          anchor: role,
          metadata: { foundation: true }
        });
        state.scene.registerActor(actor);

        if (role === "PLAYER") {
          actor.attachChild(window.MachGirlsActor.create({
            id: "scene:PLAYER:MOTORCYCLE",
            role: "MOTORCYCLE",
            layer: "ACTORS",
            transform: { x: 0, y: 34, z: 0, scale: .98, state: "IDLE", visible: true, anchor: "FEET_CENTER", assetRef: "player.motorcycle" }
          }));
          actor.attachChild(window.MachGirlsActor.create({
            id: "scene:PLAYER:SHADOW",
            role: "SHADOW",
            layer: "ACTORS",
            transform: { x: 0, y: 20, z: 0, scale: 1, state: "IDLE", visible: true, anchor: "CENTER" }
          }));
        }
        if (role === "ENEMY_PRIMARY") {
          actor.attachChild(window.MachGirlsActor.create({
            id: "scene:ENEMY_PRIMARY:SHADOW",
            role: "SHADOW",
            layer: "ACTORS",
            transform: { x: 0, y: 20, z: 0, scale: .92, state: "IDLE", visible: true, anchor: "CENTER" }
          }));
        }
      } else {
        actor.setTransform({
          x: transform.x,
          y: transform.y,
          z: transform.z,
          scale: transform.scale,
          rotation: transform.rotation,
          visible: transform.visible !== false,
          state: stateName
        });
      }
      actor.setState(stateName);
      configure2_5DActor(actor, role, combat);
      return actor;
    }

    function syncFoundationScene(combat, width, height, now) {
      if (!state.shotDirector || !state.scene) return;
      const roles = [
        "COMPANION_LEFT",
        "ENEMY_FAR",
        "ENEMY_SECONDARY",
        "ENEMY_PRIMARY",
        "PLAYER",
        "COMPANION_RIGHT"
      ];
      for (const role of roles) {
        const frame = state.shotDirector.getEntityFrame?.(role, width, height);
        if (!frame) continue;
        const combatActor = role === "PLAYER" ? "player" : role.startsWith("ENEMY") ? "enemy" : null;
        const team = combatActor || "player";
        let stateName = "IDLE";
        if (combatActor && combat) {
          const visualState = visualStateFor(team, combat, now, fighterState(team, combat, now));
          const animationState = {
            "NORMAL": "IDLE",
            "ATTACKING": "ATTACK",
            "HURT": "HIT",
            "BREAK": "BREAK",
            "BURST READY": "IDLE",
            "BURST ACTIVE": "BURST",
            "VICTORY": "VICTORY",
            "DEFEAT": "DEFEAT"
          };
          stateName = animationState[visualState] || "IDLE";
        }
        const motion = motionFor(role, now);
        const actor = ensureFoundationActor(role, {
          x: frame.x + motion.x,
          y: frame.y + motion.y,
          z: frame.depth + motion.z,
          scale: frame.scale * motion.scale,
          rotation: motion.rotation,
          visible: frame.enabled
        }, stateName);
        configure2_5DActor(actor, role, combat);
      }
      apply2_5DPresentation(now);
    }

    function applyPresentationEvent(combat, event, now) {
      if (!event || !state.scene) return;
      const action = event.action || {};
      const sourceRole = action.source === "ENEMY_AUTO_ATTACK" || action.actionType === "ENEMY_BEHAVIOR"
        ? "ENEMY_PRIMARY"
        : "PLAYER";
      const targetRole = teamForId(combat, action.targetId) === "player" ? "PLAYER" : "ENEMY_PRIMARY";
      const source = state.scene.getActor("scene:" + sourceRole);
      const target = state.scene.getActor("scene:" + targetRole);
      if (event.type === "ATTACK") source?.setState("ATTACK", now);
      if (event.type === "IMPACT") target?.setState("HIT", now);
      if (event.type === "BREAK") target?.setState("BREAK", now);
      if (event.type === "BURST") source?.setState("BURST", now);
      if (event.type === "VICTORY") source?.setState("VICTORY", now);
      if (event.type === "DEFEAT") source?.setState("DEFEAT", now);
      if (event.type === "TELEGRAPH") target?.setState("STAGGER", now);
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
      const sceneRole = String(record.sceneRole || "").toUpperCase();
      const sceneSlots = {
        COMPANION_LEFT: { CHARACTER: "scene.companion_left_character", MOTORCYCLE: "scene.companion_left_motorcycle" },
        COMPANION_RIGHT: { CHARACTER: "scene.companion_right_character", MOTORCYCLE: "scene.companion_right_motorcycle" },
        ENEMY_SECONDARY: { CHARACTER: "scene.enemy_secondary_character", MOTORCYCLE: "scene.enemy_secondary_motorcycle" },
        ENEMY_FAR: { CHARACTER: "scene.enemy_far_character", MOTORCYCLE: "scene.enemy_far_motorcycle" }
      };
      if (sceneSlots[sceneRole]?.[type]) return sceneSlots[sceneRole][type];
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
          if (slot && record.source && setAsset(slot, record.source)) loaded += 1;
          const role = String(record.sceneRole || "").toUpperCase();
          if (state.shotDirector && window.MachGirlsShotDirector?.SCENE_ROLES?.includes(role)) {
            state.shotDirector.setEntity(role, {
              enabled: true,
              baselineScale: Number(record.baselineScale ?? record.scale ?? 1),
              focusScale: Number(record.focusScale ?? Math.max(0.1, Number(record.scale ?? 1) * 1.08)),
              focusOffsetX: Number(record.focusOffsetX ?? 0),
              focusOffsetY: Number(record.focusOffsetY ?? 0),
              scale: Number(record.baselineScale ?? record.scale ?? 1),
              depth: Number(record.depth ?? 0.5),
              parallax: Number(record.parallax ?? 1)
            });
          }
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
      const multiplier = Number(state.shotFrame?.current?.parallaxMultiplier || 1);
      const drift = (Number(now) / 95 * multiplier) % 54;
      context.strokeStyle = "rgba(91,150,224," + (.13 * Math.min(1.5, multiplier)) + ")";
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
      const intensity = Number(state.shotFrame?.current?.foregroundIntensity || 1);
      const drift = (Number(now) / 22 * intensity) % 90;
      context.strokeStyle = "rgba(255,255,255," + ((.05 + .06 * velocity) * intensity) + ")";
      context.lineWidth = 2;
      for (let i = 0; i < 9; i += 1) {
        const x = ((i * 141 + drift * 2.2) % (width + 160)) - 80;
        const y = height * .62 + ((i * 29) % Math.max(40, height * .3));
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - (18 + i * 2) * velocity, y + 8);
        context.stroke();
      }
      context.strokeStyle = "rgba(110,232,211," + (.16 * intensity) + ")";
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
      if (typeof context.createRadialGradient !== "function") return;
      const intensity = Number(state.shotFrame?.current?.lightingIntensity || 1);
      const glow = context.createRadialGradient(width * .5, height * .42, 20, width * .5, height * .42, Math.max(width, height) * .62);
      glow.addColorStop(0, "rgba(91,150,224," + ((combat ? .08 : .035) * intensity) + ")");
      glow.addColorStop(.55, "rgba(199,156,255," + (.025 * intensity) + ")");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      if (combat && window.BreakSystem?.isBroken?.(combat.enemy?.breakState)) {
        context.fillStyle = "rgba(255,178,77," + (.045 * intensity) + ")";
        context.fillRect(0, 0, width, height);
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
      if (typeof context.rotate === "function") {
        if (mode === "defeat") context.rotate(enemy ? -.04 : .04);
        if (mode === "victory") context.rotate(enemy ? .03 : -.03);
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
      if (typeof context.rotate === "function") context.rotate(lean);
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

    function foundationChild(team, childRole) {
      const role = team === "player" ? "PLAYER" : "ENEMY_PRIMARY";
      const actor = state.scene?.getActor?.("scene:" + role);
      const children = actor?.getSnapshot?.().children || [];
      return children.find((child) => String(child.role || "").toUpperCase() === childRole) || null;
    }

    function drawFoundationShadow(team, point, baseScale) {
      const shadow = foundationChild(team, "SHADOW");
      const transform = shadow?.transform || { x: 0, y: 20, scale: 1 };
      context.save();
      context.globalAlpha = .22;
      context.fillStyle = "#000000";
      context.beginPath();
      context.ellipse(
        point.x + Number(transform.x || 0),
        point.y + Number(transform.y || 20),
        64 * baseScale * Number(transform.scale || 1),
        13 * baseScale * Number(transform.scale || 1),
        0,
        0,
        Math.PI * 2
      );
      context.fill();
      context.restore();
    }

    function drawMotorcycle(team, point, baseScale, mode, now) {
      const composition = compositionFor(team);
      const child = foundationChild(team, "MOTORCYCLE");
      const transform = child?.transform || {
        x: team === "enemy" ? -composition.motorcycleOffsetX : composition.motorcycleOffsetX,
        y: composition.motorcycleOffsetY,
        scale: composition.motorcycleScale
      };
      const childScale = Number(transform.scale || composition.motorcycleScale || 1);
      const scale = baseScale * childScale;
      const image = imageFor(team + ".motorcycle");
      const sign = team === "enemy" ? -1 : 1;
      const x = point.x + sign * Number(transform.x || 0);
      const y = point.y + Number(transform.y || 0);
      if (image) {
        const width = 226 * scale;
        const height = 120 * scale;
        context.drawImage(image, x - width / 2, y - height * .44, width, height);
      } else {
        drawPlaceholderMotorcycle(team, x, y, scale, mode, now);
        drawText("TECHNICAL MOTORCYCLE PLACEHOLDER · NOT FINAL ART", x, y + 70, 8, "850", "center", "rgba(255,255,255,.58)");
      }
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

    function visualStateFor(team, combat, now, stateForFighter) {
      if (!combat) return VISUAL_STATES.NORMAL;
      if (combat.outcome === "VICTORY") return VISUAL_STATES.VICTORY;
      if (combat.outcome === "DEFEAT") return VISUAL_STATES.DEFEAT;
      if (team === "enemy" && window.BreakSystem?.isBroken?.(combat.enemy?.breakState)) return VISUAL_STATES.BREAK;
      const burstActive = state.effects.some((effect) => effect.type === "burst" && progress(now, effect.start, effect.duration) < 1);
      if (burstActive) return VISUAL_STATES.BURST_ACTIVE;
      if (team === "player" && window.BurstSystem?.canUse?.(combat)) return VISUAL_STATES.BURST_READY;
      const impactActive = state.effects.some(
        (effect) => effect.type === "impact" &&
          effect.targetTeam === team &&
          progress(now, effect.start, effect.duration) < 1
      );
      if (impactActive) return VISUAL_STATES.HURT;
      const attackActive = state.effects.some(
        (effect) => effect.type === "attack" &&
          effect.attacker === team &&
          progress(now, effect.start, effect.duration) < 1
      );
      if (attackActive) return VISUAL_STATES.ATTACKING;
      return VISUAL_STATES.NORMAL;
    }

    function drawFighter(team, combat, width, height, now) {
      const stateForFighter = fighterState(team, combat, now);
      const fighter = stateForFighter.fighter;
      if (!fighter) return;
      const point = positionFor(team, width, height);
      const actorRole = team === "player" ? "PLAYER" : "ENEMY_PRIMARY";
      const foundationActor = state.scene?.getActor?.("scene:" + actorRole);
      const foundationScale = foundationActor?.transform?.scale || 1;
      const foundationDepth = foundationActor?.transform?.z || 0;
      const depthScale = window.MachGirlsWorldSpace?.depthFactor?.(foundationDepth) || 1;
      const baseScale = clamp(Math.min(width / 860, height / 590) * foundationScale * depthScale, .62, 1.35);
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
      const actorPoint = {
        x: point.x,
        y: point.y,
        z: foundationDepth
      };
      drawFoundationShadow(team, actorPoint, baseScale);
      context.translate(stateForFighter.lunge, 0);
      if (image) {
        const imageWidth = 190 * scale;
        const imageHeight = 224 * scale;
        context.globalAlpha = .98;
        context.drawImage(image, point.x - imageWidth / 2, point.y - imageHeight + 74, imageWidth, imageHeight);
      } else {
        drawPlaceholderFighter(team, fighter, point.x, point.y, scale, mode, now);
      }
      drawMotorcycle(team, actorPoint, baseScale, mode, now);
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

    function drawIntent(combat, width, height, now) {
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

    function drawImpact(effect, combat, width, height, now) {
      const p = progress(now, effect.start, effect.duration);
      const alpha = 1 - smoothstep(p);
      const point = positionFor(effect.targetTeam || teamForId(combat, effect.targetId), width, height);
      if (!point) return;
      if (effect.damage > 0) drawText("-" + effect.damage, point.x + (effect.critical ? 22 : 0), point.y - 118 - p * 52, effect.critical ? 23 : 18, "1000", "center", effect.critical ? "#ffd36b" : "#ffffff", alpha);
      if (effect.blockAbsorbed > 0) drawText("BLOCK " + effect.blockAbsorbed, point.x, point.y - 92, 12, "900", "center", "#6ee8d3", alpha);
      if (effect.breakDamage > 0) drawText("BRK -" + effect.breakDamage, point.x, point.y - 78, 10, "900", "center", "#ffb24d", alpha);
      if (effect.damageReductionApplied > 0) drawText("DR -" + effect.damageReductionApplied, point.x, point.y - 62, 10, "900", "center", "#8df1e1", alpha);
      const radius = 28 + p * 42;
      context.fillStyle = "rgba(255,255,255," + (.18 * alpha) + ")";
      context.beginPath();
      context.arc(point.x, point.y - 54, Math.max(18, radius * .58), 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(255,255,255," + (.62 * alpha) + ")";
      context.lineWidth = Math.max(2, 6 * alpha);
      context.beginPath();
      context.arc(point.x, point.y - 54, radius, 0, Math.PI * 2);
      context.stroke();
      const sparks = effect.damage > 0 ? 12 : 6;
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
        if (effect.sceneVfxId) {
          if (progress(now, effect.start, effect.duration) < 1) active.push(effect);
          continue;
        }
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
      state.motionTracks.clear();
      state.attackStyle = null;
      state.presentationStyle = null;
      state.presentationRecovery = null;
      state.visualFreezeUntil = 0;
      state.visualFreezeNow = 0;
      for (const sceneVfxId of state.sceneVfxIds) state.scene?.removeEffect?.(sceneVfxId);
      state.sceneVfxIds.clear();
      state.presentationEventCursor = 0;
      state.lastPresentationEvent = null;
      state.twoPointFiveDBaselines.clear();
      state.twoPointFiveDAttackTracks.clear();
      state.twoPointFiveDLightingModes.clear();
      state.combatId = combat?.battleId ? String(combat.battleId) : null;
      state.shotFrame = null;
      state.scene?.removeActor?.("scene:PLAYER");
      state.scene?.removeActor?.("scene:ENEMY_PRIMARY");
      state.composition = {
        player: { characterScale: 1, motorcycleScale: .98, motorcycleOffsetX: 0, motorcycleOffsetY: 34, identityLayer: true },
        enemy: { characterScale: 1, motorcycleScale: .78, motorcycleOffsetX: 0, motorcycleOffsetY: 18, identityLayer: true }
      };
      if (state.shotDirector) {
        state.shotDirector.setEntity("COMPANION_LEFT", { enabled: false });
        state.shotDirector.setEntity("COMPANION_RIGHT", { enabled: false });
        setShot("ESTABLISHING", true);
      } else setCameraPreset("IDLE", true);
      loadApprovedCatalog(combat);
    }

    function onCombatEvent(combat, gameplayEvent) {
      const presentationEvent = state.presentationEvents?.fromCombatEvent?.(gameplayEvent) || null;
      if (!presentationEvent) return false;
      const eventNow = performance.now();
      const action = presentationEvent.action || {};
      const sourceRole = action.actorId === "ENEMY_PRIMARY" ? "ENEMY_PRIMARY" : "PLAYER";
      const targetRole = action.targetId === "PLAYER" ? "PLAYER" : "ENEMY_PRIMARY";
      const actionId = String(gameplayEvent.actionId || action.actionId || "");

      if (presentationEvent.type === "ATTACK") {
        markPresentationTransient("ATTACK", actionId);
        state.scene?.getActor?.("scene:" + sourceRole)?.setState("ATTACK", eventNow);
        const characterId = String(gameplayEvent.characterId || combat?.player?.identity?.characterId || combat?.characterId || "");
        const cardId = String(gameplayEvent.cardId || "");
        const style = ATTACK_STYLE_CONTRACTS[cardId]?.characterId === characterId ? ATTACK_STYLE_CONTRACTS[cardId] : null;
        scheduleMotion(sourceRole, style?.motion || {
          dx: sourceRole === "PLAYER" ? 112 : -86,
          dy: -9,
          dz: sourceRole === "PLAYER" ? 0.04 : -0.04,
          duration: 520
        }, eventNow);
        state.attackStyle = style ? Object.freeze({
          styleId: style.styleId, characterId: style.characterId, abilityId: style.abilityId,
          actionId, attackState: style.attackState,
          hitCount: Number(gameplayEvent.hitCount || 1),
          contactCount: Number(gameplayEvent.hitCount || 1),
          cameraShot: style.cameraShot
        }) : null;
        const attack2_5d = active2_5DConfig(combat);
        if (attack2_5d) {
          state.twoPointFiveDAttackTracks.set(sourceRole, {
            start: eventNow,
            duration: Math.max(1, Number(style?.motion?.duration || 520)),
            x: attack2_5d.deformation.x,
            y: attack2_5d.deformation.y
          });
          state.twoPointFiveDLightingModes.set(sourceRole, "ATTACK");
        }
        state.shotDirector ? setShot(style?.cameraShot || "ATTACK_APPROACH") : setCameraPreset("ATTACK");
        addEffect("attack", {
          attacker: sourceRole === "PLAYER" ? "player" : "enemy",
          targetTeam: targetRole === "PLAYER" ? "player" : "enemy",
          intensity: .8, kind: "skill"
        }, style?.motion?.duration || 500);
        return true;
      }

      if (presentationEvent.type === "IMPACT") {
        markPresentationTransient("IMPACT", actionId);
        const targetTeam = targetRole === "PLAYER" ? "player" : "enemy";
        const contactAt = eventNow + 110;
        state.scene?.getActor?.("scene:" + targetRole)?.setState("HIT", contactAt);
        scheduleMotion(targetRole, {
          dx: targetRole === "ENEMY_PRIMARY" ? 52 : -52,
          dy: -8, dz: 0.07,
          rotation: targetRole === "ENEMY_PRIMARY" ? 0.07 : -0.07,
          duration: 320
        }, contactAt);
        state.visualFreezeStartsAt = Math.min(state.visualFreezeStartsAt || contactAt, contactAt);
        state.visualFreezeUntil = Math.max(state.visualFreezeUntil, contactAt + 110);
        state.visualFreezeNow = contactAt;
        state.twoPointFiveDLightingModes.set(targetRole, "IMPACT");
        state.shotDirector ? setShot(action.actionType === "BURST" ? "BURST" : "IMPACT") : setCameraPreset(action.actionType === "BURST" ? "BURST" : "IMPACT");
        addEffect("impact", {
          targetTeam, targetId: gameplayEvent.targetRole,
          damage: Number(gameplayEvent.damage || 0),
          breakDamage: Number(gameplayEvent.breakDamage || 0),
          delayMs: 110
        }, 720);
        emitAudio(targetTeam === "player" ? "enemyHit" : "impact", gameplayEvent);
        return true;
      }

      if (presentationEvent.type === "BREAK") {
        markPresentationTransient("BREAK", actionId);
        state.motionTracks.delete("ENEMY_PRIMARY");
        state.twoPointFiveDAttackTracks.delete("ENEMY_PRIMARY");
        state.twoPointFiveDLightingModes.set("ENEMY_PRIMARY", "BREAK");
        state.scene?.getActor?.("scene:ENEMY_PRIMARY")?.setState("BREAK", eventNow);
        scheduleMotion("ENEMY_PRIMARY", { dx: 64, dy: -14, dz: 0.09, rotation: 0.095, duration: 500 }, eventNow);
        state.visualFreezeStartsAt = eventNow;
        state.visualFreezeUntil = Math.max(state.visualFreezeUntil, eventNow + 120);
        state.visualFreezeNow = eventNow;
        state.shotDirector ? setShot("BREAK") : setCameraPreset("BREAK");
        addEffect("break", {}, 840);
        emitAudio("break", gameplayEvent);
        return true;
      }

      if (presentationEvent.type === "BURST") {
        markPresentationTransient("BURST", actionId);
        state.scene?.getActor?.("scene:PLAYER")?.setState("BURST", eventNow);
        scheduleMotion("PLAYER", { dx: 150, dy: -28, dz: -0.14, rotation: 0.075, scale: 0.06, duration: 620 }, eventNow);
        state.shotDirector ? setShot("BURST") : setCameraPreset("BURST");
        addEffect("burst", { damage: Number(gameplayEvent.damage || 0) }, 760);
        emitAudio("burst", gameplayEvent);
        return true;
      }
      return false;
    }

    function consumeCombatEvents(combat) {
      if (!combat || !Array.isArray(combat.events)) return 0;
      let consumed = 0;
      while (state.presentationEventCursor < combat.events.length) {
        const event = combat.events[state.presentationEventCursor++];
        if (onCombatEvent(combat, event)) consumed += 1;
      }
      return consumed;
    }

    function onAction(combat, action) {
      if (!action) return;
      if (combat?.battleId && state.combatId !== String(combat.battleId)) {
        onCombatStart(combat);
      }
      if (rememberAction(action.actionId)) return;

      const actionType = String(action.actionType || action.type || "");
      const presentationEvent = state.presentationEvents?.fromAction?.(action) || null;
      const characterId = String(combat?.player?.identity?.characterId || combat?.characterId || "");
      const definition = (actionType === "SKILL" || actionType === "CARD")
        ? window.CombatEngine?.cardDefinitionFor?.(combat, action.cardId) ||
          window.CardSystem?.definitionFor?.(action.cardId)
        : null;
      const attackStyle = (actionType === "SKILL" || actionType === "CARD")
        ? ATTACK_STYLE_CONTRACTS[String(action.cardId || "")]
        : null;
      const nonAttackStyle = (actionType === "SKILL" || actionType === "CARD")
        ? NON_ATTACK_STYLE_CONTRACTS[String(action.cardId || "")]
        : null;
      const characterAttackStyle = attackStyle && attackStyle.characterId === characterId
        ? attackStyle
        : null;
      const characterNonAttackStyle = nonAttackStyle && nonAttackStyle.characterId === characterId
        ? nonAttackStyle
        : null;
      const targetTeam = teamForId(combat, action.targetId) || (
        action.source === "ENEMY_AUTO_ATTACK" ? "player" : "enemy"
      );
      const attacker = action.source === "ENEMY_AUTO_ATTACK" || action.actionType === "ENEMY_BEHAVIOR" ? "enemy" : "player";
      const sourceRole = attacker === "enemy" ? "ENEMY_PRIMARY" : "PLAYER";
      const targetRole = targetTeam === "player" ? "PLAYER" : "ENEMY_PRIMARY";
      const eventNow = performance.now();
      const hasContactPayload =
        Number(action.damage || 0) > 0 ||
        Number(action.blockAbsorbed || 0) > 0 ||
        Number(action.breakDamage || 0) > 0 ||
        (Array.isArray(action.hits) && action.hits.length > 0);
      const isAttackAction =
        actionType === "AUTO_ATTACK" ||
        actionType === "ENEMY_BEHAVIOR" ||
        ((actionType === "SKILL" || actionType === "CARD") &&
          (String(definition?.type || "").toUpperCase() === "ATTACK" || hasContactPayload)) ||
        (actionType === "ABILITY" && hasContactPayload);
      const isAttackPresentation = presentationEvent?.type === "ATTACK" && isAttackAction;
      const isImpactPresentation =
        presentationEvent?.type === "IMPACT" ||
        Number(action.damage || 0) > 0 ||
        Number(action.blockAbsorbed || 0) > 0 ||
        Number(action.breakDamage || 0) > 0;

      if (isAttackPresentation) markPresentationTransient("ATTACK", action.actionId);
      if (isImpactPresentation) markPresentationTransient("IMPACT", action.actionId);
      if (presentationEvent?.type === "BREAK") markPresentationTransient("BREAK", action.actionId);
      if (presentationEvent?.type === "BURST") markPresentationTransient("BURST", action.actionId);

      if (presentationEvent && (presentationEvent.type !== "ATTACK" || isAttackPresentation)) {
        applyPresentationEvent(combat, presentationEvent, eventNow);
      }

      if (isAttackPresentation) {
        state.scene.getActor("scene:" + sourceRole)?.setState(
          characterAttackStyle?.attackState || "ATTACK",
          eventNow
        );
        scheduleMotion(
          sourceRole,
          characterAttackStyle?.motion || {
            dx: sourceRole === "PLAYER" ? 112 : -86,
            dy: -9,
            dz: sourceRole === "PLAYER" ? 0.04 : -0.04,
            duration: 520
          },
          eventNow
        );
        if (characterAttackStyle) {
          state.attackStyle = Object.freeze({
            styleId: characterAttackStyle.styleId,
            characterId: characterAttackStyle.characterId,
            abilityId: characterAttackStyle.abilityId,
            actionId: String(action.actionId || ""),
            attackState: characterAttackStyle.attackState,
            hitCount: Array.isArray(action.hits) ? action.hits.length : 1,
            contactCount: Array.isArray(action.hits) ? action.hits.length : 1,
            cameraShot: characterAttackStyle.cameraShot
          });
        } else if (actionType === "AUTO_ATTACK" || actionType === "ENEMY_BEHAVIOR") {
          state.attackStyle = null;
        }
        const attack2_5d = active2_5DConfig(combat);
        if (attack2_5d) {
          state.twoPointFiveDAttackTracks.set(sourceRole, {
            start: eventNow,
            duration: Math.max(1, Number(characterAttackStyle?.motion?.duration || 520)),
            x: attack2_5d.deformation.x,
            y: attack2_5d.deformation.y
          });
          state.twoPointFiveDLightingModes.set(sourceRole, "ATTACK");
        }
      }
      if (isImpactPresentation) {
        state.twoPointFiveDLightingModes.set(targetRole, "IMPACT");
        const contactAt = eventNow + 110;
        state.scene.getActor("scene:" + targetRole)?.setState("HIT", contactAt);
        scheduleMotion(
          targetRole,
          { dx: targetRole === "ENEMY_PRIMARY" ? 52 : -52, dy: -8, dz: 0.07, rotation: targetRole === "ENEMY_PRIMARY" ? 0.07 : -0.07, duration: 320 },
          contactAt
        );
        state.visualFreezeStartsAt = Math.min(
          state.visualFreezeStartsAt || contactAt,
          contactAt
        );
        state.visualFreezeUntil = Math.max(state.visualFreezeUntil, contactAt + 110);
        state.visualFreezeNow = contactAt;
      }
      if (presentationEvent?.type === "BREAK") {
        state.twoPointFiveDAttackTracks.delete("ENEMY_PRIMARY");
        state.twoPointFiveDLightingModes.set("ENEMY_PRIMARY", "BREAK");
        scheduleMotion(
          "ENEMY_PRIMARY",
          { dx: 64, dy: -14, dz: 0.09, rotation: 0.095, duration: 500 },
          eventNow
        );
        state.visualFreezeStartsAt = eventNow;
        state.visualFreezeUntil = Math.max(state.visualFreezeUntil, eventNow + 120);
        state.visualFreezeNow = eventNow;
      }
      if (presentationEvent?.type === "BURST") {
        scheduleMotion(
          "PLAYER",
          { dx: 150, dy: -28, dz: -0.14, rotation: 0.075, scale: 0.06, duration: 620 },
          eventNow
        );
      }

      if (action.outcome === "VICTORY") {
        state.shotDirector ? setShot("VICTORY") : setCameraPreset("VICTORY");
      } else if (action.outcome === "DEFEAT") {
        state.shotDirector ? setShot("DEFEAT") : setCameraPreset("DEFEAT");
      } else if (actionType === "BURST") {
        state.shotDirector ? setShot("BURST") : setCameraPreset("BURST");
      } else if (action.broke) {
        state.shotDirector ? setShot("BREAK") : setCameraPreset("BREAK");
      } else if (Number(action.damage || 0) > 0 || Number(action.blockAbsorbed || 0) > 0) {
        state.shotDirector ? setShot("IMPACT") : setCameraPreset("IMPACT");
      } else if (actionType === "ENEMY_BEHAVIOR") {
        state.shotDirector ? setShot("ENEMY_FOCUS") : setCameraPreset("APPROACH");
      } else if (characterNonAttackStyle) {
        state.shotDirector ? setShot(characterNonAttackStyle.cameraShot) : setCameraPreset("APPROACH");
      } else if (isAttackPresentation) {
        state.shotDirector ? setShot(characterAttackStyle?.cameraShot || "ATTACK_APPROACH") : setCameraPreset("ATTACK");
      } else if (["SKILL", "CARD", "ABILITY"].includes(actionType)) {
        state.shotDirector ? setShot("PLAYER_FOCUS") : setCameraPreset("APPROACH");
      }

      if (actionType === "AUTO_ATTACK" || actionType === "ENEMY_BEHAVIOR" && action.intent?.type === "ATTACK") {
        addEffect("attack", {
          attacker,
          targetTeam,
          intensity: actionType === "AUTO_ATTACK" ? .35 : .55,
          kind: "auto"
        }, 420);
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
            }, 420);
            addEffect("impact", {
              targetTeam: "enemy", targetId: action.targetId,
              damage: Number(hit.damage || 0),
              blockAbsorbed: Number(hit.blockAbsorbed || 0),
              breakDamage: Number(hit.breakDamage || 0),
              critical: Boolean(hit.critical),
              delayMs: index * 90 + 110
            }, 600);
          });
          emitAudio("skill", action);
        } else if (action.damage > 0) {
          addEffect("attack", {
            attacker: "player", targetTeam: "enemy",
            intensity: .8, kind: "skill"
          }, 500);
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
          damageReductionApplied: Number(action.damageReductionApplied || 0),
          delayMs: 110
        }, 720);
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

      if (characterNonAttackStyle) {
        state.attackStyle = null;
        state.presentationStyle = Object.freeze({
          styleId: characterNonAttackStyle.styleId,
          characterId: characterNonAttackStyle.characterId,
          abilityId: characterNonAttackStyle.abilityId,
          actionId: String(action.actionId || ""),
          presentationType: characterNonAttackStyle.presentationType,
          cameraShot: characterNonAttackStyle.cameraShot
        });
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

    function sceneAssetSlots(role) {
      const map = {
        COMPANION_LEFT: { character: "scene.companion_left_character", motorcycle: "scene.companion_left_motorcycle" },
        COMPANION_RIGHT: { character: "scene.companion_right_character", motorcycle: "scene.companion_right_motorcycle" },
        ENEMY_SECONDARY: { character: "scene.enemy_secondary_character", motorcycle: "scene.enemy_secondary_motorcycle" },
        ENEMY_FAR: { character: "scene.enemy_far_character", motorcycle: "scene.enemy_far_motorcycle" }
      };
      return map[role] || null;
    }

    function drawStagedEntity(role, width, height, now) {
      const frame = state.shotDirector?.getEntityFrame?.(role, width, height);
      if (!frame?.enabled) return;
      const slots = sceneAssetSlots(role);
      const image = slots ? imageFor(slots.character) : null;
      const team = role.startsWith("ENEMY") ? "enemy" : "player";
      const actor = state.scene?.getActor?.("scene:" + role);
      const actorTransform = actor?.transform;
      const x = actorTransform?.visible
        ? actorTransform.x
        : frame.coordinateSpace === "WORLD_STAGE_PX" ? frame.x : 0;
      const y = actorTransform?.visible
        ? actorTransform.y
        : frame.coordinateSpace === "WORLD_STAGE_PX" ? frame.y : 0;
      const scale = clamp((actorTransform?.scale || frame.scale) * (.68 + .42 * frame.depth), .42, 1.45);
      context.save();
      context.translate(x, y);
      if (image) {
        const imageWidth = 150 * scale;
        const imageHeight = 190 * scale;
        context.globalAlpha = .9;
        context.drawImage(image, -imageWidth / 2, -imageHeight + 60, imageWidth, imageHeight);
      } else {
        drawPlaceholderFighter(team, { hp: 1, maxHp: 1 }, 0, 0, scale, "idle", now);
        drawText("STAGING PLACEHOLDER · NOT FINAL ART", 0, 118, 8, "850", "center", "rgba(255,255,255,.66)");
      }
      if (slots) {
        const motorcycle = imageFor(slots.motorcycle);
        if (motorcycle) {
          const bikeWidth = 190 * scale;
          const bikeHeight = 100 * scale;
          context.drawImage(motorcycle, -bikeWidth / 2, 12, bikeWidth, bikeHeight);
        } else {
          drawPlaceholderMotorcycle(team, 0, 38, scale, "idle", now);
        }
      }
      context.restore();
    }

    function drawSceneEntities(width, height, now) {
      if (!state.shotDirector) {
        drawFighter("enemy", currentCombatForRender, width, height, now);
        drawFighter("player", currentCombatForRender, width, height, now);
        return;
      }

      syncFoundationScene(currentCombatForRender, width, height, now);
      const actorRenderables = (state.scene?.renderables?.() || [])
        .filter((item) => item.type === "ACTOR" && item.layer === "ACTORS");

      if (!actorRenderables.length) {
        drawFighter("enemy", currentCombatForRender, width, height, now);
        drawFighter("player", currentCombatForRender, width, height, now);
        return;
      }

      for (const item of actorRenderables) {
        const role = item.actor.role;
        if (role === "PLAYER") drawFighter("player", currentCombatForRender, width, height, now);
        else if (role === "ENEMY_PRIMARY") drawFighter("enemy", currentCombatForRender, width, height, now);
        else drawStagedEntity(role, width, height, now);
      }
    }

    let currentCombatForRender = null;

    function render(combat, now = performance.now()) {
      if (!canvas || !context) return;
      currentCombatForRender = combat;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 1;
      const height = rect.height || 1;
      state.viewport = { width, height };
      if (state.scene?.camera?.setViewportCenter) state.scene.camera.setViewportCenter(width, height);
      consumeCombatEvents(combat);
      updateCamera(now, combat, width, height);
      const visualNow =
        now >= state.visualFreezeStartsAt && now < state.visualFreezeUntil
          ? state.visualFreezeNow
          : now;

      state.sceneRenderer?.renderFrame?.(
        state.scene,
        { width, height },
        () => {
          context.globalAlpha = 1;
          context.lineWidth = 1;

          context.save();
          context.setTransform?.(1, 0, 0, 1, 0, 0);
          drawBackground(width, height, combat, visualNow);
          drawParallax(width, height, visualNow);
          context.restore();

          if (combat) {
            drawSceneEntities(width, height, visualNow);
            drawIntent(combat, width, height, visualNow);
            renderSceneVfx(combat, width, height, visualNow);
            renderEffects(combat, width, height, visualNow);
            drawBurstReady(combat, width, height, visualNow);
          }

          context.save();
          context.setTransform?.(1, 0, 0, 1, 0, 0);
          drawForeground(width, height, visualNow, combat);
          drawLighting(width, height, combat);
          context.restore();
        },
        now
      );
    }

    function setAudioHooks(hooks = {}) {
      state.audioHooks = { ...hooks };
    }

    return Object.freeze({
      onCombatStart,
      onAction,
      onCombatEvent,
      consumeCombatEvents,
      render,
      setAsset,
      setAudioHooks,
      setCameraPreset,
      setShot,
      setComposition,
      setSceneEntity: (role, spec) => Boolean(state.shotDirector?.setEntity?.(role, spec)),
      stageMotion: (role, spec, now = performance.now()) => {
        if (!role) return false;
        scheduleMotion(role, spec, now);
        return true;
      },
      getSceneSnapshot: (width, height) => state.scene?.snapshot?.() || state.shotDirector?.getSceneSnapshot?.(width, height) || [],
      getSceneFoundation: () => state.scene?.snapshot?.() || null,
      getShotState: (now) => state.shotDirector?.getShotState?.(now) || null,
      getAttackStyleState: () => state.attackStyle ? { ...state.attackStyle } : null,
      getPresentationStyleState: () => state.presentationStyle ? { ...state.presentationStyle } : null,
      getLastPresentationEvent: () => state.lastPresentationEvent ? { ...state.lastPresentationEvent } : null,
      slotForCatalogRecord,
      getCameraState: () => state.scene?.camera?.getState?.() || null,
      getAsset: assetFor
    });
  }

  window.CombatPresentation = Object.freeze({
    ASSET_SLOTS,
    CAMERA_PRESETS,
    VISUAL_STATES,
    LAYER_ORDER,
    ATTACK_STYLE_CONTRACTS,
    NON_ATTACK_STYLE_CONTRACTS,
    create
  });
})();
