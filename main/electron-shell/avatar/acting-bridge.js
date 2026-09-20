import { normalizeAvatarState, toRenderParameters } from "./avatar-contract.js";

export class AvatarActingBridge {
  constructor() {
    this.state = normalizeAvatarState();
    this.listeners = new Set();
  }

  set(partial) {
    this.state = normalizeAvatarState(this.state, partial);
    for (const listener of this.listeners) listener(this.state);
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
