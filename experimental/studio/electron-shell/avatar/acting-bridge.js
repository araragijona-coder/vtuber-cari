import { clamp01, normalizeAvatarState, toRenderParameters } from "./avatar-contract.js";

export class AvatarActingBridge {
  constructor() {
    this.state = normalizeAvatarState();
    this.listeners = new Set();
    this.manualOverrides = {
      expression: null,
      mouthOpen: null
    };
    this.faceMouthOpen = 0;
    this.speechMouthOpen = 0;
  }

  #composedMouth() {
    if (this.manualOverrides.mouthOpen !== null) {
      return this.manualOverrides.mouthOpen;
    }
    return Math.max(this.faceMouthOpen, this.speechMouthOpen);
  }

  #emit() {
    for (const listener of this.listeners) listener(this.state);
  }

  set(partial) {
    const patch = { ...(partial || {}) };

    if (Object.prototype.hasOwnProperty.call(patch, "mouthOpen")) {
      this.manualOverrides.mouthOpen = clamp01(patch.mouthOpen);
      delete patch.mouthOpen;
    }

    if (this.manualOverrides.expression !== null) {
      patch.expression = this.manualOverrides.expression;
    }

    patch.mouthOpen = this.#composedMouth();
    this.state = normalizeAvatarState(this.state, patch);
    this.#emit();
  }

  setFace(partial) {
    const patch = { ...(partial || {}) };
    if (Object.prototype.hasOwnProperty.call(patch, "mouthOpen")) {
      this.faceMouthOpen = clamp01(patch.mouthOpen);
      delete patch.mouthOpen;
    }
    patch.mouthOpen = this.#composedMouth();
    this.state = normalizeAvatarState(this.state, patch);
    this.#emit();
    return this.state;
  }

  setSpeech({ mouthOpen = 0, speaking = false, level = 0 } = {}) {
    this.speechMouthOpen = clamp01(mouthOpen);
    this.state = normalizeAvatarState(this.state, {
      mouthOpen: this.#composedMouth(),
      speaking: Boolean(speaking),
      speechLevel: clamp01(level)
    });
    this.#emit();
    return this.state;
  }

  clearSpeech() {
    return this.setSpeech({ mouthOpen: 0, speaking: false, level: 0 });
  }

  setManualMouth(value = null) {
    this.manualOverrides.mouthOpen =
      value === null ? null : clamp01(value);
    this.state = normalizeAvatarState(this.state, {
      mouthOpen: this.#composedMouth()
    });
    this.#emit();
    return this.manualOverrides.mouthOpen;
  }

  setActivity(activity = "idle") {
    this.state = normalizeAvatarState(this.state, {
      activity
    });
    this.#emit();
    return this.state.activity;
  }

  setManualExpression(expression = null) {
    this.manualOverrides.expression =
      expression === null ? null : String(expression).toLowerCase();
    this.state = normalizeAvatarState(this.state, {
      expression:
        this.manualOverrides.expression === null
          ? this.state.expression
          : this.manualOverrides.expression
    });
    this.#emit();
    return this.manualOverrides.expression;
  }

  clearManualExpression() {
    return this.setManualExpression(null);
  }

  manualExpression() {
    return this.manualOverrides.expression;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  toRenderParameters() {
    return toRenderParameters(this.state);
  }
}
