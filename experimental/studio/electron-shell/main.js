const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { NativeEngine } = require("./runtime/native-engine");

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

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  subscribers.add(win.webContents);
  win.on("closed", () => subscribers.delete(win.webContents));
}

ipcMain.handle("native:start", () => engine.start());
ipcMain.handle("native:send", (_, command) => engine.send(command));
ipcMain.handle("native:stop", () => engine.stop());
ipcMain.handle("native:status", () => ({
  running: engine.running,
  pid: engine.pid
}));

ipcMain.handle("app:config", () => ({
  mediaPipeModelPath: process.env.CARI_MEDIAPIPE_MODEL_PATH
    ? pathToFileURL(path.resolve(process.env.CARI_MEDIAPIPE_MODEL_PATH)).href
    : null,
  avatarModelPath: process.env.CARI_AVATAR_MODEL_PATH
    ? pathToFileURL(path.resolve(process.env.CARI_AVATAR_MODEL_PATH)).href
    : null
}));

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
