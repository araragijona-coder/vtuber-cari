import { SpeechActivityDetector } from "./speech-activity.js";

export class LocalSpeechController {
  constructor({
    detector = new SpeechActivityDetector(),
    fftSize = 1024
  } = {}) {
    this.detector = detector;
    this.fftSize = Math.max(256, Number(fftSize) || 1024);
    this.stream = null;
    this.context = null;
    this.source = null;
    this.highpass = null;
    this.lowpass = null;
    this.analyser = null;
    this.buffer = new Float32Array(this.fftSize);
    this.started = false;
  }

  async start() {
    if (this.started) return { ok: true };

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.context = new AudioContext();
    await this.context.resume();

    this.source = this.context.createMediaStreamSource(this.stream);
    this.highpass = this.context.createBiquadFilter();
    this.highpass.type = "highpass";
    this.highpass.frequency.value = 100;
    this.highpass.Q.value = 0.7;

    this.lowpass = this.context.createBiquadFilter();
    this.lowpass.type = "lowpass";
    this.lowpass.frequency.value = 5000;
    this.lowpass.Q.value = 0.7;

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.12;

    this.source.connect(this.highpass);
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.analyser);

    this.started = true;
    this.detector.reset();
    return { ok: true };
  }

  sample(nowMs = performance.now()) {
    if (!this.started || !this.analyser) {
      return { level: 0, speaking: false, active: false };
    }

    this.analyser.getFloatTimeDomainData(this.buffer);

    let energy = 0;
    for (const sample of this.buffer) {
      energy += sample * sample;
    }

    const rms = Math.sqrt(energy / this.buffer.length);
    const level = Math.max(0, Math.min(1, rms * 4.4));
    const result = this.detector.update(level, nowMs);

    return {
      level: result.level,
      speaking: result.speaking,
      active: true
    };
  }

  stop() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;

    try { this.source?.disconnect(); } catch {}
    try { this.highpass?.disconnect(); } catch {}
    try { this.lowpass?.disconnect(); } catch {}
    try { this.analyser?.disconnect(); } catch {}

    this.source = null;
    this.highpass = null;
    this.lowpass = null;
    this.analyser = null;

    if (this.context) {
      this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.started = false;
    this.detector.reset();
  }
}
