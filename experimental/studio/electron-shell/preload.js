const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cari", {
  native: {
    start: () => ipcRenderer.invoke("native:start"),
    send: command => ipcRenderer.invoke("native:send", command),
    stop: () => ipcRenderer.invoke("native:stop"),
    status: () => ipcRenderer.invoke("native:status"),
    config: () => ipcRenderer.invoke("app:config"),
    obs: {
      connect: options => ipcRenderer.invoke("obs:connect", options),
      disconnect: () => ipcRenderer.invoke("obs:disconnect"),
      startStream: () => ipcRenderer.invoke("obs:start-stream"),
      stopStream: () => ipcRenderer.invoke("obs:stop-stream"),
      setScene: sceneName => ipcRenderer.invoke("obs:set-scene", sceneName),
      status: () => ipcRenderer.invoke("obs:status")
    },
    onEvent: callback => {
      const listener = (_, payload) => callback(payload);
      ipcRenderer.on("native:event", listener);
      return () => ipcRenderer.removeListener("native:event", listener);
    }
  }
});
