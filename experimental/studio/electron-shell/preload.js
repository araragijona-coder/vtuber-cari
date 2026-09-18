const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cari", {
  native: {
    start: config => ipcRenderer.invoke("native:start", config),
    send: command => ipcRenderer.invoke("native:send", command),
    stop: () => ipcRenderer.invoke("native:stop"),
    status: () => ipcRenderer.invoke("native:status")
  }
});
