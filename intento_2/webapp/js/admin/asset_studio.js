(() => {
  "use strict";

  const STORAGE_KEY = "mach_girls_asset_catalog_v1";
  const SCHEMA_VERSION = 1;
  const MAX_INLINE_BYTES = 1500000;

  const ASSET_TYPES = Object.freeze([
    "CHARACTER",
    "PORTRAIT",
    "MOTORCYCLE",
    "CARD_ART",
    "BACKGROUND",
    "VFX_REFERENCE",
    "STATUS_ICON"
  ]);

  const CHARACTER_STATES = Object.freeze([
    "IDLE",
    "ATTACK",
    "HURT",
    "BREAK",
    "BURST",
    "VICTORY",
    "DEFEAT",
    "SKILL"
  ]);

  const ANGLES = Object.freeze(["FRONT", "THREE_QUARTER", "SIDE", "BACK"]);
  const FACINGS = Object.freeze(["LEFT", "RIGHT", "FRONT"]);
  const ANCHORS = Object.freeze(["FEET_CENTER", "CENTER", "HEAD", "CUSTOM"]);
  const STATUSES = Object.freeze(["DRAFT", "TECHNICAL_PLACEHOLDER", "APPROVED"]);
  const LAYERS = Object.freeze(["BACKGROUND", "ENVIRONMENT", "CHARACTER", "VEHICLE", "FX", "UI"]);
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
    "",
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

  function normalizeAllowedShots(value) {
    const raw = Array.isArray(value) ? value : String(value || "").split(",");
    const valid = raw.map((item) => String(item).trim().toUpperCase()).filter((item) => SHOT_NAMES.includes(item));
    return [...new Set(valid.length ? valid : SHOT_NAMES)];
  }

  const CAMERA_PRESETS = Object.freeze({
    DEFAULT: Object.freeze({ zoom: 1, offsetX: 0, offsetY: 0, durationMs: 0, shake: 0 }),
    ESTABLISHING: Object.freeze({ zoom: .985, offsetX: 0, offsetY: 0, durationMs: 900, shake: 0 }),
    PLAYER_FOCUS: Object.freeze({ zoom: 1.075, offsetX: 0, offsetY: -4, durationMs: 760, shake: 0 }),
    COMPANION_LEFT_FOCUS: Object.freeze({ zoom: 1.06, offsetX: 0, offsetY: -3, durationMs: 760, shake: 0 }),
    COMPANION_RIGHT_FOCUS: Object.freeze({ zoom: 1.06, offsetX: 0, offsetY: -3, durationMs: 760, shake: 0 }),
    ENEMY_FOCUS: Object.freeze({ zoom: 1.09, offsetX: 0, offsetY: -7, durationMs: 700, shake: 0 }),
    ATTACK_APPROACH: Object.freeze({ zoom: 1.055, offsetX: 18, offsetY: -6, durationMs: 300, shake: 2 }),
    IMPACT: Object.freeze({ zoom: 1.085, offsetX: 0, offsetY: -8, durationMs: 360, shake: 7 }),
    "ATTACK IMPACT": Object.freeze({ zoom: 1.08, offsetX: 18, offsetY: 0, durationMs: 420, shake: 3 }),
    BREAK: Object.freeze({ zoom: 1.14, offsetX: 0, offsetY: -8, durationMs: 700, shake: 5 }),
    BURST: Object.freeze({ zoom: 1.2, offsetX: 0, offsetY: -12, durationMs: 760, shake: 8 }),
    VICTORY: Object.freeze({ zoom: 1.03, offsetX: 0, offsetY: -4, durationMs: 850, shake: 0 }),
    DEFEAT: Object.freeze({ zoom: 1.02, offsetX: 0, offsetY: 4, durationMs: 700, shake: 1 })
  });

  const VFX = Object.freeze([
    "FLASH",
    "GLOW",
    "MOTION_TRAIL",
    "IMPACT",
    "SCREEN_SHAKE",
    "DAMAGE_NUMBER",
    "BREAK FX",
    "BURST FX",
    "TELEGRAPH PULSE"
  ]);

  const FORMAL_CHARACTER_IDS = new Set(["yuri"]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function defaultAnchorFor(type) {
    return type === "CHARACTER" || type === "MOTORCYCLE"
      ? { name: "FEET_CENTER", x: 0.5, y: 1 }
      : { name: "CENTER", x: 0.5, y: 0.5 };
  }

  function sanitizeId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function createEmptyRegistry() {
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: null,
      assets: []
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slotKey(metadata) {
    return [
      metadata.type,
      metadata.entityId,
      metadata.state,
      metadata.angle,
      metadata.facing
    ].join("|");
  }

  function normalizeMetadata(input = {}) {
    const type = ASSET_TYPES.includes(String(input.type || "").toUpperCase())
      ? String(input.type).toUpperCase()
      : "CHARACTER";
    const anchorDefault = defaultAnchorFor(type);
    const anchorName = ANCHORS.includes(String(input.anchor || "").toUpperCase())
      ? String(input.anchor).toUpperCase()
      : anchorDefault.name;

    return {
      assetId: sanitizeId(input.assetId) || "",
      type,
      entityId: String(input.entityId || "").trim(),
      state: String(input.state || "IDLE").toUpperCase(),
      angle: ANGLES.includes(String(input.angle || "").toUpperCase())
        ? String(input.angle).toUpperCase()
        : "THREE_QUARTER",
      facing: FACINGS.includes(String(input.facing || "").toUpperCase())
        ? String(input.facing).toUpperCase()
        : "RIGHT",
      sourceType: String(input.sourceType || "UPLOAD").toUpperCase(),
      source: String(input.source || ""),
      status: STATUSES.includes(String(input.status || "").toUpperCase())
        ? String(input.status).toUpperCase()
        : "DRAFT",
      scale: clamp(input.scale ?? 1, 0.1, 4),
      anchor: anchorName,
      anchorX: clamp(input.anchorX ?? anchorDefault.x, 0, 1),
      anchorY: clamp(input.anchorY ?? anchorDefault.y, 0, 1),
      offsetX: clamp(input.offsetX ?? 0, -500, 500),
      offsetY: clamp(input.offsetY ?? 0, -500, 500),
      flipX: Boolean(input.flipX),
      layer: LAYERS.includes(String(input.layer || "").toUpperCase())
        ? String(input.layer).toUpperCase()
        : (type === "BACKGROUND" ? "BACKGROUND" : "CHARACTER"),
      sceneRole: SCENE_ROLES.includes(String(input.sceneRole || "").toUpperCase())
        ? String(input.sceneRole || "").toUpperCase()
        : "",
      depth: clamp(input.depth ?? ((type === "BACKGROUND" || type === "BACKGROUND_PLATE") ? 0.25 : 0.7), 0, 1),
      baselineScale: clamp(input.baselineScale ?? input.scale ?? 1, 0.1, 4),
      focusScale: clamp(input.focusScale ?? Math.max(0.1, Number(input.scale ?? 1) * 1.08), 0.1, 4),
      focusOffsetX: clamp(input.focusOffsetX ?? 0, -500, 500),
      focusOffsetY: clamp(input.focusOffsetY ?? 0, -500, 500),
      allowedShots: normalizeAllowedShots(input.allowedShots),
      foregroundPriority: clamp(input.foregroundPriority ?? 0, 0, 100),
      backgroundPriority: clamp(input.backgroundPriority ?? 0, 0, 100),
      width: Math.max(0, Math.floor(finite(input.width))),
      height: Math.max(0, Math.floor(finite(input.height))),
      sizeBytes: Math.max(0, Math.floor(finite(input.sizeBytes))),
      approvedByHuman: Boolean(input.approvedByHuman),
      createdAt: String(input.createdAt || new Date().toISOString()),
      updatedAt: String(input.updatedAt || new Date().toISOString())
    };
  }

  function validateMetadata(input, options = {}) {
    const meta = normalizeMetadata(input);
    const errors = [];
    const warnings = [];
    const needsCharacter = ["CHARACTER", "PORTRAIT"].includes(meta.type);

    if (!meta.entityId && needsCharacter) errors.push("CHARACTER/PORTRAIT requiere entityId.");
    if (needsCharacter && meta.entityId && !FORMAL_CHARACTER_IDS.has(meta.entityId)) {
      errors.push("entityId no corresponde a un personaje formalmente registrado; Yuri es el único ID actual permitido.");
    }

    if (!meta.assetId) errors.push("assetId es obligatorio.");
    if (needsCharacter && !CHARACTER_STATES.includes(meta.state)) {
      errors.push("State inválido para un asset de personaje.");
    }
    if (meta.state && meta.state.length > 32) errors.push("state demasiado largo.");
    if (!ANGLES.includes(meta.angle)) errors.push("angle inválido.");
    if (!FACINGS.includes(meta.facing)) errors.push("facing inválido.");
    if (meta.anchor === "CUSTOM" && (meta.anchorX < 0 || meta.anchorX > 1 || meta.anchorY < 0 || meta.anchorY > 1)) {
      errors.push("CUSTOM anchor debe permanecer dentro de 0..1.");
    }
    if (meta.status === "APPROVED" && !meta.approvedByHuman) {
      errors.push("APPROVED requiere aprobación humana explícita.");
    }
    if (meta.status === "TECHNICAL_PLACEHOLDER" && meta.sourceType !== "PLACEHOLDER") {
      warnings.push("Un asset marcado como placeholder debería provenir del placeholder técnico.");
    }
    if (meta.width === 0 || meta.height === 0) warnings.push("Dimensiones todavía no verificadas.");
    if (meta.sourceType === "UPLOAD" && meta.sizeBytes > MAX_INLINE_BYTES) {
      warnings.push("PNG supera el límite inline de localStorage; usar STATIC_PATH para persistencia durable.");
    }
    if (!options.allowUnknownEntity && meta.entityId === "maki_mach") {
      errors.push("maki_mach no está definido como characterId formal.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      normalized: meta
    };
  }

  function validatePngSignature(bytes) {
    if (!bytes || bytes.length < 8) return false;
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    return signature.every((value, index) => Number(bytes[index]) === value);
  }

  function validatePngFile(file, decoded = {}) {
    const errors = [];
    const warnings = [];
    if (!file) return { valid: false, errors: ["No se recibió ningún archivo."], warnings: [] };
    if (String(file.type || "").toLowerCase() !== "image/png") {
      errors.push("El archivo debe declararse como image/png.");
    }
    if (!String(file.name || "").toLowerCase().endsWith(".png")) {
      errors.push("El nombre del archivo debe terminar en .png.");
    }
    if (!Number.isFinite(Number(file.size)) || Number(file.size) <= 0) {
      errors.push("El PNG está vacío o no informa un tamaño válido.");
    }
    if (Number(file.size) > 8 * 1024 * 1024) {
      errors.push("El archivo supera el límite de seguridad de 8 MB.");
    }
    const width = Number(decoded.width || 0);
    const height = Number(decoded.height || 0);
    if (width > 0 && height > 0) {
      if (width < 64 || height < 64) warnings.push("Resolución inferior a 64 px por eje.");
      if (width > 4096 || height > 4096) warnings.push("Resolución superior a la recomendación de 4096 px.");
    }
    if (decoded.transparencyKnown === true && decoded.hasTransparentPixels !== true) {
      warnings.push("No se detectó transparencia: el fondo puede no ser apto como character shipping art.");
    }
    return { valid: errors.length === 0, errors, warnings, width, height };
  }

  function upsertAsset(registry, record) {
    const next = clone(registry || createEmptyRegistry());
    const normalized = normalizeMetadata(record);
    const report = validateMetadata(normalized);
    if (!report.valid) return { success: false, errors: report.errors, warnings: report.warnings };
    const index = next.assets.findIndex((item) => item.assetId === normalized.assetId);
    if (index >= 0) next.assets[index] = normalized;
    else next.assets.push(normalized);
    next.updatedAt = new Date().toISOString();
    return { success: true, registry: next, record: normalized, warnings: report.warnings };
  }

  function serializeRegistry(registry) {
    return JSON.stringify(registry || createEmptyRegistry(), null, 2);
  }

  function buildPrompt(meta) {
    const character = meta.entityId || "[entityId]";
    const state = meta.state || "ATTACK";
    const angle = meta.angle || "THREE_QUARTER";
    const facing = meta.facing || "RIGHT";
    const framing = meta.type === "PORTRAIT" ? "BUST / PORTRAIT" : "FULL BODY";
    const pose = state === "IDLE"
      ? "neutral idle pose"
      : state === "ATTACK"
        ? "dynamic attack pose"
        : state === "HURT"
          ? "clear hurt/recoil pose"
          : state === "BREAK"
            ? "staggered vulnerable pose"
            : state === "BURST"
              ? "high-energy signature pose"
              : state === "VICTORY"
                ? "victory pose"
                : state === "DEFEAT"
                  ? "defeat pose"
                  : "combat skill pose";

    return [
      "CHARACTER: " + character,
      "STATE: " + state,
      "ANGLE: " + angle,
      "FACING: " + facing,
      "FRAMING: " + framing,
      "BACKGROUND: TRANSPARENT",
      "POSE: " + pose,
      "STYLE: MATCH APPROVED CHARACTER ART",
      "TECHNICAL: clear silhouette, visible feet when full body, transparent PNG, padding around body",
      "DO NOT: invent a new character identity, merge with another character, or treat a placeholder as final art"
    ].join("\n");
  }

  function loadRegistry(storage = null) {
    const source = storage || (typeof window !== "undefined" ? window.localStorage : null);
    if (!source) return createEmptyRegistry();
    try {
      const raw = source.getItem(STORAGE_KEY);
      if (!raw) return createEmptyRegistry();
      const parsed = JSON.parse(raw);
      if (Number(parsed.schemaVersion) !== SCHEMA_VERSION || !Array.isArray(parsed.assets)) {
        return createEmptyRegistry();
      }
      return {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: parsed.updatedAt || null,
        assets: parsed.assets.map(normalizeMetadata)
      };
    } catch (error) {
      return createEmptyRegistry();
    }
  }

  function saveRegistry(registry, storage = null) {
    const source = storage || (typeof window !== "undefined" ? window.localStorage : null);
    if (!source) return { success: false, error: "localStorage no disponible." };
    try {
      source.setItem(STORAGE_KEY, serializeRegistry(registry));
      return { success: true, storageKey: STORAGE_KEY };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  const API = Object.freeze({
    STORAGE_KEY,
    SCHEMA_VERSION,
    MAX_INLINE_BYTES,
    ASSET_TYPES,
    CHARACTER_STATES,
    ANGLES,
    FACINGS,
    ANCHORS,
    STATUSES,
    LAYERS,
    SHOT_NAMES,
    SCENE_ROLES,
    CAMERA_PRESETS,
    VFX,
    FORMAL_CHARACTER_IDS,
    defaultAnchorFor,
    sanitizeId,
    createEmptyRegistry,
    normalizeMetadata,
    validateMetadata,
    validatePngSignature,
    validatePngFile,
    upsertAsset,
    serializeRegistry,
    buildPrompt,
    loadRegistry,
    saveRegistry
  });

  if (typeof window === "undefined") return;

  const dom = {
    file: document.getElementById("asset-file"),
    staticPath: document.getElementById("asset-static-path"),
    staticLoad: document.getElementById("asset-static-load"),
    loadPlaceholder: document.getElementById("asset-placeholder"),
    type: document.getElementById("asset-type"),
    entityId: document.getElementById("asset-entity"),
    state: document.getElementById("asset-state"),
    angle: document.getElementById("asset-angle"),
    facing: document.getElementById("asset-facing"),
    flipX: document.getElementById("asset-flip"),
    scale: document.getElementById("asset-scale"),
    anchor: document.getElementById("asset-anchor"),
    anchorX: document.getElementById("asset-anchor-x"),
    anchorY: document.getElementById("asset-anchor-y"),
    offsetX: document.getElementById("asset-offset-x"),
    offsetY: document.getElementById("asset-offset-y"),
    layer: document.getElementById("asset-layer"),
    sceneRole: document.getElementById("asset-scene-role"),
    depth: document.getElementById("asset-depth"),
    baselineScale: document.getElementById("asset-baseline-scale"),
    focusScale: document.getElementById("asset-focus-scale"),
    focusOffsetX: document.getElementById("asset-focus-offset-x"),
    focusOffsetY: document.getElementById("asset-focus-offset-y"),
    allowedShots: document.getElementById("asset-allowed-shots"),
    foregroundPriority: document.getElementById("asset-foreground-priority"),
    backgroundPriority: document.getElementById("asset-background-priority"),
    assetId: document.getElementById("asset-id"),
    previewBackground: document.getElementById("preview-background"),
    cameraPreset: document.getElementById("camera-preset"),
    previewSide: document.getElementById("preview-side"),
    previewPlayerX: document.getElementById("preview-player-x"),
    previewEnemyX: document.getElementById("preview-enemy-x"),
    previewPlayerXOutput: document.getElementById("preview-player-x-output"),
    previewEnemyXOutput: document.getElementById("preview-enemy-x-output"),
    animate: document.getElementById("preview-animate"),
    guide: document.getElementById("asset-guide"),
    validation: document.getElementById("asset-validation"),
    status: document.getElementById("asset-status"),
    sourceLabel: document.getElementById("asset-source-label"),
    width: document.getElementById("asset-width"),
    height: document.getElementById("asset-height"),
    size: document.getElementById("asset-size"),
    canvas: document.getElementById("asset-canvas"),
    saveDraft: document.getElementById("save-draft"),
    approve: document.getElementById("approve-art"),
    prompt: document.getElementById("asset-prompt"),
    generatePrompt: document.getElementById("generate-prompt"),
    copyPrompt: document.getElementById("copy-prompt"),
    registry: document.getElementById("asset-registry"),
    registryCount: document.getElementById("registry-count"),
    clearCurrent: document.getElementById("clear-current"),
    modeLabel: document.getElementById("mode-label"),
    toast: document.getElementById("asset-toast")
  };

  if (!dom.canvas) {
    window.MachGirlsAssetStudio = API;
    return;
  }

  const context = dom.canvas.getContext("2d");
  const state = {
    registry: loadRegistry(),
    current: normalizeMetadata({
      assetId: "yuri_attack_placeholder",
      type: "CHARACTER",
      entityId: "yuri",
      state: "ATTACK",
      angle: "THREE_QUARTER",
      facing: "RIGHT",
      sourceType: "PLACEHOLDER",
      status: "TECHNICAL_PLACEHOLDER",
      layer: "CHARACTER"
    }),
    source: {
      kind: "PLACEHOLDER",
      value: "",
      width: 720,
      height: 900,
      sizeBytes: 0,
      hasTransparentPixels: true,
      transparencyKnown: true
    },
    image: null,
    camera: { ...CAMERA_PRESETS.DEFAULT },
    activeVfx: new Set(),
    playing: true,
    previewStartedAt: performance.now(),
    toastTimer: null,
    raf: null
  };

  function toast(message, kind = "info") {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.dataset.kind = kind;
    dom.toast.hidden = false;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { dom.toast.hidden = true; }, 3000);
  }

  function selectedValue(element, fallback) {
    return String(element?.value || fallback);
  }

  function updateStateFromForm() {
    state.current = normalizeMetadata({
      ...state.current,
      assetId: dom.assetId.value,
      type: dom.type.value,
      entityId: dom.entityId.value,
      state: dom.state.value,
      angle: dom.angle.value,
      facing: dom.facing.value,
      flipX: dom.flipX.checked,
      scale: Number(dom.scale.value),
      anchor: dom.anchor.value,
      anchorX: Number(dom.anchorX.value) / 100,
      anchorY: Number(dom.anchorY.value) / 100,
      offsetX: Number(dom.offsetX.value),
      offsetY: Number(dom.offsetY.value),
      layer: dom.layer.value,
      sceneRole: dom.sceneRole?.value || "",
      depth: Number(dom.depth?.value ?? state.current.depth),
      baselineScale: Number(dom.baselineScale?.value ?? state.current.baselineScale),
      focusScale: Number(dom.focusScale?.value ?? state.current.focusScale),
      focusOffsetX: Number(dom.focusOffsetX?.value ?? state.current.focusOffsetX),
      focusOffsetY: Number(dom.focusOffsetY?.value ?? state.current.focusOffsetY),
      allowedShots: dom.allowedShots?.value || state.current.allowedShots,
      foregroundPriority: Number(dom.foregroundPriority?.value ?? state.current.foregroundPriority),
      backgroundPriority: Number(dom.backgroundPriority?.value ?? state.current.backgroundPriority),
      status: state.current.status,
      sourceType: state.source.kind,
      source: state.source.value,
      width: state.source.width,
      height: state.source.height,
      sizeBytes: state.source.sizeBytes
    });
  }

  function syncFormFromState() {
    dom.assetId.value = state.current.assetId;
    dom.type.value = state.current.type;
    dom.entityId.value = state.current.entityId;
    dom.state.value = state.current.state;
    dom.angle.value = state.current.angle;
    dom.facing.value = state.current.facing;
    dom.flipX.checked = state.current.flipX;
    dom.scale.value = String(state.current.scale);
    dom.anchor.value = state.current.anchor;
    dom.anchorX.value = String(Math.round(state.current.anchorX * 100));
    dom.anchorY.value = String(Math.round(state.current.anchorY * 100));
    dom.offsetX.value = String(state.current.offsetX);
    dom.offsetY.value = String(state.current.offsetY);
    dom.layer.value = state.current.layer;
    if (dom.sceneRole) dom.sceneRole.value = state.current.sceneRole;
    if (dom.depth) dom.depth.value = String(Math.round(state.current.depth * 100));
    if (dom.baselineScale) dom.baselineScale.value = String(state.current.baselineScale);
    if (dom.focusScale) dom.focusScale.value = String(state.current.focusScale);
    if (dom.focusOffsetX) dom.focusOffsetX.value = String(state.current.focusOffsetX);
    if (dom.focusOffsetY) dom.focusOffsetY.value = String(state.current.focusOffsetY);
    if (dom.allowedShots) dom.allowedShots.value = state.current.allowedShots.join(", ");
    if (dom.foregroundPriority) dom.foregroundPriority.value = String(state.current.foregroundPriority);
    if (dom.backgroundPriority) dom.backgroundPriority.value = String(state.current.backgroundPriority);
    dom.status.textContent = state.current.status;
    dom.sourceLabel.textContent = state.source.kind === "PLACEHOLDER"
      ? "TECHNICAL PLACEHOLDER"
      : state.source.kind === "STATIC_PATH"
        ? "STATIC PROJECT PATH"
        : "UPLOADED PNG";
    dom.width.textContent = state.source.width ? String(state.source.width) : "—";
    dom.height.textContent = state.source.height ? String(state.source.height) : "—";
    dom.size.textContent = state.source.sizeBytes ? Math.round(state.source.sizeBytes / 1024) + " KB" : "—";
    dom.modeLabel.textContent = state.current.status;
    updateGuide();
    renderRegistry();
  }

  function updateGuide() {
    const character = dom.entityId.value || "[characterId]";
    const stateName = dom.state.value;
    const angle = dom.angle.value;
    const facing = dom.facing.value;
    const portrait = dom.type.value === "PORTRAIT";
    dom.guide.textContent = [
      character.toUpperCase(),
      stateName,
      angle,
      "FACING " + facing,
      portrait ? "BUST / PORTRAIT" : "FULL BODY",
      "TRANSPARENT PNG",
      portrait ? "FACE / SHOULDERS CLEAR" : "FEET VISIBLE + PADDING",
      "SAFE AREA: KEEP SILHOUETTE INSIDE GUIDE"
    ].join(" · ");
  }

  function setStatus(message, valid = true) {
    dom.validation.textContent = message;
    dom.validation.dataset.valid = String(valid);
  }

  function validateCurrentMetadata() {
    updateStateFromForm();
    const report = validateMetadata(state.current);
    if (!report.valid) {
      setStatus(report.errors.join(" "), false);
      return report;
    }
    const warnings = [
      ...report.warnings,
      ...(state.source.kind === "UPLOAD" && state.source.sizeBytes > MAX_INLINE_BYTES
        ? ["El PNG no puede persistirse inline; cambiá Source a STATIC_PATH para registrarlo."]
        : [])
    ];
    setStatus(warnings.length ? "READY · " + warnings.join(" ") : "READY", true);
    return { ...report, warnings };
  }

  function loadImageSource(source, sourceKind, info = {}) {
    state.source = {
      kind: sourceKind,
      value: String(source || ""),
      width: Number(info.width || 0),
      height: Number(info.height || 0),
      sizeBytes: Number(info.sizeBytes || 0),
      hasTransparentPixels: Boolean(info.hasTransparentPixels),
      transparencyKnown: Boolean(info.transparencyKnown)
    };

    if (!source || sourceKind === "PLACEHOLDER") {
      state.image = null;
      syncFormFromState();
      return;
    }

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      state.image = image;
      state.source.width = image.naturalWidth || image.width;
      state.source.height = image.naturalHeight || image.height;
      state.source.transparencyKnown = Boolean(info.transparencyKnown);
      state.source.hasTransparentPixels = Boolean(info.hasTransparentPixels);
      state.current.width = state.source.width;
      state.current.height = state.source.height;
      setStatus("PNG decoded successfully. " + state.source.width + "×" + state.source.height, true);
      syncFormFromState();
    };
    image.onerror = () => {
      state.image = null;
      setStatus("INVALID · no se pudo decodificar la imagen.", false);
      toast("PNG inválido o corrupto.", "error");
    };
    image.src = source;
  }

  function inspectTransparency(dataUrl, done) {
    const image = new Image();
    image.onload = () => {
      const probe = document.createElement("canvas");
      probe.width = 64;
      probe.height = 64;
      const probeContext = probe.getContext("2d", { willReadFrequently: true });
      if (!probeContext) {
        done({ transparencyKnown: false, hasTransparentPixels: false, width: image.naturalWidth, height: image.naturalHeight });
        return;
      }
      probeContext.clearRect(0, 0, 64, 64);
      probeContext.drawImage(image, 0, 0, 64, 64);
      const pixels = probeContext.getImageData(0, 0, 64, 64).data;
      let transparent = false;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 250) {
          transparent = true;
          break;
        }
      }
      done({
        transparencyKnown: true,
        hasTransparentPixels: transparent,
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };
    image.onerror = () => done({ transparencyKnown: false, hasTransparentPixels: false, width: 0, height: 0 });
    image.src = dataUrl;
  }

  function drawBackground(width, height) {
    const mode = selectedValue(dom.previewBackground, "DARK");
    if (mode === "CHECKERBOARD") {
      const size = 20;
      for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
          context.fillStyle = ((x / size + y / size) % 2 === 0) ? "#c8cbd2" : "#9fa4ad";
          context.fillRect(x, y, size, size);
        }
      }
    } else if (mode === "WHITE") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    } else {
      context.fillStyle = "#080b13";
      context.fillRect(0, 0, width, height);
      if (mode === "COMBAT ARENA") {
        context.strokeStyle = "rgba(128,190,255,.12)";
        for (let line = 1; line <= 8; line += 1) {
          const y = height * .58 + line * line * 5;
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(width, y);
          context.stroke();
        }
        for (let line = -7; line <= 7; line += 1) {
          const x = width / 2 + line * 58;
          context.beginPath();
          context.moveTo(width / 2, height * .55);
          context.lineTo(x * 1.8, height);
          context.stroke();
        }
      }
    }
  }

  function drawSafeArea(width, height) {
    context.save();
    context.strokeStyle = "rgba(255,255,255,.24)";
    context.setLineDash([7, 6]);
    context.strokeRect(width * .12, height * .08, width * .76, height * .78);
    context.setLineDash([]);
    context.restore();
  }

  function drawPlaceholder(team = "player", x = 0, y = 0, scale = 1, mode = "idle") {
    const enemy = team === "enemy";
    const main = enemy ? "#ff648e" : "#6fb7ff";
    const shadow = enemy ? "#3b1730" : "#173354";
    const w = 132 * scale;
    const h = 172 * scale;
    context.save();
    context.translate(x, y);
    if (mode === "hurt") context.translate(-5 * scale, 0);
    if (mode === "attack") context.translate(7 * scale, 0);
    context.fillStyle = shadow;
    context.fillRect(-w * .3, -h * .05, w * .62, h * .55);
    context.fillStyle = main;
    context.beginPath();
    context.arc(0, -h * .38, 30 * scale, 0, Math.PI * 2);
    context.fill();
    context.fillRect(-w * .36, h * .1, 20 * scale, 52 * scale);
    context.fillRect(w * .16, h * .1, 20 * scale, 52 * scale);
    context.fillStyle = "#f7f9ff";
    context.fillRect(-16 * scale, -47 * scale, 32 * scale, 9 * scale);
    context.restore();
  }

  function currentMode(elapsed) {
    const stateName = dom.state.value;
    if (!state.playing) return "idle";
    if (stateName === "ATTACK" || stateName === "SKILL") return "attack";
    if (stateName === "HURT") return "hurt";
    if (stateName === "BREAK") return "break";
    return "idle";
  }

  function drawVfx(width, height, t, intensity = 1) {
    const centerX = width / 2;
    const centerY = height * .55;
    const pulse = .5 + .5 * Math.sin(t / 120);
    for (const fx of state.activeVfx) {
      if (fx === "FLASH") {
        context.fillStyle = "rgba(255,255,255," + (.18 * pulse * intensity) + ")";
        context.fillRect(0, 0, width, height);
      }
      if (fx === "GLOW") {
        const gradient = context.createRadialGradient(centerX, centerY - 60, 20, centerX, centerY - 60, 180);
        gradient.addColorStop(0, "rgba(111,183,255,.26)");
        gradient.addColorStop(1, "rgba(111,183,255,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }
      if (fx === "MOTION_TRAIL") {
        context.strokeStyle = "rgba(111,183,255,.35)";
        context.lineWidth = 7;
        for (let i = 1; i <= 4; i += 1) {
          context.globalAlpha = .25 / i;
          context.beginPath();
          context.moveTo(centerX - 130 - i * 22, centerY - 70);
          context.lineTo(centerX - 10 - i * 12, centerY - 30);
          context.stroke();
        }
        context.globalAlpha = 1;
      }
      if (fx === "IMPACT") {
        const radius = 28 + pulse * 65;
        context.strokeStyle = "rgba(255,255,255," + (.55 * (1 - pulse)) + ")";
        context.lineWidth = 5;
        context.beginPath();
        context.arc(centerX, centerY - 54, radius, 0, Math.PI * 2);
        context.stroke();
      }
      if (fx === "SCREEN_SHAKE") {
        const shake = 5 * intensity;
        context.translate(Math.sin(t / 34) * shake, Math.cos(t / 29) * shake);
      }
      if (fx === "DAMAGE_NUMBER") {
        context.fillStyle = "#ffffff";
        context.font = "900 26px system-ui";
        context.textAlign = "center";
        context.fillText("-32", centerX, centerY - 160 - pulse * 25);
      }
      if (fx === "BREAK FX") {
        context.strokeStyle = "rgba(255,178,77,.7)";
        context.lineWidth = 8;
        context.beginPath();
        context.arc(centerX, centerY - 55, 95 + pulse * 18, 0, Math.PI * 2);
        context.stroke();
      }
      if (fx === "BURST FX") {
        context.strokeStyle = "rgba(255,213,107,.8)";
        context.lineWidth = 10;
        context.beginPath();
        context.arc(centerX, centerY - 55, 80 + pulse * 40, 0, Math.PI * 2);
        context.stroke();
      }
      if (fx === "TELEGRAPH PULSE") {
        context.strokeStyle = "rgba(255,178,77,.7)";
        context.setLineDash([10, 8]);
        context.lineWidth = 3;
        context.beginPath();
        context.arc(centerX, centerY - 55, 115 + pulse * 12, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
      }
    }
  }

  function drawAsset(width, height, t) {
    const camera = state.camera;
    const focusedTeam = dom.previewSide.value === "ENEMY" ? "enemy" : "player";
    const focusedX = width * (focusedTeam === "player" ? state.preview.playerX : state.preview.enemyX);
    const opponentTeam = focusedTeam === "player" ? "enemy" : "player";
    const opponentX = width * (opponentTeam === "player" ? state.preview.playerX : state.preview.enemyX);
    const pulse = .5 + .5 * Math.sin(t / 160);
    const animOffset = state.playing
      ? (dom.state.value === "IDLE" ? Math.sin(t / 330) * 5
        : dom.state.value === "ATTACK" || dom.state.value === "SKILL" ? Math.sin(t / 170) * 14
          : dom.state.value === "HURT" ? Math.sin(t / 80) * 7
            : dom.state.value === "BREAK" ? Math.sin(t / 260) * 4
              : 0)
      : 0;
    const lunge = (dom.state.value === "ATTACK" || dom.state.value === "SKILL") ? animOffset : 0;
    const shake = state.activeVfx.has("SCREEN_SHAKE") ? Math.sin(t / 28) * camera.shake : 0;

    context.save();
    context.translate(
      focusedX + camera.offsetX + (focusedTeam === "enemy" ? -shake : shake),
      height * .68 + camera.offsetY + (state.playing ? animOffset * .15 : 0)
    );
    context.scale(camera.zoom * state.current.scale, camera.zoom * state.current.scale);
    context.translate(lunge * .35, 0);

    if (state.source.kind !== "PLACEHOLDER" && state.image) {
      const img = state.image;
      const ratio = Math.min(460 / img.naturalWidth, 390 / img.naturalHeight);
      const drawW = img.naturalWidth * ratio;
      const drawH = img.naturalHeight * ratio;
      context.save();
      if (state.current.flipX) context.scale(-1, 1);
      const anchorX = -drawW * state.current.anchorX;
      const anchorY = -drawH * state.current.anchorY;
      context.drawImage(img, anchorX + state.current.offsetX, anchorY + state.current.offsetY, drawW, drawH);
      context.restore();

      context.fillStyle = "rgba(255,255,255,.85)";
      context.font = "800 11px system-ui";
      context.textAlign = "left";
      context.fillText("ANCHOR", 10 + state.current.anchorX * 20, 26 + state.current.anchorY * 12);
    } else {
      drawPlaceholder("player", 0, 0, 1.1, currentMode(t));
    }

    context.fillStyle = "rgba(255,255,255,.82)";
    context.font = "800 11px system-ui";
    context.textAlign = "center";
    context.fillText(
      state.source.kind === "PLACEHOLDER" ? "TECHNICAL CHARACTER PLACEHOLDER · NOT FINAL ART" : state.current.status,
      0,
      112
    );

    context.strokeStyle = "rgba(255,213,107,.8)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 7, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#ffd56b";
    context.beginPath();
    context.arc(0, 0, 3, 0, Math.PI * 2);
    context.fill();

    context.restore();

    drawPlaceholder(opponentTeam, opponentX, height * .68, 0.72, "idle");
    context.fillStyle = focusedTeam === "player" ? "#6fb7ff" : "#ff648e";
    context.font = "900 10px system-ui";
    context.textAlign = "center";
    context.fillText(focusedTeam.toUpperCase(), focusedX, height * .68 + 92);
    context.fillStyle = opponentTeam === "player" ? "#6fb7ff" : "#ff648e";
    context.fillText(opponentTeam.toUpperCase() + " · TECHNICAL PLACEHOLDER", opponentX, height * .68 + 92);

    if (dom.previewBackground.value === "COMBAT ARENA") {
      context.fillStyle = "rgba(255,255,255,.55)";
      context.font = "800 10px system-ui";
      context.textAlign = "left";
      context.fillText("SAFE AREA", width * .12 + 5, height * .08 + 13);
    }

    drawVfx(width, height, t, pulse);
  }

  function render(now = performance.now()) {
    const rect = dom.canvas.getBoundingClientRect();
    const width = rect.width || 840;
    const height = rect.height || 520;
    context.clearRect(0, 0, width, height);
    drawBackground(width, height);
    drawSafeArea(width, height);
    drawAsset(width, height, now - state.previewStartedAt);
    context.globalAlpha = 1;
    context.setLineDash([]);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  function frame(now) {
    render(now);
    state.raf = requestAnimationFrame(frame);
  }

  function renderRegistry() {
    dom.registry.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const record of state.registry.assets) {
      const item = document.createElement("article");
      item.className = "registry-item";

      const heading = document.createElement("div");
      heading.className = "registry-heading";
      const title = document.createElement("strong");
      title.textContent = record.assetId;
      const status = document.createElement("span");
      status.className = "status-chip";
      status.textContent = record.status;
      status.dataset.status = record.status;
      heading.append(title, status);

      const details = document.createElement("p");
      details.textContent = [
        record.entityId || "GLOBAL",
        record.type,
        record.state,
        record.angle,
        record.facing
      ].join(" · ");

      const load = document.createElement("button");
      load.type = "button";
      load.textContent = "LOAD";
      load.addEventListener("click", () => {
        state.current = normalizeMetadata(record);
        if (record.sourceType === "PLACEHOLDER") {
          state.source = {
            kind: "PLACEHOLDER",
            value: "",
            width: record.width,
            height: record.height,
            sizeBytes: 0,
            transparencyKnown: true,
            hasTransparentPixels: true
          };
          state.image = null;
        } else {
          state.source = {
            kind: record.sourceType,
            value: record.source,
            width: record.width,
            height: record.height,
            sizeBytes: record.sizeBytes,
            transparencyKnown: false,
            hasTransparentPixels: false
          };
          loadImageSource(record.source, record.sourceType, record);
        }
        syncFormFromState();
        toast("Asset cargado para edición.", "info");
      });

      item.append(heading, details, load);
      fragment.appendChild(item);
    }
    dom.registry.appendChild(fragment);
    dom.registryCount.textContent = String(state.registry.assets.length);
  }

  function collectMetadataForSave() {
    updateStateFromForm();
    const report = validateCurrentMetadata();
    if (!report.valid) return report;
    if (state.current.status === "APPROVED") state.current.approvedByHuman = true;
    return report;
  }

  function register(status) {
    state.current.status = status;
    state.current.approvedByHuman = status === "APPROVED";
    updateStateFromForm();
    const report = validateMetadata(state.current);
    if (!report.valid) {
      setStatus(report.errors.join(" "), false);
      toast("No se puede registrar el asset.", "error");
      return false;
    }

    if (status !== "TECHNICAL_PLACEHOLDER" && state.source.kind === "UPLOAD" && state.source.sizeBytes > MAX_INLINE_BYTES) {
      setStatus("WARNING · el PNG es válido pero demasiado grande para localStorage. Registrá un STATIC_PATH.", true);
      toast("Persistencia inline bloqueada por tamaño.", "error");
      return false;
    }

    const result = upsertAsset(state.registry, state.current);
    if (!result.success) {
      setStatus(result.errors.join(" "), false);
      toast("Registro rechazado.", "error");
      return false;
    }

    const persisted = saveRegistry(result.registry);
    if (!persisted.success) {
      setStatus("WARNING · registro en memoria; localStorage falló: " + persisted.error, true);
      toast("No se pudo persistir el catálogo.", "error");
      return false;
    }

    state.registry = result.registry;
    syncFormFromState();
    toast(status === "APPROVED" ? "ART APPROVED · acción humana registrada." : "DRAFT SAVED · catálogo actualizado.", "success");
    return true;
  }

  async function handleUpload(file) {
    if (!file) return;
    const head = await file.slice(0, 8).arrayBuffer();
    if (!validatePngSignature(new Uint8Array(head))) {
      setStatus("INVALID · firma PNG incorrecta.", false);
      toast("El archivo no contiene una firma PNG válida.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      inspectTransparency(dataUrl, (decoded) => {
        const report = validatePngFile(file, decoded);
        if (!report.valid) {
          setStatus("INVALID · " + report.errors.join(" "), false);
          toast("PNG rechazado.", "error");
          return;
        }
        state.current.status = "DRAFT";
        state.current.approvedByHuman = false;
        state.source = {
          kind: "UPLOAD",
          value: dataUrl,
          width: report.width,
          height: report.height,
          sizeBytes: Number(file.size),
          hasTransparentPixels: decoded.hasTransparentPixels,
          transparencyKnown: decoded.transparencyKnown
        };
        if (!state.current.assetId || state.current.assetId.includes("placeholder")) {
          state.current.assetId = sanitizeId((state.current.entityId || "asset") + "_" + state.current.state.toLowerCase());
        }
        loadImageSource(dataUrl, "UPLOAD", state.source);
        setStatus(
          report.warnings.length
            ? "READY · " + report.warnings.join(" ")
            : "READY · PNG válido, transparente y decodificable.",
          true
        );
        syncFormFromState();
        toast("PNG cargado como DRAFT.", "success");
      });
    };
    reader.onerror = () => {
      setStatus("INVALID · no se pudo leer el archivo.", false);
      toast("No se pudo leer el PNG.", "error");
    };
    reader.readAsDataURL(file);
  }

  function loadStaticPath() {
    const path = String(dom.staticPath.value || "").trim();
    if (!path) {
      toast("Ingresá un static project path.", "error");
      return;
    }
    state.current.status = "DRAFT";
    state.current.approvedByHuman = false;
    state.source = {
      kind: "STATIC_PATH",
      value: path,
      width: 0,
      height: 0,
      sizeBytes: 0,
      hasTransparentPixels: false,
      transparencyKnown: false
    };
    loadImageSource(path, "STATIC_PATH", state.source);
    syncFormFromState();
    toast("Static path cargado para preview.", "info");
  }

  function applyAnchorPreset() {
    const preset = defaultAnchorFor(dom.type.value);
    state.current.anchor = preset.name;
    state.current.anchorX = preset.x;
    state.current.anchorY = preset.y;
    dom.anchor.value = preset.name;
    dom.anchorX.value = String(Math.round(preset.x * 100));
    dom.anchorY.value = String(Math.round(preset.y * 100));
    render();
  }

  function applyCameraPreset(name) {
    const preset = CAMERA_PRESETS[name] || CAMERA_PRESETS.DEFAULT;
    state.camera = { ...preset };
    render();
  }

  function toggleVfx(button) {
    const name = button.dataset.vfx;
    if (!name) return;
    if (state.activeVfx.has(name)) {
      state.activeVfx.delete(name);
      button.setAttribute("aria-pressed", "false");
    } else {
      state.activeVfx.add(name);
      button.setAttribute("aria-pressed", "true");
    }
    render();
  }

  function bindEvents() {
    dom.file.addEventListener("change", () => handleUpload(dom.file.files?.[0] || null));
    dom.staticLoad.addEventListener("click", loadStaticPath);
    dom.loadPlaceholder.addEventListener("click", () => {
      state.current = normalizeMetadata({
        ...state.current,
        sourceType: "PLACEHOLDER",
        status: "TECHNICAL_PLACEHOLDER",
        assetId: state.current.assetId.includes("placeholder") ? state.current.assetId : "yuri_" + dom.state.value.toLowerCase() + "_placeholder"
      });
      state.source = {
        kind: "PLACEHOLDER",
        value: "",
        width: 720,
        height: 900,
        sizeBytes: 0,
        transparencyKnown: true,
        hasTransparentPixels: true
      };
      state.image = null;
      syncFormFromState();
      toast("Technical placeholder cargado.", "info");
    });

    dom.saveDraft.addEventListener("click", () => register("DRAFT"));
    dom.approve.addEventListener("click", () => {
      if (state.source.kind === "PLACEHOLDER") {
        toast("Un technical placeholder no puede aprobarse como arte.", "error");
        return;
      }
      register("APPROVED");
    });

    dom.generatePrompt.addEventListener("click", () => {
      updateStateFromForm();
      dom.prompt.value = buildPrompt(state.current);
      toast("Prompt técnico generado.", "success");
    });

    dom.copyPrompt.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(dom.prompt.value);
        toast("Prompt copiado.", "success");
      } catch (error) {
        toast("Clipboard no disponible en este entorno.", "error");
      }
    });

    dom.clearCurrent.addEventListener("click", () => {
      state.current = normalizeMetadata({
        assetId: "yuri_attack_placeholder",
        type: "CHARACTER",
        entityId: "yuri",
        state: "ATTACK",
        angle: "THREE_QUARTER",
        facing: "RIGHT",
        sourceType: "PLACEHOLDER",
        status: "TECHNICAL_PLACEHOLDER",
        layer: "CHARACTER"
      });
      state.source = {
        kind: "PLACEHOLDER",
        value: "",
        width: 720,
        height: 900,
        sizeBytes: 0,
        hasTransparentPixels: true,
        transparencyKnown: true
      };
      state.image = null;
      syncFormFromState();
      toast("Editor reiniciado al placeholder técnico.", "info");
    });

    [
      dom.type, dom.entityId, dom.state, dom.angle, dom.facing, dom.flipX,
      dom.scale, dom.anchor, dom.anchorX, dom.anchorY, dom.offsetX, dom.offsetY, dom.layer,
      dom.sceneRole, dom.depth, dom.baselineScale, dom.focusScale, dom.focusOffsetX,
      dom.focusOffsetY, dom.allowedShots, dom.foregroundPriority, dom.backgroundPriority
    ].filter(Boolean).forEach((element) => {
      element.addEventListener("input", () => {
        updateGuide();
        render();
      });
      element.addEventListener("change", () => {
        updateGuide();
        render();
      });
    });

    dom.type.addEventListener("change", applyAnchorPreset);

    function syncPreviewPositionControls() {
      state.preview.side = dom.previewSide.value === "ENEMY" ? "ENEMY" : "PLAYER";
      state.preview.playerX = Number(dom.previewPlayerX.value) / 100;
      state.preview.enemyX = Number(dom.previewEnemyX.value) / 100;
      dom.previewPlayerXOutput.value = dom.previewPlayerX.value;
      dom.previewEnemyXOutput.value = dom.previewEnemyX.value;
      render();
    }

    dom.previewSide.addEventListener("change", syncPreviewPositionControls);
    dom.previewPlayerX.addEventListener("input", syncPreviewPositionControls);
    dom.previewEnemyX.addEventListener("input", syncPreviewPositionControls);
    dom.cameraPreset.addEventListener("change", () => applyCameraPreset(dom.cameraPreset.value));
    dom.animate.addEventListener("change", () => {
      state.playing = dom.animate.checked;
    });

    document.querySelectorAll("[data-vfx]").forEach((button) => {
      button.addEventListener("click", () => toggleVfx(button));
    });

    window.addEventListener("resize", render, { passive: true });
  }

  bindEvents();
  syncFormFromState();
  dom.animate.checked = true;
  dom.prompt.value = buildPrompt(state.current);
  renderRegistry();
  state.raf = requestAnimationFrame(frame);

  window.MachGirlsAssetStudio = API;
})();