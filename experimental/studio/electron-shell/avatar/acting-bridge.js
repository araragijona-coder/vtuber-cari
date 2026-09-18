export class AvatarActingBridge {
  constructor() {
    this.state = {
      expression: "neutral",
      mouthOpen: 0,
      blink: 0,
      head: { x: 0, y: 0, z: 0 },
      gaze: { x: 0, y: 0 }
    };
    this.listeners = new Set();
  }

  set(partial) {
    this.state = {
      ...this.state,
      ...partial,
      head: { ...this.state.head, ...(partial.head || {}) },
      gaze: { ...this.state.gaze, ...(partial.gaze || {}) }
    };
    for (const listener of this.listeners) listener(this.state);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  toRenderParameters() {
    return {
      headYaw: this.state.head.x,
      headPitch: this.state.head.y,
      headRoll: this.state.head.z,
      eyeX: this.state.gaze.x,
      eyeY: this.state.gaze.y,
      mouthOpen: this.state.mouthOpen,
      blink: this.state.blink,
      expression: this.state.expression
    };
  }
}
