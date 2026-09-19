const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cari", {
  native: {
    start: () => ipcRenderer.invoke("native:start"),
    send: command => ipcRenderer.invoke("native:send", command),
    stop: () => ipcRenderer.invoke("native:stop"),
    status: () => ipcRenderer.invoke("native:status"),
    onEvent: callback => {
      const listener = (_, payload) => callback(payload);
      ipcRenderer.on("native:event", listener);
      return () => ipcRenderer.removeListener("native:event", listener);
    }
  }
});
