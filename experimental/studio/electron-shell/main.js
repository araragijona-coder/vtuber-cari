const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");

const engine = new EventEmitter();
let nativeProcess = null;

function startNativeEngine(config = {}) {
  if (nativeProcess) return { running: true, pid: nativeProcess.pid };
  const exe = config.nativeExecutable;
  if (!exe) return { running: false, error: "nativeExecutable is not configured" };

  nativeProcess = spawn(exe, [], {
    cwd: config.workingDirectory || path.dirname(exe),
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"]
  });

  nativeProcess.stdout.on("data", data => engine.emit("log", data.toString()));
  nativeProcess.stderr.on("data", data => engine.emit("error", data.toString()));
  nativeProcess.on("exit", (code, signal) => {
    engine.emit("exit", { code, signal });
    nativeProcess = null;
  });

  return { running: true, pid: nativeProcess.pid };
}

function sendNative(command) {
  if (!nativeProcess || !nativeProcess.stdin.writable) {
    return { ok: false, error: "native engine is not running" };
  }
  nativeProcess.stdin.write(JSON.stringify(command) + "\n");
  return { ok: true };
}

function stopNative() {
  if (!nativeProcess) return;
  nativeProcess.kill();
  nativeProcess = null;
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
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

ipcMain.handle("native:start", (_, config) => startNativeEngine(config));
ipcMain.handle("native:send", (_, command) => sendNative(command));
ipcMain.handle("native:stop", () => { stopNative(); return { ok: true }; });
ipcMain.handle("native:status", () => ({ running: !!nativeProcess, pid: nativeProcess?.pid || null }));

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopNative();
  if (process.platform !== "darwin") app.quit();
});
