const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { NativeEngine } = require("./runtime/native-engine");
const { ObsService } = require("./runtime/obs-service");

const engineEvents = ["message", "log", "error", "exit"];
const subscribers = new Set();

function resolveNativeExecutable() {
  const configured = process.env.CARI_NATIVE_EXECUTABLE;
  if (configured) return path.resolve(configured);

  const candidates = [
    path.join(process.resourcesPath, "native", "cari-studio-native.exe"),
    path.join(__dirname, "..", "native", "cari-studio-native.exe"),
    path.join(__dirname, "native", "cari-studio-native.exe")
  ];

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

const engine = new NativeEngine({
  executableResolver: resolveNativeExecutable
});
const obs = new ObsService();

function publish(payload) {
  for (const webContents of subscribers) {
    if (!webContents.isDestroyed()) webContents.send("native:event", payload);
  }
}

for (const eventName of engineEvents) {
  engine.on(eventName, payload => {
    if (eventName === "message") publish(payload);
    else if (eventName === "error") publish({ type: "error", message: payload.message });
    else if (eventName === "log") publish({ type: "log", message: payload });
    else if (eventName === "exit") publish({ type: "exit", ...payload });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#111318",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const localUrl = "file://" + path.resolve(__dirname, "renderer", "index.html");
  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  win.webContents.on("will-navigate", event => {
    event.preventDefault();
  });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.webContents.on("did-navigate", (_event, url) => {
    if (!url.startsWith("file://")) {
      win.loadURL(localUrl);
    }
  });

  subscribers.add(win.webContents);
  win.on("closed", () => subscribers.delete(win.webContents));
}

function isTrustedSender(event) {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) return false;
  return event.sender.getURL().startsWith("file://");
}

function requireTrustedSender(event) {
  if (!isTrustedSender(event)) {
    throw new Error("untrusted IPC sender");
  }
}

ipcMain.handle("native:start", event => {
  requireTrustedSender(event);
  return engine.start();
});
ipcMain.handle("native:send", (event, command) => {
  requireTrustedSender(event);
  return engine.send(command);
});
ipcMain.handle("native:stop", event => {
  requireTrustedSender(event);
  return engine.stop();
});
ipcMain.handle("native:status", event => {
  requireTrustedSender(event);
  return {
    running: engine.running,
    pid: engine.pid
  };
});

ipcMain.handle("obs:connect", async (event, options = {}) => {
  requireTrustedSender(event);
  return obs.connect(options);
});
ipcMain.handle("obs:disconnect", async event => {
  requireTrustedSender(event);
  return obs.disconnect();
});
ipcMain.handle("obs:start-stream", async event => {
  requireTrustedSender(event);
  return obs.startStream();
});
ipcMain.handle("obs:stop-stream", async event => {
  requireTrustedSender(event);
  return obs.stopStream();
});
ipcMain.handle("obs:set-scene", async (event, sceneName) => {
  requireTrustedSender(event);
  return obs.setScene(sceneName);
});
ipcMain.handle("obs:status", async event => {
  requireTrustedSender(event);
  return obs.getStatus();
});

ipcMain.handle("app:config", event => {
  requireTrustedSender(event);

  return {
    mediaPipeModelPath: process.env.CARI_MEDIAPIPE_MODEL_PATH
      ? pathToFileURL(path.resolve(process.env.CARI_MEDIAPIPE_MODEL_PATH)).href
      : null,
    avatarModelPath: process.env.CARI_AVATAR_MODEL_PATH
      ? pathToFileURL(path.resolve(process.env.CARI_AVATAR_MODEL_PATH)).href
      : null
  };
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  await engine.stop();
  if (process.platform !== "darwin") app.quit();
});
