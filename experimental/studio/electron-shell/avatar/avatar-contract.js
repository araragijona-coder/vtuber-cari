export const AVATAR_EXPRESSIONS = Object.freeze([
  "neutral",
  "happy",
  "angry"
]);

const DEFAULT_STATE = Object.freeze({
  expression: "neutral",
  mouthOpen: 0,
  blink: 0,
  head: Object.freeze({ x: 0, y: 0, z: 0 }),
  gaze: Object.freeze({ x: 0, y: 0 })
});

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
    }
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
    expression: normalized.expression
  };
}
