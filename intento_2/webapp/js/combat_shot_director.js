(() => {
  "use strict";

  const SHOT_NAMES = Object.freeze([
    "ESTABLISHING",
    "PLAYER_FOCUS",
    "COMPANION_LEFT_FOCUS",
    "COMPANION_RIGHT_FOCUS",
    "ENEMY_FOCUS",
    "ATTACK_APPROACH",
    "IMPACT",
    "BREAK",
    "BURST",
    "VICTORY",
    "DEFEAT"
  ]);

  const SCENE_ROLES = Object.freeze([
    "PLAYER",
    "PLAYER_FOCUS",
    "COMPANION_LEFT",
    "COMPANION_RIGHT",
    "ENEMY_PRIMARY",
    "ENEMY_SECONDARY",
    "ENEMY_FAR",
    "FOREGROUND_LEFT",
    "FOREGROUND_RIGHT"
  ]);

  const LAYER_NAMES = Object.freeze([
    "BACKGROUND",
    "FAR",
    "MID",
    "ENEMY",
    "PLAYER",
    "FOREGROUND",
    "HUD"
  ]);

  const SCENE_ANCHORS = Object.freeze({
    // Lower depth values are farther from the camera; higher values render closer.
    PLAYER: Object.freeze({ x: .31, y: .56, depth: .72 }),
    PLAYER_FOCUS: Object.freeze({ x: .36, y: .50, depth: .72 }),
    COMPANION_LEFT: Object.freeze({ x: .14, y: .55, depth: .54 }),
    COMPANION_RIGHT: Object.freeze({ x: .86, y: .55, depth: .54 }),
    ENEMY_PRIMARY: Object.freeze({ x: .69, y: .56, depth: .46 }),
    ENEMY_SECONDARY: Object.freeze({ x: .82, y: .53, depth: .38 }),
    ENEMY_FAR: Object.freeze({ x: .91, y: .48, depth: .24 }),
    FOREGROUND_LEFT: Object.freeze({ x: .02, y: .77, depth: .96 }),
    FOREGROUND_RIGHT: Object.freeze({ x: .98, y: .77, depth: .96 })
  });

  const DEFAULT_ENTITIES = Object.freeze({
    PLAYER: Object.freeze({ enabled: true, anchor: "PLAYER", scale: 1, baselineScale: 1, focusScale: 1.08, focusOffsetX: 0, focusOffsetY: 0, parallax: 1, assetSlot: null }),
    COMPANION_LEFT: Object.freeze({ enabled: false, anchor: "COMPANION_LEFT", scale: .82, baselineScale: .82, focusScale: .96, focusOffsetX: 0, focusOffsetY: 0, parallax: .62, assetSlot: "scene.companion_left" }),
    COMPANION_RIGHT: Object.freeze({ enabled: false, anchor: "COMPANION_RIGHT", scale: .82, baselineScale: .82, focusScale: .96, focusOffsetX: 0, focusOffsetY: 0, parallax: .62, assetSlot: "scene.companion_right" }),
    ENEMY_PRIMARY: Object.freeze({ enabled: true, anchor: "ENEMY_PRIMARY", scale: 1, baselineScale: 1, focusScale: 1.08, focusOffsetX: 0, focusOffsetY: 0, parallax: .95, assetSlot: null }),
    ENEMY_SECONDARY: Object.freeze({ enabled: false, anchor: "ENEMY_SECONDARY", scale: .76, baselineScale: .76, focusScale: .9, focusOffsetX: 0, focusOffsetY: 0, parallax: .66, assetSlot: "scene.enemy_secondary" }),
    ENEMY_FAR: Object.freeze({ enabled: false, anchor: "ENEMY_FAR", scale: .58, baselineScale: .58, focusScale: .7, focusOffsetX: 0, focusOffsetY: 0, parallax: .42, assetSlot: "scene.enemy_far" }),
    FOREGROUND_LEFT: Object.freeze({ enabled: true, anchor: "FOREGROUND_LEFT", scale: 1, baselineScale: 1, focusScale: 1, focusOffsetX: 0, focusOffsetY: 0, parallax: 1.12, assetSlot: null }),
    FOREGROUND_RIGHT: Object.freeze({ enabled: true, anchor: "FOREGROUND_RIGHT", scale: 1, baselineScale: 1, focusScale: 1, focusOffsetX: 0, focusOffsetY: 0, parallax: 1.12, assetSlot: null })
  });

  const SHOT_PROFILES = Object.freeze({
    ESTABLISHING: Object.freeze({
      target: "STAGE", duration: 900, zoom: .985, offsetX: 0, offsetY: 0,
      easing: "easeInOutCubic", shake: 0, parallaxMultiplier: .82,
      foregroundIntensity: .7, lightingIntensity: .72
    }),
    PLAYER_FOCUS: Object.freeze({
      target: "PLAYER_FOCUS", duration: 1000, zoom: 1.075, offsetX: 0, offsetY: -4,
      easing: "easeOutCubic", shake: 0, parallaxMultiplier: .95,
      foregroundIntensity: .82, lightingIntensity: .9
    }),
    COMPANION_LEFT_FOCUS: Object.freeze({
      target: "COMPANION_LEFT", duration: 760, zoom: 1.06, offsetX: 0, offsetY: -3,
      easing: "easeOutCubic", shake: 0, parallaxMultiplier: .9,
      foregroundIntensity: .78, lightingIntensity: .86
    }),
    COMPANION_RIGHT_FOCUS: Object.freeze({
      target: "COMPANION_RIGHT", duration: 760, zoom: 1.06, offsetX: 0, offsetY: -3,
      easing: "easeOutCubic", shake: 0, parallaxMultiplier: .9,
      foregroundIntensity: .78, lightingIntensity: .86
    }),
    ENEMY_FOCUS: Object.freeze({
      target: "ENEMY_PRIMARY", duration: 1000, zoom: 1.09, offsetX: 0, offsetY: -7,
      easing: "easeOutCubic", shake: 0, parallaxMultiplier: 1,
      foregroundIntensity: .88, lightingIntensity: 1
    }),
    ATTACK_APPROACH: Object.freeze({
      target: "ENEMY_PRIMARY", duration: 520, zoom: 1.055, offsetX: 18, offsetY: -6,
      easing: "easeInOutCubic", shake: 2, parallaxMultiplier: 1.12,
      foregroundIntensity: .98, lightingIntensity: 1.04
    }),
    IMPACT: Object.freeze({
      target: "ENEMY_PRIMARY", duration: 650, zoom: 1.085, offsetX: 0, offsetY: -8,
      easing: "easeOutCubic", shake: 7, parallaxMultiplier: 1.2,
      foregroundIntensity: 1.06, lightingIntensity: 1.12
    }),
    BREAK: Object.freeze({
      target: "ENEMY_PRIMARY", duration: 900, zoom: 1.11, offsetX: 0, offsetY: -10,
      easing: "easeOutCubic", shake: 4, parallaxMultiplier: 1.15,
      foregroundIntensity: 1, lightingIntensity: 1.18
    }),
    BURST: Object.freeze({
      target: "PLAYER_FOCUS", duration: 900, zoom: 1.15, offsetX: 0, offsetY: -12,
      easing: "easeOutCubic", shake: 10, parallaxMultiplier: 1.28,
      foregroundIntensity: 1.18, lightingIntensity: 1.28
    }),
    VICTORY: Object.freeze({
      target: "PLAYER_FOCUS", duration: 1200, zoom: 1.035, offsetX: 0, offsetY: -4,
      easing: "easeInOutCubic", shake: 0, parallaxMultiplier: .72,
      foregroundIntensity: .62, lightingIntensity: .86
    }),
    DEFEAT: Object.freeze({
      target: "PLAYER_FOCUS", duration: 1000, zoom: .96, offsetX: 0, offsetY: 8,
      easing: "easeInOutCubic", shake: 0, parallaxMultiplier: .58,
      foregroundIntensity: .52, lightingIntensity: .72
    })
  });

  const CAMERA_COMPATIBILITY = Object.freeze({
    ESTABLISHING: "IDLE",
    PLAYER_FOCUS: "APPROACH",
    COMPANION_LEFT_FOCUS: "APPROACH",
    COMPANION_RIGHT_FOCUS: "APPROACH",
    ENEMY_FOCUS: "APPROACH",
    ATTACK_APPROACH: "ATTACK",
    IMPACT: "IMPACT",
    BREAK: "BREAK",
    BURST: "BURST",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function ease(name, value) {
    const t = clamp(value, 0, 1);
    if (name === "linear") return t;
    if (name === "easeOutCubic") return 1 - Math.pow(1 - t, 3);
    return t * t * (3 - 2 * t);
  }

  function create(options = {}) {
    const clock = typeof options.clock === "function"
      ? options.clock
      : () => (typeof performance !== "undefined" ? performance.now() : 0);

    const state = {
      anchors: copy(SCENE_ANCHORS),
      entities: copy(DEFAULT_ENTITIES),
      activeShot: "ESTABLISHING",
      previousShot: "ESTABLISHING",
      startedAt: finite(options.now, clock()),
      stageSeed: String(options.stageSeed || "mach-girls-stage-v1")
    };

    function normalizeShot(name) {
      const key = String(name || "").toUpperCase();
      return SHOT_NAMES.includes(key) ? key : "ESTABLISHING";
    }

    function normalizeRole(name) {
      const key = String(name || "").toUpperCase();
      return SCENE_ROLES.includes(key) ? key : null;
    }

    function resolveTarget(target) {
      const key = String(target || "STAGE").toUpperCase();
      if (key === "STAGE") return { x: .5, y: .5, depth: .5, coordinateSpace: "NORMALIZED_STAGE" };
      return state.anchors[key]
        ? { ...state.anchors[key], coordinateSpace: "NORMALIZED_STAGE" }
        : { x: .5, y: .5, depth: .5, coordinateSpace: "NORMALIZED_STAGE" };
    }

    function cameraFor(profile, width, height) {
      const anchor = resolveTarget(profile.target);
      const focusPanX = profile.target === "STAGE" ? 0 : (.5 - anchor.x) * width * .28;
      const focusPanY = profile.target === "STAGE" ? 0 : (.5 - anchor.y) * height * .2;
      return {
        zoom: finite(profile.zoom, 1),
        offsetX: finite(profile.offsetX) + focusPanX,
        offsetY: finite(profile.offsetY) + focusPanY,
        shake: finite(profile.shake),
        parallaxMultiplier: finite(profile.parallaxMultiplier, 1),
        foregroundIntensity: finite(profile.foregroundIntensity, 1),
        lightingIntensity: finite(profile.lightingIntensity, 1)
      };
    }

    function getCameraFrame(width = 1000, height = 600, now = clock()) {
      const previous = SHOT_PROFILES[state.previousShot] || SHOT_PROFILES.ESTABLISHING;
      const active = SHOT_PROFILES[state.activeShot] || SHOT_PROFILES.ESTABLISHING;
      const duration = Math.max(1, finite(active.duration, 1));
      const rawProgress = clamp((finite(now) - state.startedAt) / duration, 0, 1);
      const t = ease(active.easing, rawProgress);
      const from = cameraFor(previous, width, height);
      const to = cameraFor(active, width, height);
      const current = {};
      for (const key of ["zoom", "offsetX", "offsetY", "shake", "parallaxMultiplier", "foregroundIntensity", "lightingIntensity"]) {
        current[key] = from[key] + (to[key] - from[key]) * t;
      }
      return {
        active: state.activeShot,
        previous: state.previousShot,
        progress: rawProgress,
        easingProgress: t,
        current,
        target: to,
        cameraPreset: CAMERA_COMPATIBILITY[state.activeShot]
      };
    }

    function setShot(name, instant = false, now = clock()) {
      const next = normalizeShot(name);
      state.previousShot = state.activeShot;
      state.activeShot = next;
      state.startedAt = finite(now, 0);
      if (instant) state.previousShot = next;
      return getShotState(now);
    }

    function getEntity(name) {
      const role = normalizeRole(name);
      if (!role) return null;
      const entity = state.entities[role];
      return entity ? { ...entity } : null;
    }

    function setEntity(name, spec = {}) {
      const role = normalizeRole(name);
      if (!role) return false;
      const current = state.entities[role] || {};
      state.entities[role] = {
        ...current,
        ...spec,
        enabled: spec.enabled === undefined ? Boolean(current.enabled) : Boolean(spec.enabled),
        anchor: SCENE_ROLES.includes(String(spec.anchor || current.anchor).toUpperCase())
          ? String(spec.anchor || current.anchor).toUpperCase()
          : current.anchor,
        scale: clamp(spec.scale ?? current.scale ?? 1, .2, 3),
        baselineScale: clamp(spec.baselineScale ?? current.baselineScale ?? spec.scale ?? current.scale ?? 1, .1, 4),
        focusScale: clamp(spec.focusScale ?? current.focusScale ?? 1.08, .1, 4),
        focusOffsetX: clamp(spec.focusOffsetX ?? current.focusOffsetX ?? 0, -500, 500),
        focusOffsetY: clamp(spec.focusOffsetY ?? current.focusOffsetY ?? 0, -500, 500),
        parallax: clamp(spec.parallax ?? current.parallax ?? 1, .1, 2),
        depth: spec.depth === undefined ? current.depth : clamp(spec.depth, 0, 1),
        assetSlot: spec.assetSlot === undefined ? (current.assetSlot || null) : String(spec.assetSlot || "")
      };
      return true;
    }

    function focusedRoleFor(target) {
      const map = {
        PLAYER_FOCUS: "PLAYER",
        COMPANION_LEFT: "COMPANION_LEFT",
        COMPANION_RIGHT: "COMPANION_RIGHT",
        ENEMY_PRIMARY: "ENEMY_PRIMARY"
      };
      return map[String(target || "").toUpperCase()] || null;
    }

    function getEntityFrame(name, width = 1000, height = 600) {
      const role = normalizeRole(name);
      if (!role || !state.entities[role]) return null;
      const entity = state.entities[role];
      const anchor = resolveTarget(entity.anchor || role);
      const profile = SHOT_PROFILES[state.activeShot] || SHOT_PROFILES.ESTABLISHING;
      const focusedRole = focusedRoleFor(profile.target);
      const focused = focusedRole === role;
      const baseScale = clamp(entity.baselineScale ?? entity.scale ?? 1, .1, 4);
      return {
        role,
        coordinateSpace: "WORLD_STAGE_PX",
        enabled: Boolean(entity.enabled),
        x: anchor.x * width + (focused ? finite(entity.focusOffsetX) : 0),
        y: anchor.y * height + (focused ? finite(entity.focusOffsetY) : 0),
        depth: clamp(entity.depth === undefined ? anchor.depth : entity.depth, 0, 1),
        scale: clamp(focused ? (entity.focusScale ?? baseScale) : baseScale, .2, 4),
        baselineScale: baseScale,
        focusScale: clamp(entity.focusScale ?? baseScale, .2, 4),
        focused,
        parallax: clamp(entity.parallax ?? 1, .1, 2),
        assetSlot: entity.assetSlot || null
      };
    }

    function getSceneSnapshot(width = 1000, height = 600) {
      return SCENE_ROLES
        .filter((role) => state.entities[role])
        .map((role) => getEntityFrame(role, width, height))
        .filter(Boolean)
        .sort((a, b) => a.depth - b.depth);
    }

    function getShotState(now = clock()) {
      const profile = SHOT_PROFILES[state.activeShot] || SHOT_PROFILES.ESTABLISHING;
      return {
        name: state.activeShot,
        profile: { ...profile },
        startedAt: state.startedAt,
        elapsedMs: Math.max(0, finite(now) - state.startedAt),
        cameraPreset: CAMERA_COMPATIBILITY[state.activeShot]
      };
    }

    function resolveTargetEntity(target) {
      const role = String(target || "").toUpperCase();
      if (role === "STAGE") return { role: "STAGE", ...resolveTarget("STAGE") };
      if (!SCENE_ROLES.includes(role)) return null;
      return { role, ...resolveTarget(role) };
    }

    return Object.freeze({
      setShot,
      getShotState,
      getCameraFrame,
      setEntity,
      getEntity,
      getEntityFrame,
      getSceneSnapshot,
      resolveTarget: resolveTargetEntity
    });
  }

  window.MachGirlsShotDirector = Object.freeze({
    SHOT_NAMES,
    SCENE_ROLES,
    LAYER_NAMES,
    SCENE_ANCHORS,
    DEFAULT_ENTITIES,
    SHOT_PROFILES,
    CAMERA_COMPATIBILITY,
    create
  });
})();