const DEFAULT_STATE = Object.freeze({
  expression: "neutral",
  mouthOpen: 0,
  blink: 0,
  head: Object.freeze({ x: 0, y: 0, z: 0 }),
  gaze: Object.freeze({ x: 0, y: 0 }),
  speaking: false,
  speechLevel: 0,
  activity: "idle",
  mode: "manual",
  movementLevel: "normal",
  arms: "relaxed",
  object: "none",
  pose: "standing"
});

// Expressions are derived from the canonical Cari character bible.
// They are acting states, not replacements for personality.
export const AVATAR_EXPRESSIONS = Object.freeze([
  "neutral",
  "happy",
  "angry",
  "afraid",
  "embarrassed",
  "sad",
  "exhausted",
  "confused",
  "focused"
]);

export const AVATAR_ACTIVITIES = Object.freeze([
  "idle",
  "keyboard",
  "controller",
  "phone",
  "pillow"
]);

export const AVATAR_MODES = Object.freeze([
  "manual",
  "auto-motion",
  "camera-actions"
]);

export const MOVEMENT_LEVELS = Object.freeze([
  "quiet",
  "normal",
  "restless"
]);

export const ARM_POSES = Object.freeze([
  "relaxed",
  "keyboard",
  "controller",
  "phone",
  "hug",
  "sleeping"
]);

export const HELD_OBJECTS = Object.freeze([
  "none",
  "phone",
  "joystick",
  "keyboard",
  "pillow"
]);

export const AVATAR_POSES = Object.freeze([
  "standing",
  "sleeping"
]);

export function normalizeActivity(activity) {
  const value = String(activity || "idle").toLowerCase();
  return AVATAR_ACTIVITIES.includes(value) ? value : "idle";
}

export function normalizeMode(mode) {
  const value = String(mode || "manual").toLowerCase();
  return AVATAR_MODES.includes(value) ? value : "manual";
}

export function normalizeMovementLevel(level) {
  const value = String(level || "normal").toLowerCase();
  return MOVEMENT_LEVELS.includes(value) ? value : "normal";
}

export function normalizeArmPose(arms) {
  const value = String(arms || "relaxed").toLowerCase();
  return ARM_POSES.includes(value) ? value : "relaxed";
}

export function normalizeHeldObject(object) {
  const value = String(object || "none").toLowerCase();
  return HELD_OBJECTS.includes(value) ? value : "none";
}

export function normalizePose(pose) {
  const value = String(pose || "standing").toLowerCase();
  return AVATAR_POSES.includes(value) ? value : "standing";
}

export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

export function normalizeSigned(value, limit = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(-limit, Math.min(limit, number));
}

export function normalizeExpression(expression) {
  const value = String(expression || "neutral").toLowerCase();
  return AVATAR_EXPRESSIONS.includes(value) ? value : "neutral";
}

export function normalizeAvatarState(previous = DEFAULT_STATE, partial = {}) {
  const source = previous || DEFAULT_STATE;
  const patch = partial || {};

  return {
    expression: normalizeExpression(patch.expression ?? source.expression),
    mouthOpen: clamp01(patch.mouthOpen ?? source.mouthOpen),
    blink: clamp01(patch.blink ?? source.blink),
    head: {
      x: normalizeSigned(patch.head?.x ?? source.head?.x ?? 0),
      y: normalizeSigned(patch.head?.y ?? source.head?.y ?? 0),
      z: normalizeSigned(patch.head?.z ?? source.head?.z ?? 0)
    },
    gaze: {
      x: normalizeSigned(patch.gaze?.x ?? source.gaze?.x ?? 0),
      y: normalizeSigned(patch.gaze?.y ?? source.gaze?.y ?? 0)
    },
    speaking: Boolean(patch.speaking ?? source.speaking),
    speechLevel: clamp01(patch.speechLevel ?? source.speechLevel),
    activity: normalizeActivity(patch.activity ?? source.activity),
    mode: normalizeMode(patch.mode ?? source.mode),
    movementLevel: normalizeMovementLevel(
      patch.movementLevel ?? source.movementLevel
    ),
    arms: normalizeArmPose(patch.arms ?? source.arms),
    object: normalizeHeldObject(patch.object ?? source.object),
    pose: normalizePose(patch.pose ?? source.pose)
  };
}

export function toRenderParameters(state) {
  const normalized = normalizeAvatarState(DEFAULT_STATE, state);
  return {
    headYaw: normalized.head.x,
    headPitch: normalized.head.y,
    headRoll: normalized.head.z,
    eyeX: normalized.gaze.x,
    eyeY: normalized.gaze.y,
    mouthOpen: normalized.mouthOpen,
    blink: normalized.blink,
    expression: normalized.expression,
    speaking: normalized.speaking,
    speechLevel: normalized.speechLevel,
    activity: normalized.activity,
    mode: normalized.mode,
    movementLevel: normalized.movementLevel,
    arms: normalized.arms,
    object: normalized.object,
    pose: normalized.pose
  };
}
