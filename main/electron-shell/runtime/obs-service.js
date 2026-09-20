const { OBSWebSocket } = require("obs-websocket-js");
const { EventEmitter } = require("node:events");

class ObsService extends EventEmitter {
  constructor() {
    super();
    this.client = new OBSWebSocket();
    this.connected = false;

    this.client.on("ConnectionClosed", error => {
      this.connected = false;
      this.emit("connection-closed", error);
    });
    this.client.on("ConnectionError", error => this.emit("connection-error", error));
  }

  async connect({
    url = process.env.CARI_OBS_URL || "ws://127.0.0.1:4455",
    password = process.env.CARI_OBS_PASSWORD
  } = {}) {
    const parsed = new URL(url);
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
      throw new Error("OBS URL must use ws:// or wss://");
    }

    const result = await this.client.connect(url, password);
    this.connected = true;
    return result;
  }

  async disconnect() {
    if (!this.connected) return { ok: true };
    await this.client.disconnect();
    this.connected = false;
    return { ok: true };
  }

  async startStream() {
    this.#requireConnection();
    return this.client.call("StartStream");
  }

  async stopStream() {
    this.#requireConnection();
    return this.client.call("StopStream");
  }

  async setScene(sceneName) {
    this.#requireConnection();
    const normalized = String(sceneName || "").trim();
    if (!normalized) throw new Error("sceneName is required");
    return this.client.call("SetCurrentProgramScene", { sceneName: normalized });
  }

  async getStatus() {
    this.#requireConnection();
    return this.client.call("GetStreamStatus");
  }

  #requireConnection() {
    if (!this.connected) throw new Error("OBS is not connected");
  }
}

module.exports = { ObsService };
