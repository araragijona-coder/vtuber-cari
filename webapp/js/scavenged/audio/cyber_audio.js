/**
 * Scavenged Cyber Audio
 * V0 — efectos sintéticos Web Audio.
 *
 * Módulo autocontenido: no escribe en el estado global del runtime.
 * El contexto se inicializa tras interacción del usuario.
 */

export class ScavengedCyberAudio {
  constructor() {
    this.ctx = null;
    this.initialized = false;

    this.initHandler = () => {
      this.initContext();
      this.removeInitHandler();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("click", this.initHandler, { once: true });
    }
  }

  removeInitHandler() {
    if (typeof window === "undefined") return;
    window.removeEventListener("click", this.initHandler);
  }

  initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return false;

      try {
        this.ctx = new AudioContext();
      } catch {
        return false;
      }
    }

    if (!this.ctx) return false;

    if (this.ctx.state === "suspended") {
      try {
        void this.ctx.resume();
      } catch {
        return false;
      }
    }

    this.initialized = true;
    return true;
  }

  playRevEngine() {
    if (!this.initContext()) return false;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.3);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
      return true;
    } catch {
      return false;
    }
  }

  playCriticalHit() {
    if (!this.initContext()) return false;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
      return true;
    } catch {
      return false;
    }
  }

  dispose() {
    this.removeInitHandler();

    if (!this.ctx) return;

    try {
      void this.ctx.close();
    } catch {
      // Teardown de audio deliberadamente best-effort.
    }

    this.ctx = null;
    this.initialized = false;
  }
}

export const cyberAudio = new ScavengedCyberAudio();
