export const AVATAR_ACTIVITIES = Object.freeze([
  "idle",
  "keyboard",
  "controller",
  "phone"
]);

export class AvatarActivityController {
  constructor({
    idleAfterMs = 1800,
    controllerPollMs = 250,
    autoEnabled = true
  } = {}) {
    this.idleAfterMs = Math.max(300, Number(idleAfterMs) || 1800);
    this.controllerPollMs = Math.max(80, Number(controllerPollMs) || 250);
    this.autoEnabled = Boolean(autoEnabled);
    this.manualActivity = null;
    this.keyboardUntil = 0;
    this.controllerUntil = 0;
    this.lastControllerSignature = "";
    this.lastControllerPoll = 0;
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

  markKeyboard(nowMs = performance.now()) {
    this.keyboardUntil = Math.max(this.keyboardUntil, Number(nowMs) + this.idleAfterMs);
  }

  markController(nowMs = performance.now()) {
    this.controllerUntil = Math.max(this.controllerUntil, Number(nowMs) + this.idleAfterMs);
  }

  setManual(activity = null) {
    if (activity === null || activity === "auto" || activity === "idle") {
      this.manualActivity = activity === "idle" ? "idle" : null;
    } else {
      const normalized = String(activity).toLowerCase();
      this.manualActivity = AVATAR_ACTIVITIES.includes(normalized)
        ? normalized
        : null;
    }
    return this.manualActivity;
  }

  clearManual() {
    this.manualActivity = null;
  }

  pollGamepads(nowMs = performance.now()) {
    if (!this.autoEnabled || !navigator.getGamepads) return;
    const now = Number(nowMs) || performance.now();
    if (now - this.lastControllerPoll < this.controllerPollMs) return;
    this.lastControllerPoll = now;

    let signature = "";
    for (const gamepad of navigator.getGamepads()) {
      if (!gamepad) continue;
      const buttons = gamepad.buttons.map(button =>
        button && button.pressed ? "1" : "0"
      ).join("");
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
    if (this.manualActivity === "phone") return "phone";
    if (this.manualActivity === "keyboard") return "keyboard";
    if (this.manualActivity === "controller") return "controller";
    if (this.manualActivity === "idle") return "idle";
    if (!this.autoEnabled) return "idle";

    const now = Number(nowMs) || performance.now();
    if (this.controllerUntil > now) return "controller";
    if (this.keyboardUntil > now) return "keyboard";
    return "idle";
  }
}
