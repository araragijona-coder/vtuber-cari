export class AudioLipSync {
  constructor(acting, {
    floor = 0.015,
    gain = 2.6,
    attack = 0.65,
    release = 0.35
  } = {}) {
    this.acting = acting;
    this.floor = Math.max(0, Number(floor) || 0);
    this.gain = Math.max(0, Number(gain) || 0);
    this.attack = Math.max(0, Math.min(1, Number(attack) || 0));
    this.release = Math.max(0, Math.min(1, Number(release) || 0));
    this.value = 0;
  }

  update(level) {
    const input = Math.max(0, Math.min(1, Number(level) || 0));
    const normalized = input <= this.floor
      ? 0
      : Math.max(0, Math.min(1, (input - this.floor) * this.gain));

    const factor = normalized > this.value ? this.attack : this.release;
    this.value += (normalized - this.value) * factor;

    if (typeof this.acting.setSpeech === "function") {
      this.acting.setSpeech({
        mouthOpen: this.value,
        speaking: this.value > 0,
        level: input
      });
    } else {
      this.acting.set({ mouthOpen: this.value });
    }
    return this.value;
  }

  reset() {
    this.value = 0;
    if (typeof this.acting.clearSpeech === "function") {
      this.acting.clearSpeech();
    } else {
      this.acting.set({ mouthOpen: 0 });
    }
  }
}
