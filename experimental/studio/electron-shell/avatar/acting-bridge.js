import { normalizeAvatarState, toRenderParameters } from "./avatar-contract.js";

export class AvatarActingBridge {
  constructor() {
    this.state = normalizeAvatarState();
    this.listeners = new Set();
    this.manualOverrides = {
      expression: null
    };
  }

  set(partial) {
    const patch = { ...(partial || {}) };
    if (this.manualOverrides.expression !== null) {
      patch.expression = this.manualOverrides.expression;
    }

    this.state = normalizeAvatarState(this.state, patch);
    for (const listener of this.listeners) listener(this.state);
  }

  setManualExpression(expression = null) {
    this.manualOverrides.expression =
      expression === null ? null : String(expression).toLowerCase();
    this.set({});
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
