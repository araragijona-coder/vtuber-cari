export const ACTIVITY_PRESETS = Object.freeze({
  idle: Object.freeze({
    label: "Quieto / libre",
    activity: "idle",
    movementLevel: "normal",
    arms: "relaxed",
    object: "none",
    pose: "standing"
  }),
  keyboard: Object.freeze({
    label: "Cari con teclado",
    activity: "keyboard",
    movementLevel: "normal",
    arms: "keyboard",
    object: "keyboard",
    pose: "standing"
  }),
  controller: Object.freeze({
    label: "Cari con joystick",
    activity: "controller",
    movementLevel: "normal",
    arms: "controller",
    object: "joystick",
    pose: "standing"
  }),
  phone: Object.freeze({
    label: "Cari con teléfono",
    activity: "phone",
    movementLevel: "quiet",
    arms: "phone",
    object: "phone",
    pose: "standing"
  }),
  pillow: Object.freeze({
    label: "Cari con almohada",
    activity: "pillow",
    movementLevel: "quiet",
    arms: "hug",
    object: "pillow",
    pose: "standing"
  }),
});

export const FULL_ACTIVITY_MODES = Object.freeze({
  "gaming-angry-happy": Object.freeze({
    id: "gaming-angry-happy",
    label: "Cari jugando con joystick — enojada ↔ feliz",
    ...ACTIVITY_PRESETS.controller,
    movementLevel: "restless",
    expressionCycle: Object.freeze(["angry", "happy"]),
    expressionIntervalMs: 1800
  }),
  "keyboard-tired-focused": Object.freeze({
    id: "keyboard-tired-focused",
    label: "Cari con teclado — cansada ↔ concentrada",
    ...ACTIVITY_PRESETS.keyboard,
    movementLevel: "quiet",
    expressionCycle: Object.freeze(["exhausted", "focused"]),
    expressionIntervalMs: 2600
  }),
  "pillow-hug-sleeping": Object.freeze({
    id: "pillow-hug-sleeping",
    label: "Cari con almohada — abrazando cansada → durmiendo",
    ...ACTIVITY_PRESETS.pillow,
    movementLevel: "quiet",
    expressionCycle: Object.freeze(["exhausted"]),
    expressionIntervalMs: 4200,
    poseCycle: Object.freeze(["standing", "sleeping"]),
    poseIntervalMs: 5200
  })
});

export const FULL_ACTIVITY_MODE_LIST = Object.freeze(
  Object.values(FULL_ACTIVITY_MODES).map(value => ({ ...value }))
);

export function getActivityPreset(id) {
  const key = String(id || "idle").toLowerCase();
  return ACTIVITY_PRESETS[key] || ACTIVITY_PRESETS.idle;
}

export function getFullActivityMode(id) {
  return FULL_ACTIVITY_MODES[String(id || "").toLowerCase()] || null;
}
