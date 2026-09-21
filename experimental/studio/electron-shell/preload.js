const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cari", {
  assets: {
    cariExpressions: () => ipcRenderer.invoke("assets:cari-expressions")
  },
  native: {
    start: () => ipcRenderer.invoke("native:start"),
    send: command => ipcRenderer.invoke("native:send", command),
    stop: () => ipcRenderer.invoke("native:stop"),
    status: () => ipcRenderer.invoke("native:status"),
    integrations: {
      status: () => ipcRenderer.invoke("integrations:status")
    },
    config: () => ipcRenderer.invoke("app:config"),
    obs: {
      connect: options => ipcRenderer.invoke("obs:connect", options),
      disconnect: () => ipcRenderer.invoke("obs:disconnect"),
      startStream: () => ipcRenderer.invoke("obs:start-stream"),
      stopStream: () => ipcRenderer.invoke("obs:stop-stream"),
      setScene: sceneName => ipcRenderer.invoke("obs:set-scene", sceneName),
      sceneItems: sceneName => ipcRenderer.invoke("obs:scene-items", sceneName),
      setSceneItemEnabled: (sceneName, sceneItemId, enabled) =>
        ipcRenderer.invoke("obs:set-scene-item-enabled", sceneName, sceneItemId, enabled),
      getInputMute: inputName => ipcRenderer.invoke("obs:get-input-mute", inputName),
      setInputMute: (inputName, muted) => ipcRenderer.invoke("obs:set-input-mute", inputName, muted),
      toggleInputMute: inputName => ipcRenderer.invoke("obs:toggle-input-mute", inputName),
      getInputVolume: inputName => ipcRenderer.invoke("obs:get-input-volume", inputName),
      setInputVolume: (inputName, volume, volumeDb = false) =>
        ipcRenderer.invoke("obs:set-input-volume", inputName, volume, volumeDb),
      replayStatus: () => ipcRenderer.invoke("obs:replay-status"),
      replayStart: () => ipcRenderer.invoke("obs:replay-start"),
      replayStop: () => ipcRenderer.invoke("obs:replay-stop"),
      replaySave: () => ipcRenderer.invoke("obs:replay-save"),
      transitionToScene: (sceneName, options = {}) =>
        ipcRenderer.invoke("obs:transition-to-scene", sceneName, options),
      status: () => ipcRenderer.invoke("obs:status"),
      scenes: () => ipcRenderer.invoke("obs:scenes"),
      inputs: () => ipcRenderer.invoke("obs:inputs"),
      inputKinds: () => ipcRenderer.invoke("obs:input-kinds"),
      stats: () => ipcRenderer.invoke("obs:stats"),
      recordStatus: () => ipcRenderer.invoke("obs:record-status"),
      startRecord: () => ipcRenderer.invoke("obs:start-record"),
      stopRecord: () => ipcRenderer.invoke("obs:stop-record"),
      startVirtualCamera: () => ipcRenderer.invoke("obs:start-virtual-camera"),
      stopVirtualCamera: () => ipcRenderer.invoke("obs:stop-virtual-camera"),
      virtualCameraStatus: () => ipcRenderer.invoke("obs:virtual-camera-status"),
      studioMode: () => ipcRenderer.invoke("obs:studio-mode"),
      previewScene: sceneName => ipcRenderer.invoke("obs:set-preview-scene", sceneName),
      transition: () => ipcRenderer.invoke("obs:studio-transition"),
      profiles: () => ipcRenderer.invoke("obs:profiles"),
      sceneCollections: () => ipcRenderer.invoke("obs:scene-collections"),
      setProfile: profileName => ipcRenderer.invoke("obs:set-profile", profileName),
      setScene: sceneName => ipcRenderer.invoke("obs:set-scene", sceneName),
      setSceneCollection: sceneCollectionName => ipcRenderer.invoke("obs:set-scene-collection", sceneCollectionName)
    },
    twitch: {
      connect: options => ipcRenderer.invoke("twitch:connect", options),
      disconnect: () => ipcRenderer.invoke("twitch:disconnect"),
      sendChat: message => ipcRenderer.invoke("twitch:send-chat", message),
      status: () => ipcRenderer.invoke("twitch:status")
    },
    avatarActions: {
      load: () => ipcRenderer.invoke("avatar-actions:load"),
      save: payload => ipcRenderer.invoke("avatar-actions:save", payload)
    },
    avatar: {
      setState: state => ipcRenderer.invoke("avatar:set-state", state),
      chooseModel: () => ipcRenderer.invoke("avatar:choose-model"),
      overlay: {
        show: () => ipcRenderer.invoke("avatar:overlay-show"),
        hide: () => ipcRenderer.invoke("avatar:overlay-hide")
      }
    },
    onEvent: callback => {
      const listener = (_, payload) => callback(payload);
      ipcRenderer.on("native:event", listener);
      return () => ipcRenderer.removeListener("native:event", listener);
    }
  }
});
