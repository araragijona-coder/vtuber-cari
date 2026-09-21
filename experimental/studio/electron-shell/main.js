const { app, BrowserWindow, ipcMain, session, dialog, globalShortcut } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL, fileURLToPath } = require("node:url");
const { NativeEngine } = require("./runtime/native-engine");
const { ObsService } = require("./runtime/obs-service");
const { TwitchAuth } = require("./runtime/twitch-auth");
const { TwitchChatService } = require("./runtime/twitch-chat-service");
const { IntegrationHealthMonitor } = require("./runtime/integration-health");

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
let avatarOverlayActionState = {
  actionId: null,
  frameId: null,
  frameIndex: 0,
  url: null,
  dataUrl: null,
  opacity: 1,
  scale: 1,
  offsetX: 0,
  offsetY: 0
};
const subscribers = new Set();

const AVATAR_ACTIONS_VERSION = 1;
const AVATAR_ACTION_MAX_FRAMES = 24;
const AVATAR_FRAME_MAX_BYTES = 8 * 1024 * 1024;
const AVATAR_ACTION_ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function avatarActionsRoot() {
  return path.join(app.getPath("userData"), "avatar-actions");
}

function safeStorageSegment(value, fallback = "item") {
  const normalized = String(value || "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 120);
  return normalized || fallback;
}

function frameExtension(mime) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return ".png";
}

function decodeAvatarDataUrl(dataUrl) {
  const match = /^data:(image\\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(String(dataUrl || ""));
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (!AVATAR_ACTION_ALLOWED_MIME.has(mime)) return null;
  try {
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > AVATAR_FRAME_MAX_BYTES) return null;
    return { mime, bytes };
  } catch {
    return null;
  }
}

function avatarActionsConfigPath() {
  return path.join(avatarActionsRoot(), "actions.json");
}

async function loadAvatarActions() {
  const configPath = avatarActionsConfigPath();
  try {
    const parsed = JSON.parse(await fs.promises.readFile(configPath, "utf8"));
    if (parsed?.version !== AVATAR_ACTIONS_VERSION || !Array.isArray(parsed.actions)) {
      return { version: AVATAR_ACTIONS_VERSION, actions: [] };
    }
    return {
      version: AVATAR_ACTIONS_VERSION,
      actions: parsed.actions.slice(0, 64)
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { version: AVATAR_ACTIONS_VERSION, actions: [] };
    }
    throw new Error("Avatar action preset could not be read.");
  }
}

async function saveAvatarActions(payload) {
  if (!payload || payload.version !== AVATAR_ACTIONS_VERSION || !Array.isArray(payload.actions)) {
    throw new Error("Invalid avatar action preset.");
  }

  const root = avatarActionsRoot();
  const framesRoot = path.join(root, "frames");
  await fs.promises.mkdir(framesRoot, { recursive: true });

  const persisted = [];
  for (const input of payload.actions.slice(0, 64)) {
    if (!input || typeof input !== "object") continue;
    const actionId = safeStorageSegment(input.id, "action");
    const frameDir = path.join(framesRoot, actionId);
    await fs.promises.mkdir(frameDir, { recursive: true });

    const frames = [];
    for (const frame of (Array.isArray(input.frames) ? input.frames : []).slice(0, AVATAR_ACTION_MAX_FRAMES)) {
      if (!frame || typeof frame !== "object") continue;
      const frameId = safeStorageSegment(frame.id, "frame");

      let url = typeof frame.url === "string" ? frame.url : "";
      const decoded = decodeAvatarDataUrl(frame.dataUrl);
      if (decoded) {
        const outputPath = path.join(frameDir, frameId + frameExtension(decoded.mime));
        await fs.promises.writeFile(outputPath, decoded.bytes);
        url = pathToFileURL(outputPath).href;
      } else if (url.startsWith("file://")) {
        try {
          const sourcePath = fileURLToPath(url);
          const resolvedSource = path.resolve(sourcePath);
          const resolvedRoot = path.resolve(root);
          if (!resolvedSource.toLowerCase().startsWith(resolvedRoot.toLowerCase() + path.sep)) {
            const stat = await fs.promises.stat(resolvedSource);
            if (!stat.isFile() || stat.size > AVATAR_FRAME_MAX_BYTES) throw new Error("invalid avatar frame");
            const sourceBytes = await fs.promises.readFile(resolvedSource);
            const mime = AVATAR_ACTION_ALLOWED_MIME.has(String(frame.mime || "").toLowerCase())
              ? String(frame.mime).toLowerCase()
              : "image/png";
            const outputPath = path.join(frameDir, frameId + frameExtension(mime));
            await fs.promises.writeFile(outputPath, sourceBytes);
            url = pathToFileURL(outputPath).href;
          }
        } catch {
          url = "";
        }
      }

      if (!url || !url.startsWith("file://")) continue;
      frames.push({
        id: frameId,
        name: safeStorageSegment(frame.name, "image").slice(0, 120),
        dataUrl: "",
        url,
        mime: AVATAR_ACTION_ALLOWED_MIME.has(String(frame.mime || "").toLowerCase())
          ? String(frame.mime).toLowerCase()
          : "image/png",
        size: Number(frame.size) || 0,
        bundled: frame.bundled === true
      });
    }

    persisted.push({
      id: actionId,
      label: String(input.label || "Nueva acción").slice(0, 48),
      icon: String(input.icon || "+").slice(0, 4),
      expression: String(input.expression || "neutral"),
      mouthOpen: Math.max(0, Math.min(1, Number(input.mouthOpen) || 0)),
      durationMs: Math.max(80, Math.min(10000, Number(input.durationMs) || 800)),
      loop: input.loop !== false,
      opacity: Math.max(0, Math.min(1, Number(input.opacity) || 1)),
      scale: Math.max(0.1, Math.min(3, Number(input.scale) || 1)),
      offsetX: Math.max(-50, Math.min(50, Number(input.offsetX) || 0)),
      offsetY: Math.max(-50, Math.min(50, Number(input.offsetY) || 0)),
      frames
    });
  }

  const tempPath = path.join(root, "actions.json.tmp");
  const finalPath = avatarActionsConfigPath();
  await fs.promises.writeFile(
    tempPath,
    JSON.stringify({
      version: AVATAR_ACTIONS_VERSION,
      updatedAt: new Date().toISOString(),
      actions: persisted
    }, null, 2),
    "utf8"
  );
  await fs.promises.rename(tempPath, finalPath);
  return { version: AVATAR_ACTIONS_VERSION, actions: persisted };
}

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
const integrationHealth = new IntegrationHealthMonitor({ obs, twitch });

integrationHealth.on("status", payload => publish({ type: "integration.health", ...payload }));
integrationHealth.on("error", error => publish({ type: "integration.health.error", message: error.message }));

obs.on("event", payload => publish({ type: "obs.event", eventType: payload.type, data: payload.data || {} }));
obs.on("status", payload => publish({ type: "obs.status", ...payload }));
obs.on("connection-error", error => publish({ type: "obs.error", message: error.message }));
obs.on("connection-closed", error => publish({ type: "obs.status", connected: false, message: error?.message || "OBS disconnected" }));

function publish(payload) {
  for (const webContents of subscribers) {
    if (!webContents.isDestroyed()) webContents.send("native:event", payload);
  }
}

twitch.on("chat", message => publish({ type: "twitch.chat", ...message }));
twitch.on("chat:sent", message => publish({ type: "twitch.chat.sent", ...message }));
twitch.on("eventsub:welcome", payload => publish({ type: "twitch.eventsub.welcome", ...payload }));
twitch.on("eventsub:keepalive", payload => publish({ type: "twitch.eventsub.keepalive", ...payload }));
twitch.on("eventsub:reconnect", payload => publish({ type: "twitch.eventsub.reconnect", ...payload }));
twitch.on("event", message => publish({ type: "twitch.event", ...message }));
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

const GLOBAL_AVATAR_HOTKEYS = Object.freeze({
  "CommandOrControl+Alt+1": { type: "expression", value: "happy" },
  "CommandOrControl+Alt+2": { type: "expression", value: "angry" },
  "CommandOrControl+Alt+3": { type: "expression", value: "sad" },
  "CommandOrControl+Alt+4": { type: "expression", value: "afraid" },
  "CommandOrControl+Alt+0": { type: "clear-expression" },
  "CommandOrControl+Alt+C": { type: "calibrate" },
  "CommandOrControl+Alt+T": { type: "toggle-tracking" }
});

function registerGlobalAvatarHotkeys() {
  for (const [accelerator, action] of Object.entries(GLOBAL_AVATAR_HOTKEYS)) {
    globalShortcut.register(accelerator, () => {
      publish({ type: "avatar.hotkey", ...action });
    });
  }
}

function unregisterGlobalAvatarHotkeys() {
  globalShortcut.unregisterAll();
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
      win.webContents.send("avatar:action-frame", avatarOverlayActionState);
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

ipcMain.handle("avatar-actions:load", async event => {
  requireTrustedSender(event);
  return loadAvatarActions();
});

ipcMain.handle("avatar-actions:save", async (event, payload) => {
  requireTrustedSender(event);
  return saveAvatarActions(payload);
});

ipcMain.handle("avatar:set-state", (event, state) => {
  requireTrustedSender(event);
  avatarOverlayState = state || avatarOverlayState;
  if (!avatarOverlayWindow || avatarOverlayWindow.isDestroyed()) return { ok: false };
  avatarOverlayWindow.webContents.send("avatar:state", avatarOverlayState);
  return { ok: true };
});
ipcMain.handle("avatar:set-action-frame", (event, payload = {}) => {
  requireTrustedSender(event);

  const url = typeof payload.url === "string" && payload.url.startsWith("file://")
    ? payload.url
    : null;
  const dataUrl = typeof payload.dataUrl === "string" &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(payload.dataUrl) &&
      Buffer.byteLength(payload.dataUrl, "utf8") <= AVATAR_FRAME_MAX_BYTES * 2
    ? payload.dataUrl
    : null;

  avatarOverlayActionState = {
    actionId: safeStorageSegment(payload.actionId, "action"),
    frameId: safeStorageSegment(payload.frameId, "frame"),
    frameIndex: Math.max(0, Number(payload.frameIndex) || 0),
    url,
    dataUrl: url ? null : dataUrl,
    opacity: Math.max(0, Math.min(1, Number(payload.opacity) || 1)),
    scale: Math.max(0.1, Math.min(3, Number(payload.scale) || 1)),
    offsetX: Math.max(-50, Math.min(50, Number(payload.offsetX) || 0)),
    offsetY: Math.max(-50, Math.min(50, Number(payload.offsetY) || 0))
  };

  if (avatarOverlayWindow && !avatarOverlayWindow.isDestroyed()) {
    avatarOverlayWindow.webContents.send("avatar:action-frame", avatarOverlayActionState);
  }
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
  const selectedPath = result.filePaths[0];
  const extension = path.extname(selectedPath).toLowerCase();
  let dataUrl = null;
  if (extension === ".glb") {
    const bytes = fs.readFileSync(selectedPath);
    if (bytes.length <= 32 * 1024 * 1024) {
      dataUrl = "data:model/gltf-binary;base64," + bytes.toString("base64");
    }
  }
  return {
    canceled: false,
    path: selectedPath,
    url: pathToFileURL(selectedPath).href,
    dataUrl,
    name: path.basename(selectedPath)
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
ipcMain.handle("integrations:status", event => {
  requireTrustedSender(event);
  return integrationHealth.status();
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
ipcMain.handle("obs:scene-items", async (event, sceneName) => {
  requireTrustedSender(event);
  return obs.getSceneItems(sceneName);
});
ipcMain.handle("obs:set-scene-item-enabled", async (event, sceneName, sceneItemId, enabled) => {
  requireTrustedSender(event);
  return obs.setSceneItemEnabled(sceneName, sceneItemId, enabled);
});
ipcMain.handle("obs:get-input-mute", async (event, inputName) => {
  requireTrustedSender(event);
  return obs.getInputMute(inputName);
});
ipcMain.handle("obs:set-input-mute", async (event, inputName, muted) => {
  requireTrustedSender(event);
  return obs.setInputMute(inputName, muted);
});
ipcMain.handle("obs:toggle-input-mute", async (event, inputName) => {
  requireTrustedSender(event);
  return obs.toggleInputMute(inputName);
});
ipcMain.handle("obs:get-input-volume", async (event, inputName) => {
  requireTrustedSender(event);
  return obs.getInputVolume(inputName);
});
ipcMain.handle("obs:set-input-volume", async (event, inputName, volume, volumeDb = false) => {
  requireTrustedSender(event);
  return obs.setInputVolume(inputName, volume, volumeDb);
});
ipcMain.handle("obs:replay-status", async event => {
  requireTrustedSender(event);
  return obs.getReplayBufferStatus();
});
ipcMain.handle("obs:replay-start", async event => {
  requireTrustedSender(event);
  return obs.startReplayBuffer();
});
ipcMain.handle("obs:replay-stop", async event => {
  requireTrustedSender(event);
  return obs.stopReplayBuffer();
});
ipcMain.handle("obs:replay-save", async event => {
  requireTrustedSender(event);
  return obs.saveReplayBuffer();
});
ipcMain.handle("obs:transition-to-scene", async (event, sceneName, options = {}) => {
  requireTrustedSender(event);
  return obs.transitionToScene(sceneName, options);
});
ipcMain.handle("obs:status", async event => {
  requireTrustedSender(event);
  return obs.status();
});
ipcMain.handle("obs:scenes", async event => {
  requireTrustedSender(event);
  return obs.getSceneList();
});
ipcMain.handle("obs:inputs", async event => {
  requireTrustedSender(event);
  return obs.getInputList();
});
ipcMain.handle("obs:input-kinds", async event => {
  requireTrustedSender(event);
  return obs.getInputKindList();
});
ipcMain.handle("obs:stats", async event => {
  requireTrustedSender(event);
  return obs.getStats();
});
ipcMain.handle("obs:record-status", async event => {
  requireTrustedSender(event);
  return obs.getRecordStatus();
});
ipcMain.handle("obs:start-record", async event => {
  requireTrustedSender(event);
  return obs.startRecord();
});
ipcMain.handle("obs:stop-record", async event => {
  requireTrustedSender(event);
  return obs.stopRecord();
});
ipcMain.handle("obs:start-virtual-camera", async event => {
  requireTrustedSender(event);
  return obs.startVirtualCamera();
});
ipcMain.handle("obs:stop-virtual-camera", async event => {
  requireTrustedSender(event);
  return obs.stopVirtualCamera();
});
ipcMain.handle("obs:virtual-camera-status", async event => {
  requireTrustedSender(event);
  return obs.getVirtualCamStatus();
});
ipcMain.handle("obs:studio-mode", async event => {
  requireTrustedSender(event);
  return obs.getStudioModeEnabled();
});
ipcMain.handle("obs:set-preview-scene", async (event, sceneName) => {
  requireTrustedSender(event);
  return obs.setPreviewScene(sceneName);
});
ipcMain.handle("obs:studio-transition", async event => {
  requireTrustedSender(event);
  return obs.triggerStudioTransition();
});
ipcMain.handle("obs:profiles", async event => {
  requireTrustedSender(event);
  return obs.getProfileList();
});
ipcMain.handle("obs:scene-collections", async event => {
  requireTrustedSender(event);
  return obs.getSceneCollectionList();
});
ipcMain.handle("obs:set-profile", async (event, profileName) => {
  requireTrustedSender(event);
  return obs.setCurrentProfile(profileName);
});
ipcMain.handle("obs:set-scene-collection", async (event, sceneCollectionName) => {
  requireTrustedSender(event);
  return obs.setCurrentSceneCollection(sceneCollectionName);
});

function resolveCariExpressionRoot() {
  const candidates = [
    path.join(process.resourcesPath, "assets", "cari", "expressions"),
    path.resolve(__dirname, "../../../assets/cari/expressions")
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

ipcMain.handle("assets:cari-expressions", event => {
  requireTrustedSender(event);
  const root = resolveCariExpressionRoot();
  if (!root) return {};
  const names = {
    neutral: "cari_neutral.png",
    happy: "cari_happy.png",
    angry: "cari_angry.png"
  };
  return Object.fromEntries(
    Object.entries(names)
      .map(([key, filename]) => [key, pathToFileURL(path.join(root, filename)).href])
  );
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
  registerGlobalAvatarHotkeys();
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const isLocalRenderer = webContents.getURL().startsWith("file://");
    callback(isLocalRenderer && permission === "media");
  });

  createAvatarOverlayWindow();
  createWindow();
  integrationHealth.start();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  integrationHealth.stop();
  await engine.stop();
  if (process.platform !== "darwin") app.quit();
});


app.on("will-quit", () => {
  unregisterGlobalAvatarHotkeys();
});
