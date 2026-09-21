export class SpeechActivityDetector {
  constructor({
    startThreshold = 0.045,
    stopThreshold = 0.028,
    holdMs = 140,
    attack = 0.55,
    release = 0.18
  } = {}) {
    this.startThreshold = Math.max(0, Number(startThreshold) || 0.045);
    this.stopThreshold = Math.min(
      this.startThreshold,
      Math.max(0, Number(stopThreshold) || 0.028)
    );
    this.holdMs = Math.max(0, Number(holdMs) || 140);
    this.attack = Math.max(0, Math.min(1, Number(attack) || 0.55));
    this.release = Math.max(0, Math.min(1, Number(release) || 0.18));
    this.level = 0;
    this.speaking = false;
    this.lastAboveThresholdAt = -Infinity;
  }

  update(rawLevel, nowMs = 0) {
    const input = Math.max(0, Math.min(1, Number(rawLevel) || 0));
    const factor = input >= this.level ? this.attack : this.release;
    this.level += (input - this.level) * factor;

    if (!this.speaking && this.level >= this.startThreshold) {
      this.speaking = true;
      this.lastAboveThresholdAt = nowMs;
    } else if (this.speaking) {
      if (this.level >= this.stopThreshold) {
        this.lastAboveThresholdAt = nowMs;
      } else if (nowMs - this.lastAboveThresholdAt >= this.holdMs) {
        this.speaking = false;
      }
    }

    return {
      level: this.level,
      speaking: this.speaking
    };
  }

  reset() {
    this.level = 0;
    this.speaking = false;
    this.lastAboveThresholdAt = -Infinity;
  }
}
