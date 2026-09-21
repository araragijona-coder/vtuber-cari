const { EventEmitter } = require("node:events");
const { detectObsProcess } = require("./obs-discovery");

class IntegrationHealthMonitor extends EventEmitter {
  constructor({ obs, twitch, intervalMs = 2000 } = {}) {
    super();
    this.obs = obs;
    this.twitch = twitch;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
    this.snapshot = { obs: obs?.status?.() || {}, twitch: twitch?.status || {} };
  }

  async poll() {
    const process = await detectObsProcess();
    this.obs?.setProcessPresence(process);
    this.snapshot = { obs: this.obs?.status?.() || {}, twitch: this.twitch?.status || {}, observedAt: new Date().toISOString() };
    this.emit("status", this.snapshot);
    return this.snapshot;
  }

  start() {
    if (this.timer || this.running) return;
    this.running = true;
    this.poll().catch(error => this.emit("error", error));
    this.timer = setInterval(() => {
      this.poll().catch(error => this.emit("error", error));
    }, this.intervalMs);
    this.timer.unref?.();
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  status() {
    return this.snapshot;
  }
}

module.exports = { IntegrationHealthMonitor };
