const { OBSWebSocket } = require("obs-websocket-js");
const { EventEmitter } = require("node:events");

class ObsService extends EventEmitter {
  constructor() {
    super();
    this.client = new OBSWebSocket();
    this.connected = false;
    this.url = "";

    this.client.on("ConnectionClosed", error => {
      this.connected = false;
      this.emit("connection-closed", error);
    });
    this.client.on("ConnectionError", error => {
      this.connected = false;
      this.emit("connection-error", error);
    });
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
    this.url = url;
    this.emit("status", await this.status());
    return result;
  }

  async disconnect() {
    if (!this.connected) return { ok: true };
    await this.client.disconnect();
    this.connected = false;
    this.emit("status", await this.status());
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

  async startRecord() {
    this.#requireConnection();
    return this.client.call("StartRecord");
  }

  async stopRecord() {
    this.#requireConnection();
    return this.client.call("StopRecord");
  }

  async toggleRecord() {
    this.#requireConnection();
    return this.client.call("ToggleRecord");
  }

  async setScene(sceneName) {
    this.#requireConnection();
    const normalized = String(sceneName || "").trim();
    if (!normalized) throw new Error("sceneName is required");
    return this.client.call("SetCurrentProgramScene", { sceneName: normalized });
  }

  async setPreviewScene(sceneName) {
    this.#requireConnection();
    const normalized = String(sceneName || "").trim();
    if (!normalized) throw new Error("sceneName is required");
    return this.client.call("SetCurrentPreviewScene", { sceneName: normalized });
  }

  async triggerStudioTransition() {
    this.#requireConnection();
    return this.client.call("TriggerStudioModeTransition");
  }

  async startVirtualCamera() {
    this.#requireConnection();
    return this.client.call("StartVirtualCam");
  }

  async stopVirtualCamera() {
    this.#requireConnection();
    return this.client.call("StopVirtualCam");
  }

  async getSceneList() {
    this.#requireConnection();
    return this.client.call("GetSceneList");
  }

  async getCurrentProgramScene() {
    this.#requireConnection();
    return this.client.call("GetCurrentProgramScene");
  }

  async getCurrentPreviewScene() {
    this.#requireConnection();
    return this.client.call("GetCurrentPreviewScene");
  }

  async getInputList() {
    this.#requireConnection();
    return this.client.call("GetInputList");
  }

  async getInputKindList() {
    this.#requireConnection();
    return this.client.call("GetInputKindList");
  }

  async getStats() {
    this.#requireConnection();
    return this.client.call("GetStats");
  }

  async getStreamStatus() {
    this.#requireConnection();
    return this.client.call("GetStreamStatus");
  }

  async getRecordStatus() {
    this.#requireConnection();
    return this.client.call("GetRecordStatus");
  }

  async getVirtualCamStatus() {
    this.#requireConnection();
    return this.client.call("GetVirtualCamStatus");
  }

  async getStudioModeEnabled() {
    this.#requireConnection();
    return this.client.call("GetStudioModeEnabled");
  }

  async setCurrentProfile(profileName) {
    this.#requireConnection();
    const normalized = String(profileName || "").trim();
    if (!normalized) throw new Error("profileName is required");
    return this.client.call("SetCurrentProfile", { profileName: normalized });
  }

  async setCurrentSceneCollection(sceneCollectionName) {
    this.#requireConnection();
    const normalized = String(sceneCollectionName || "").trim();
    if (!normalized) throw new Error("sceneCollectionName is required");
    return this.client.call("SetCurrentSceneCollection", { sceneCollectionName: normalized });
  }

  async getSceneCollectionList() {
    this.#requireConnection();
    return this.client.call("GetSceneCollectionList");
  }

  async getProfileList() {
    this.#requireConnection();
    return this.client.call("GetProfileList");
  }

  async status() {
    return {
      connected: this.connected,
      url: this.url,
    };
  }

  #requireConnection() {
    if (!this.connected) throw new Error("OBS is not connected");
  }
}

module.exports = { ObsService };
