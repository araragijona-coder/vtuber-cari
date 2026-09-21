const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cariAvatar", {
  config: () => ipcRenderer.invoke("avatar:config"),
  onState: callback => {
    const listener = (_, state) => callback(state);
    ipcRenderer.on("avatar:state", listener);
    return () => ipcRenderer.removeListener("avatar:state", listener);
  },
  onActionFrame: callback => {
    const listener = (_, state) => callback(state);
    ipcRenderer.on("avatar:action-frame", listener);
    return () => ipcRenderer.removeListener("avatar:action-frame", listener);
  }
});
