const { app, BrowserWindow, ipcMain, session, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { NativeEngine } = require("./runtime/native-engine");
const { ObsService } = require("./runtime/obs-service");
const { TwitchAuth } = require("./runtime/twitch-auth");
const { TwitchChatService } = require("./runtime/twitch-chat-service");

const engineEvents = ["message", "log", "error", "exit"];
let avatarOverlayWindow = null;
let avatarOverlayState = {
  expression: "neutral",
  mouthOpen: 0,
  blink: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  eyeX: 0,
  eyeY: 0
};
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
const twitch = new TwitchChatService({ auth: new TwitchAuth() });

function publish(payload) {
  for (const webContents of subscribers) {
    if (!webContents.isDestroyed()) webContents.send("native:event", payload);
  }
}

twitch.on("chat", message => publish({ type: "twitch.chat", ...message }));
twitch.on("chat:sent", message => publish({ type: "twitch.chat.sent", ...message }));
twitch.on("eventsub:welcome", payload => publish({ type: "twitch.eventsub.welcome", ...payload }));
twitch.on("eventsub:keepalive", payload => publish({ type: "twitch.eventsub.keepalive", ...payload }));
twitch.on("status", payload => publish({ type: "twitch.status", ...payload }));
twitch.on("error", error => publish({ type: "twitch.error", message: error.message }));

for (const eventName of engineEvents) {
  engine.on(eventName, payload => {
    if (eventName === "message") publish(payload);
    else if (eventName === "error") publish({ type: "error", message: payload.message });
    else if (eventName === "log") publish({ type: "log", message: payload });
    else if (eventName === "exit") publish({ type: "exit", ...payload });
  });
}

function createAvatarOverlayWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 420,
    x: 32,
    y: 32,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "avatar-overlay-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.setIgnoreMouseEvents(true);

  const localUrl = pathToFileURL(
    path.join(__dirname, "avatar", "overlay.html")
  ).href;

  win.loadURL(localUrl);
  win.webContents.on("did-finish-load", () => {
    if (!win.isDestroyed()) {
      win.webContents.send("avatar:state", avatarOverlayState);
    }
  });
  win.once("ready-to-show", () => {
    if (!win.isDestroyed()) win.showInactive();
  });

  win.webContents.on("will-navigate", event => {
    event.preventDefault();
  });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  win.on("closed", () => {
    if (avatarOverlayWindow === win) avatarOverlayWindow = null;
  });

  if (process.platform === "win32") {
    const handle = win.getNativeWindowHandle();
    if (handle?.length) {
      process.env.CARI_AVATAR_HWND = handle.readBigUInt64LE(0).toString();
    }
  }

  avatarOverlayWindow = win;
  return win;
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

  const localUrl = pathToFileURL(
    path.join(__dirname, "renderer", "index.html")
  ).href;
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

ipcMain.handle("avatar:set-state", (event, state) => {
  requireTrustedSender(event);
  avatarOverlayState = state || avatarOverlayState;
  if (!avatarOverlayWindow || avatarOverlayWindow.isDestroyed()) return { ok: false };
  avatarOverlayWindow.webContents.send("avatar:state", avatarOverlayState);
  return { ok: true };
});

ipcMain.handle("avatar:choose-model", async event => {
  requireTrustedSender(event);
  const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
    title: "Choose a VTuber model",
    properties: ["openFile"],
    filters: [
      { name: "3D models", extensions: ["glb", "gltf"] }
    ]
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  return {
    canceled: false,
    path: result.filePaths[0],
    url: pathToFileURL(result.filePaths[0]).href,
    name: path.basename(result.filePaths[0])
  };
});

ipcMain.handle("avatar:overlay-show", event => {
  requireTrustedSender(event);
  if (!avatarOverlayWindow || avatarOverlayWindow.isDestroyed()) {
    createAvatarOverlayWindow();
  } else {
    avatarOverlayWindow.showInactive();
  }
  return { ok: true };
});
ipcMain.handle("avatar:overlay-hide", event => {
  requireTrustedSender(event);
  if (avatarOverlayWindow && !avatarOverlayWindow.isDestroyed()) {
    avatarOverlayWindow.hide();
  }
  return { ok: true };
});

ipcMain.handle("avatar:config", event => {
  requireTrustedSender(event);
  return {
    avatarModelPath: process.env.CARI_AVATAR_MODEL_PATH
      ? pathToFileURL(path.resolve(process.env.CARI_AVATAR_MODEL_PATH)).href
      : null
  };
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

ipcMain.handle("twitch:connect", async (event, options = {}) => {
  requireTrustedSender(event);
  return twitch.connect(options);
});
ipcMain.handle("twitch:disconnect", async event => {
  requireTrustedSender(event);
  return twitch.disconnect();
});
ipcMain.handle("twitch:send-chat", async (event, message) => {
  requireTrustedSender(event);
  return twitch.sendChat(message);
});
ipcMain.handle("twitch:status", event => {
  requireTrustedSender(event);
  return twitch.status;
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
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const isLocalRenderer = webContents.getURL().startsWith("file://");
    callback(isLocalRenderer && permission === "media");
  });

  createAvatarOverlayWindow();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  await engine.stop();
  if (process.platform !== "darwin") app.quit();
});
