const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");

const engine = new EventEmitter();
let nativeProcess = null;
let nativeBuffer = "";

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

function emitNativeLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    engine.emit("message", JSON.parse(trimmed));
  } catch {
    engine.emit("log", trimmed);
  }
}

function attachNativeStream(stream, eventName) {
  stream.setEncoding("utf8");
  stream.on("data", chunk => {
    nativeBuffer += chunk;
    let newline;
    while ((newline = nativeBuffer.indexOf("\n")) >= 0) {
      const line = nativeBuffer.slice(0, newline).replace(/\r$/, "");
      nativeBuffer = nativeBuffer.slice(newline + 1);
      emitNativeLine(line);
    }
  });
  stream.on("error", error => engine.emit(eventName, error.message));
}

function startNativeEngine() {
  if (nativeProcess) return { running: true, pid: nativeProcess.pid };

  const exe = resolveNativeExecutable();
  if (!exe) {
    return {
      running: false,
      error: "Cari native engine not found. Set CARI_NATIVE_EXECUTABLE or package cari-studio-native.exe."
    };
  }

  nativeBuffer = "";
  nativeProcess = spawn(exe, [], {
    cwd: path.dirname(exe),
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"]
  });

  attachNativeStream(nativeProcess.stdout, "error");
  attachNativeStream(nativeProcess.stderr, "error");

  nativeProcess.on("exit", (code, signal) => {
    engine.emit("exit", { code, signal });
    nativeProcess = null;
    nativeBuffer = "";
  });

  nativeProcess.on("error", error => {
    engine.emit("error", error.message);
    nativeProcess = null;
  });

  return { running: true, pid: nativeProcess.pid };
}

function sendNative(command) {
  if (!nativeProcess || !nativeProcess.stdin.writable) {
    return { ok: false, error: "native engine is not running" };
  }
  try {
    nativeProcess.stdin.write(JSON.stringify(command) + "\n");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
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
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  const forward = payload => {
    if (!win.isDestroyed()) win.webContents.send("native:event", payload);
  };
  engine.on("message", forward);
  engine.on("log", message => forward({ type: "log", message }));
  engine.on("error", message => forward({ type: "error", message }));
  engine.on("exit", payload => forward({ type: "exit", ...payload }));

  win.on("closed", () => {
    engine.removeListener("message", forward);
  });
}

ipcMain.handle("native:start", () => startNativeEngine());
ipcMain.handle("native:send", (_, command) => sendNative(command));
ipcMain.handle("native:stop", () => {
  stopNative();
  return { ok: true };
});
ipcMain.handle("native:status", () => ({
  running: !!nativeProcess,
  pid: nativeProcess?.pid || null
}));

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
