const { OBSWebSocket, EventSubscription, RequestBatchExecutionType } = require("obs-websocket-js");
const { EventEmitter } = require("node:events");

class ObsService extends EventEmitter {
  constructor() {
    super();
    this.client = new OBSWebSocket();
    this.connected = false;
    this.url = "";
    this.processDetected = false;
    this.processName = null;
    this.reconnectWanted = false;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.sceneCollectionChanging = false;
    this.obsWebSocketVersion = null;
    this.negotiatedRpcVersion = null;
    this.password = null;
    this.runtime = {
      streaming: false,
      streamState: "stopped",
      recording: false,
      recordState: "stopped",
      virtualCamera: false,
      virtualCameraState: "stopped",
      programScene: null,
      previewScene: null,
      studioMode: false,
      replayBuffer: false,
      replayBufferState: "stopped"
    };

    this.client.on("ConnectionError", error => {
      this.connected = false;
      this.#resetRuntime();
      this.emit("connection-error", error);
      this.emit("status", this.status());
    });

    this.client.on("ConnectionClosed", error => {
      this.connected = false;
      this.#resetRuntime();
      this.emit("connection-closed", error);
      this.emit("status", this.status());
      this.#scheduleReconnect();
    });
    this.client.on("StreamStateChanged", event => {
      this.runtime.streaming = event?.outputActive === true;
      this.runtime.streamState = event?.outputState || (this.runtime.streaming ? "running" : "stopped");
      this.emit("event", { type: "StreamStateChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("RecordStateChanged", event => {
      this.runtime.recording = event?.outputActive === true;
      this.runtime.recordState = event?.outputState || (this.runtime.recording ? "running" : "stopped");
      this.emit("event", { type: "RecordStateChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("VirtualcamStateChanged", event => {
      this.runtime.virtualCamera = event?.outputActive === true;
      this.runtime.virtualCameraState = event?.outputState || (this.runtime.virtualCamera ? "running" : "stopped");
      this.emit("event", { type: "VirtualcamStateChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("CurrentProgramSceneChanged", event => {
      this.runtime.programScene = event?.sceneName || null;
      this.emit("event", { type: "CurrentProgramSceneChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("CurrentPreviewSceneChanged", event => {
      this.runtime.previewScene = event?.sceneName || null;
      this.emit("event", { type: "CurrentPreviewSceneChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("StudioModeStateChanged", event => {
      this.runtime.studioMode = event?.studioModeEnabled === true;
      this.emit("event", { type: "StudioModeStateChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("ReplayBufferStateChanged", event => {
      this.runtime.replayBuffer = event?.outputActive === true;
      this.runtime.replayBufferState = event?.outputState ||
        (this.runtime.replayBuffer ? "running" : "stopped");
      this.emit("event", { type: "ReplayBufferStateChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("InputVolumeMeters", event => {
      this.emit("event", { type: "InputVolumeMeters", data: event || {} });
    });
    this.client.on("InputMuteStateChanged", event => {
      this.emit("event", { type: "InputMuteStateChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("InputVolumeChanged", event => {
      this.emit("event", { type: "InputVolumeChanged", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("CurrentSceneCollectionChanging", event => {
      this.sceneCollectionChanging = true;
      this.emit("event", { type: "CurrentSceneCollectionChanging", data: event || {} });
      this.emit("status", this.status());
    });
    this.client.on("CurrentSceneCollectionChanged", event => {
      this.sceneCollectionChanging = false;
      this.emit("event", { type: "CurrentSceneCollectionChanged", data: event || {} });
      this.emit("status", this.status());
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

    this.reconnectWanted = true;
    this.#cancelReconnect();
    this.password = password ?? this.password;
    const result = await this.client.connect(url, this.password, {
      rpcVersion: 1,
      eventSubscriptions:
        EventSubscription.All | EventSubscription.InputVolumeMeters
    });
    this.connected = true;
    this.url = url;
    const completedAttempt = this.reconnectAttempt;
    this.reconnectAttempt = 0;
    this.obsWebSocketVersion = result?.obsWebSocketVersion || null;
    this.negotiatedRpcVersion = result?.negotiatedRpcVersion || null;

    const [stream, record, virtualCamera, program, preview, studioMode] = await Promise.all([
      this.getStreamStatus(),
      this.getRecordStatus(),
      this.getVirtualCamStatus(),
      this.getCurrentProgramScene(),
      this.getCurrentPreviewScene(),
      this.getStudioModeEnabled()
    ]);
    this.runtime.streaming = stream?.outputActive === true;
    this.runtime.streamState = stream?.outputState || (this.runtime.streaming ? "running" : "stopped");
    this.runtime.recording = record?.outputActive === true;
    this.runtime.recordState = record?.outputState || (this.runtime.recording ? "running" : "stopped");
    this.runtime.virtualCamera = virtualCamera?.outputActive === true;
    this.runtime.virtualCameraState = virtualCamera?.outputState || (this.runtime.virtualCamera ? "running" : "stopped");
    this.runtime.programScene = program?.currentProgramSceneName || null;
    this.runtime.previewScene = preview?.currentPreviewSceneName || null;
    this.runtime.studioMode = studioMode?.studioModeEnabled === true;

    this.emit("status", this.status());
    if (completedAttempt > 0) {
      this.emit("event", {
        type: "OBSReconnectSucceeded",
        attempt: completedAttempt
      });
    }
    return result;
  }

  async disconnect() {
    this.reconnectWanted = false;
    this.#cancelReconnect();
    this.password = null;
    if (!this.connected) {
      this.#resetRuntime();
      this.emit("status", this.status());
      return { ok: true };
    }
    await this.client.disconnect();
    this.connected = false;
    this.#resetRuntime();
    this.emit("status", this.status());
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
    this.#assertSceneCollectionStable();
    const normalized = String(sceneName || "").trim();
    if (!normalized) throw new Error("sceneName is required");
    return this.client.call("SetCurrentProgramScene", { sceneName: normalized });
  }

  async getSceneItems(sceneName) {
    this.#requireConnection();
    this.#assertSceneCollectionStable();
    const normalized = String(sceneName || "").trim();
    if (!normalized) throw new Error("sceneName is required");
    return this.client.call("GetSceneItemList", { sceneName: normalized });
  }

  async setSceneItemEnabled(sceneName, sceneItemId, enabled) {
    this.#requireConnection();
    this.#assertSceneCollectionStable();
    const id = Number(sceneItemId);
    if (!Number.isInteger(id) || id < 0) throw new Error("sceneItemId is required");
    return this.client.call("SetSceneItemEnabled", {
      sceneName: String(sceneName || "").trim(),
      sceneItemId: id,
      sceneItemEnabled: Boolean(enabled)
    });
  }

  async getInputMute(inputName) {
    this.#requireConnection();
    return this.client.call("GetInputMute", { inputName: String(inputName || "").trim() });
  }

  async setInputMute(inputName, muted) {
    this.#requireConnection();
    return this.client.call("SetInputMute", {
      inputName: String(inputName || "").trim(),
      inputMuted: Boolean(muted)
    });
  }

  async toggleInputMute(inputName) {
    this.#requireConnection();
    return this.client.call("ToggleInputMute", { inputName: String(inputName || "").trim() });
  }

  async getInputVolume(inputName) {
    this.#requireConnection();
    return this.client.call("GetInputVolume", { inputName: String(inputName || "").trim() });
  }

  async setInputVolume(inputName, volume, volumeDb = false) {
    this.#requireConnection();
    const value = Number(volume);
    if (!Number.isFinite(value)) throw new Error("volume is required");
    return this.client.call("SetInputVolume", {
      inputName: String(inputName || "").trim(),
      inputVolumeMul: volumeDb ? undefined : Math.max(0, value),
      inputVolumeDb: volumeDb ? value : undefined
    });
  }

  async getReplayBufferStatus() {
    this.#requireConnection();
    return this.client.call("GetReplayBufferStatus");
  }

  async startReplayBuffer() {
    this.#requireConnection();
    return this.client.call("StartReplayBuffer");
  }

  async stopReplayBuffer() {
    this.#requireConnection();
    return this.client.call("StopReplayBuffer");
  }

  async saveReplayBuffer() {
    this.#requireConnection();
    return this.client.call("SaveReplayBuffer");
  }

  async transitionToScene(sceneName, {
    transitionName = null,
    durationMs = null
  } = {}) {
    this.#requireConnection();
    this.#assertSceneCollectionStable();
    const normalized = String(sceneName || "").trim();
    if (!normalized) throw new Error("sceneName is required");

    if (!this.runtime.studioMode) {
      return this.setScene(normalized);
    }

    const requests = [
      {
        requestType: "SetCurrentPreviewScene",
        requestData: { sceneName: normalized }
      }
    ];
    if (transitionName) {
      requests.push({
        requestType: "SetCurrentSceneTransition",
        requestData: { transitionName: String(transitionName) }
      });
    }
    if (durationMs !== null) {
      const duration = Math.max(0, Math.min(10000, Number(durationMs)));
      if (Number.isFinite(duration)) {
        requests.push({
          requestType: "SetCurrentSceneTransitionDuration",
          requestData: { transitionDuration: Math.round(duration) }
        });
      }
    }
    requests.push({ requestType: "TriggerStudioModeTransition" });
    return this.client.callBatch(requests, {
      executionType: RequestBatchExecutionType.SerialRealtime,
      haltOnFailure: true
    });
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

  setProcessPresence({ running = false, processName = null } = {}) {
    this.processDetected = running === true;
    this.processName = processName || null;
    this.emit("status", this.status());
  }

  status() {
    return {
      processDetected: this.processDetected,
      processName: this.processName,
      connected: this.connected,
      controlReady: this.connected && !this.sceneCollectionChanging,
      sceneCollectionChanging: this.sceneCollectionChanging,
      reconnectWanted: this.reconnectWanted,
      reconnectPending: this.reconnectTimer !== null,
      reconnectAttempt: this.reconnectAttempt,
      obsWebSocketVersion: this.obsWebSocketVersion,
      negotiatedRpcVersion: this.negotiatedRpcVersion,
      url: this.url,
      runtime: { ...this.runtime }
    };
  }

  #scheduleReconnect() {
    if (!this.reconnectWanted || this.reconnectTimer !== null) return;
    if (this.reconnectAttempt >= 5) return;
    const delays = [1000, 2000, 4000, 8000, 15000];
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
    this.reconnectAttempt += 1;
    const attempt = this.reconnectAttempt;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect({ url: this.url || undefined });
      } catch (error) {
        this.emit("connection-error", error);
        this.#scheduleReconnect();
      }
    }, delay);
    this.reconnectTimer.unref?.();
    this.emit("event", {
      type: "OBSReconnectScheduled",
      attempt,
      delayMs: delay
    });
  }

  #cancelReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  #assertSceneCollectionStable() {
    if (this.sceneCollectionChanging) {
      throw new Error("OBS is changing scene collection; wait for CurrentSceneCollectionChanged");
    }
  }

  #resetRuntime() {
    this.runtime.streaming = false;
    this.runtime.recording = false;
    this.runtime.virtualCamera = false;
    this.runtime.replayBuffer = false;
    this.runtime.replayBufferState = "stopped";
    this.runtime.streamState = "stopped";
    this.runtime.recordState = "stopped";
    this.runtime.virtualCameraState = "stopped";
    this.runtime.programScene = null;
    this.runtime.previewScene = null;
    this.runtime.studioMode = false;
  }

  #requireConnection() {
    if (!this.connected) throw new Error("OBS is not connected");
  }
}

module.exports = { ObsService };
