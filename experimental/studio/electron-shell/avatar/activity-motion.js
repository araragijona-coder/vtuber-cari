import {
  AVATAR_ACTIVITIES,
  AVATAR_MODES,
  MOVEMENT_LEVELS,
  ARM_POSES,
  HELD_OBJECTS,
  normalizeActivity,
  normalizeMode,
  normalizeMovementLevel,
  normalizeArmPose,
  normalizeHeldObject,
  normalizePose
} from "./avatar-contract.js";
import {
  FULL_ACTIVITY_MODES,
  getActivityPreset
} from "./activity-presets.js";

export { ACTIVITY_PRESETS, FULL_ACTIVITY_MODES, FULL_ACTIVITY_MODE_LIST } from "./activity-presets.js";

export class AvatarActivityController {
  constructor({
    idleAfterMs = 1800,
    controllerPollMs = 250,
    autoEnabled = true
  } = {}) {
    this.idleAfterMs = Math.max(300, Number(idleAfterMs) || 1800);
    this.controllerPollMs = Math.max(80, Number(controllerPollMs) || 250);
    this.autoEnabled = Boolean(autoEnabled);
    this.mode = "manual";
    this.manualState = {
      activity: "idle",
      movementLevel: "normal",
      arms: "relaxed",
      object: "none",
      pose: "standing"
    };
    this.currentState = { ...this.manualState, mode: this.mode };
    this.keyboardUntil = 0;
    this.controllerUntil = 0;
    this.lastControllerSignature = "";
    this.lastControllerPoll = 0;
    this.fullModeId = null;
    this.fullModeStartedAt = 0;
    this.boundKeydown = null;
  }

  install(target = window) {
    if (this.boundKeydown) return;
    this.boundKeydown = event => {
      if (event.repeat) return;
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (["Shift", "Control", "Alt", "Meta", "Tab", "Escape"].includes(event.key)) {
        return;
      }
      this.markKeyboard(performance.now());
    };
    target.addEventListener("keydown", this.boundKeydown, { passive: true });
  }

  dispose(target = window) {
    if (!this.boundKeydown) return;
    target.removeEventListener("keydown", this.boundKeydown);
    this.boundKeydown = null;
  }

  setMode(mode = "manual") {
    this.mode = normalizeMode(mode);
    if (this.mode !== "manual") this.fullModeId = null;
    this.currentState = this.#resolve(performance.now());
    return this.current();
  }

  setManual(patch = {}) {
    const source = { ...this.manualState, ...(patch || {}) };
    this.manualState = {
      activity: normalizeActivity(source.activity),
      movementLevel: normalizeMovementLevel(source.movementLevel),
      arms: normalizeArmPose(source.arms),
      object: normalizeHeldObject(source.object),
      pose: normalizePose(source.pose)
    };
    this.mode = "manual";
    this.fullModeId = null;
    this.currentState = { ...this.manualState, mode: "manual" };
    return { ...this.currentState };
  }

  setManualActivity(activity = "idle") {
    const preset = getActivityPreset(activity);
    return this.setManual(preset);
  }

  setMovementLevel(level = "normal") {
    return this.setManual({ movementLevel: level });
  }

  setArms(arms = "relaxed") {
    return this.setManual({ arms });
  }

  setObject(object = "none") {
    const patch = { object };
    if (object === "keyboard") patch.activity = "keyboard";
    if (object === "joystick") patch.activity = "controller";
    if (object === "phone") patch.activity = "phone";
    if (object === "pillow") patch.activity = "pillow";
    if (object === "none" && this.manualState.activity !== "idle") {
      patch.activity = "idle";
      patch.arms = "relaxed";
    }
    return this.setManual(patch);
  }

  startFullMode(id) {
    const mode = FULL_ACTIVITY_MODES[String(id || "").toLowerCase()];
    if (!mode) return null;
    this.mode = "manual";
    this.fullModeId = mode.id;
    this.fullModeStartedAt = performance.now();
    this.manualState = {
      activity: normalizeActivity(mode.activity),
      movementLevel: normalizeMovementLevel(mode.movementLevel),
      arms: normalizeArmPose(mode.arms),
      object: normalizeHeldObject(mode.object),
      pose: normalizePose(mode.pose)
    };
    this.currentState = this.#resolve(this.fullModeStartedAt);
    return { ...this.currentState, fullModeId: this.fullModeId };
  }

  stopFullMode() {
    this.fullModeId = null;
    this.manualState = {
      ...this.manualState,
      activity: "idle",
      movementLevel: "normal",
      arms: "relaxed",
      object: "none",
      pose: "standing"
    };
    this.currentState = { ...this.manualState, mode: "manual" };
    return { ...this.currentState };
  }

  markKeyboard(nowMs = performance.now()) {
    this.keyboardUntil = Math.max(this.keyboardUntil, Number(nowMs) + this.idleAfterMs);
  }

  markController(nowMs = performance.now()) {
    this.controllerUntil = Math.max(this.controllerUntil, Number(nowMs) + this.idleAfterMs);
  }

  pollGamepads(nowMs = performance.now()) {
    if (!this.autoEnabled || this.mode !== "auto-motion" || !navigator.getGamepads) return;
    const now = Number(nowMs) || performance.now();
    if (now - this.lastControllerPoll < this.controllerPollMs) return;
    this.lastControllerPoll = now;

    let signature = "";
    for (const gamepad of navigator.getGamepads()) {
      if (!gamepad) continue;
      const buttons = gamepad.buttons.map(button => button?.pressed ? "1" : "0").join("");
      const axes = gamepad.axes.map(axis =>
        Math.abs(Number(axis) || 0) > 0.18 ? Math.round(axis * 4) : 0
      ).join(",");
      signature += gamepad.id + "|" + buttons + "|" + axes + ";";
    }

    if (this.lastControllerSignature && signature !== this.lastControllerSignature) {
      this.markController(now);
    }
    this.lastControllerSignature = signature;
  }

  current(nowMs = performance.now()) {
    this.currentState = this.#resolve(Number(nowMs) || performance.now());
    return { ...this.currentState };
  }

  fullMode() {
    return this.fullModeId;
  }

  #resolve(now) {
    if (this.fullModeId) {
      const mode = FULL_ACTIVITY_MODES[this.fullModeId];
      const elapsed = Math.max(0, now - this.fullModeStartedAt);
      const index = mode.expressionCycle.length
        ? Math.floor(elapsed / Math.max(300, mode.expressionIntervalMs || 1800))
            % mode.expressionCycle.length
        : 0;
      const poseIndex = mode.poseCycle?.length
        ? Math.floor(elapsed / Math.max(300, mode.poseIntervalMs || 3000))
            % mode.poseCycle.length
        : 0;
      return {
        ...this.manualState,
        mode: "manual",
        fullModeId: mode.id,
        expression: mode.expressionCycle?.[index] || undefined,
        pose: mode.poseCycle?.[poseIndex] || this.manualState.pose
      };
    }

    if (this.mode === "manual") {
      return { ...this.manualState, mode: "manual" };
    }

    if (this.mode === "camera-actions") {
      return { ...this.manualState, mode: "camera-actions" };
    }

    if (!this.autoEnabled) {
      return {
        activity: "idle",
        movementLevel: "quiet",
        arms: "relaxed",
        object: "none",
        pose: "standing",
        mode: "auto-motion"
      };
    }

    const activity =
      this.controllerUntil > now
        ? "controller"
        : this.keyboardUntil > now
          ? "keyboard"
          : "idle";

    return {
      activity,
      movementLevel: activity === "idle" ? "normal" : "restless",
      arms: activity === "controller"
        ? "controller"
        : activity === "keyboard"
          ? "keyboard"
          : "relaxed",
      object: activity === "controller"
        ? "joystick"
        : activity === "keyboard"
          ? "keyboard"
          : "none",
      pose: "standing",
      mode: "auto-motion"
    };
  }
}
