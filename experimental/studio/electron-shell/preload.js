const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cari", {
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
