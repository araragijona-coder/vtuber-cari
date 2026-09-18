import OBSWebSocket from "obs-websocket-js";

export class ObsBridge {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
  }

  async connect({ url = "ws://127.0.0.1:4455", password } = {}) {
    await this.obs.connect(url, password);
    this.connected = true;
    return this.obs.call("GetVersion");
  }

  async disconnect() {
    if (this.connected) await this.obs.disconnect();
    this.connected = false;
  }

  async startStream() {
    return this.obs.call("StartStream");
  }

  async stopStream() {
    return this.obs.call("StopStream");
  }

  async setScene(sceneName) {
    return this.obs.call("SetCurrentProgramScene", { sceneName });
  }

  async getStatus() {
    return this.obs.call("GetStreamStatus");
  }
}
