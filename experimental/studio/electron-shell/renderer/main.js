import { StudioSessionManager } from "../runtime/session-manager.js";
import { FaceTracker } from "../avatar/face-tracker.js";
import { FaceTrackingBridge } from "../avatar/face-tracking-bridge.js";
import { ThreeAvatarRenderer } from "../avatar/three-avatar.js";
import { AvatarActingBridge } from "../avatar/acting-bridge.js";
import { AudioLipSync } from "../avatar/audio-lipsync.js";

const ui = {
  canvas: document.querySelector("#avatar"),
  camera: document.querySelector("#camera"),
  status: document.querySelector("#status"),
  engine: document.querySelector("#engine"),
  tracking: document.querySelector("#tracking"),
  render: document.querySelector("#render"),
  model: document.querySelector("#model"),
  metrics: document.querySelector("#metrics")
};

const session = new StudioSessionManager(window.cari.native);
const acting = new AvatarActingBridge();
const renderer = new ThreeAvatarRenderer(ui.canvas);
const trackingBridge = new FaceTrackingBridge(acting);
const audioLipSync = new AudioLipSync(acting);

let faceTracker = null;
let cameraStream = null;
let trackingFrame = 0;
let refreshInFlight = false;
let twitchReadAloud = false;
let twitchConnected = false;

const twitchUi = {
  clientId: document.querySelector("#twitch-client-id"),
  channel: document.querySelector("#twitch-channel"),
  status: document.querySelector("#twitch-status"),
  log: document.querySelector("#chat-log"),
  input: document.querySelector("#chat-input"),
  read: document.querySelector("#chat-read"),
  events: document.querySelector("#event-log")
};

function appendEvent(text) {
  const row = document.createElement("div");
  row.className = "event-line";
  row.textContent = text;
  twitchUi.events.appendChild(row);
  twitchUi.events.scrollTop = twitchUi.events.scrollHeight;
}

function appendChat(message, outbound = false) {
  const row = document.createElement("div");
  row.className = "chat-line";
  const name = document.createElement("span");
  name.className = "chat-name";
  name.textContent = outbound ? "Cari" : (message.user_name || message.user_login || "viewer");
  row.appendChild(name);
  row.appendChild(document.createTextNode(": " + (message.text || "")));
  twitchUi.log.appendChild(row);
  twitchUi.log.scrollTop = twitchUi.log.scrollHeight;

  if (!outbound && twitchReadAloud && "speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(
      String(message.text || "").slice(0, 500)
    );
    utterance.rate = 1.05;
    utterance.pitch = 1.15;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const command = String(message.text || "").trim().toLowerCase();
  if (command === "!happy" || command === "!cari happy") acting.set({ expression: "happy" });
  if (command === "!angry" || command === "!cari angry") acting.set({ expression: "angry" });
  if (command === "!neutral" || command === "!cari neutral") acting.set({ expression: "neutral" });
}

function updateTwitchStatus(status) {
  twitchConnected = Boolean(status?.connected);
  twitchUi.status.textContent = twitchConnected
    ? "Connected as " + (status.user?.display_name || status.user?.login || "?") +
      " → " + (status.channel?.display_name || status.channel?.login || "?")
    : (status?.authorized ? "Authorized — connecting chat…" : "Disconnected");
}

function saveTwitchInputs() {
  localStorage.setItem("cari.twitch.clientId", twitchUi.clientId.value.trim());
  localStorage.setItem("cari.twitch.channel", twitchUi.channel.value.trim());
}

function restoreTwitchInputs() {
  twitchUi.clientId.value = localStorage.getItem("cari.twitch.clientId") || "";
  twitchUi.channel.value = localStorage.getItem("cari.twitch.channel") || "";
}

function showStatus(message) {
  ui.status.textContent = String(message || "");
}

function setTracking(message) {
  ui.tracking.textContent = String(message || "");
}

function parseStatus(message) {
  return Object.fromEntries(
    String(message || "")
      .split(";")
      .map(part => {
        const index = part.indexOf("=");
        return index > 0 ? [part.slice(0, index), part.slice(index + 1)] : null;
      })
      .filter(Boolean)
      .map(([key, value]) => [
        key,
        /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value
      ])
  );
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KiB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MiB";
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GiB";
}

async function refresh() {
  if (refreshInFlight) return;
  refreshInFlight = true;

  try {
    const result = await session.status();
    ui.engine.textContent = result.engine?.running
      ? "running (PID " + result.engine.pid + ")"
      : "offline";

    if (!result.engine?.running) {
      ui.metrics.textContent = "native engine offline";
      return;
    }

    if (result.native?.ok !== true) {
      ui.metrics.textContent = result.native?.error || "native status unavailable";
      return;
    }

    const metrics = parseStatus(result.native.message);
    if (!faceTracker) audioLipSync.update(metrics.audio_level ?? 0);
    ui.metrics.textContent =
      "Capture " + (metrics.frames ?? 0) +
      " frames @ " + Number(metrics.fps ?? 0).toFixed(1) + " FPS · " +
      "Audio " + (metrics.audio_packets ?? 0) + " packets · " +
      "Queues V/A " + (metrics.video_queued ?? 0) + "/" + (metrics.audio_queued ?? 0) + " · " +
      "Video " + formatBytes(metrics.video_bytes) + " · " +
      "Audio " + formatBytes(metrics.audio_bytes) + " · " +
      "Output " + (metrics.output_state ?? "unknown") + " (" + (metrics.output_exit_code ?? 0) + ") · " +
      "Retry " + (metrics.output_retry_attempts ?? 0) + "/" + (metrics.output_retry_pending ? "pending" : "idle") + " · " +
      "Failure " + (metrics.output_failure_category ?? "none") + " · " +
      "Drops V/A " + (metrics.video_dropped ?? 0) + "/" + (metrics.audio_dropped ?? 0) + " · " +
      "Late/Cadence " + (metrics.video_dropped_late ?? 0) + "/" + (metrics.video_dropped_cadence ?? 0) + " · " +
      "A/V format " + (metrics.video_dropped_format ?? 0) + "/" + (metrics.audio_dropped_format ?? 0) + " · " +
      "Audio late " + (metrics.audio_late ?? 0) + " · " +
      "Pacing budget " + (metrics.pacing_budget_exhausted ?? 0) + " · " +
      "Avatar overlay " + (metrics.avatar_overlay ?? "fallback") + " (" + (metrics.avatar_overlay_frames ?? 0) + ") · " +
      "Voice " + (metrics.voice_effect ?? "off");
  } catch (error) {
    showStatus("Status error: " + error.message);
  } finally {
    refreshInFlight = false;
  }
}

async function startCamera() {
  if (cameraStream) return;

  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 60 }
    },
    audio: false
  });

  ui.camera.srcObject = cameraStream;
  await ui.camera.play();
  setTracking(faceTracker ? "camera active" : "camera active — tracker not configured");
}

async function stopCamera() {
  if (!cameraStream) return;

  for (const track of cameraStream.getTracks()) track.stop();
  ui.camera.srcObject = null;
  cameraStream = null;
  trackingBridge.setEnabled(false);
  setTracking("idle");
}

async function configureTracking() {
  const config = await window.cari.config();
  if (!config.mediaPipeModelPath) {
    setTracking("MediaPipe disabled — set CARI_MEDIAPIPE_MODEL_PATH");
    return;
  }

  faceTracker?.close();
  faceTracker = new FaceTracker({
    modelPath: config.mediaPipeModelPath
  });
  await faceTracker.init();
  trackingBridge.setEnabled(true);
  setTracking("MediaPipe ready");
}

async function configureAvatar() {
  const config = await window.cari.config();
  if (!config.avatarModelPath) {
    ui.model.textContent = "placeholder avatar";
    return;
  }

  try {
    await renderer.load(config.avatarModelPath);
    ui.model.textContent = "GLB avatar loaded";
  } catch (error) {
    ui.model.textContent = "avatar load failed: " + error.message;
  }
}

function trackingLoop(timestamp) {
  trackingFrame = requestAnimationFrame(trackingLoop);

  if (!faceTracker || !cameraStream || ui.camera.readyState < 2) {
    return;
  }

  const result = faceTracker.detect(ui.camera, timestamp);
  if (result) {
    trackingBridge.apply(result);
  }
}

acting.subscribe(state => {
  const renderParameters = acting.toRenderParameters();
  renderer.apply(renderParameters);
  renderer.render();
  window.cari.native.avatar.setState(renderParameters).catch(() => undefined);
  ui.render.textContent = state.expression;
});

window.cari.native.onEvent(event => {
  if (event.type === "twitch.chat") {
    appendChat(event);
    appendEvent("chat ← " + (event.user_name || event.user_login || "viewer"));
    return;
  }
  if (event.type === "twitch.chat.sent") {
    appendChat(event, true);
    return;
  }
  if (event.type === "twitch.status") {
    updateTwitchStatus(event);
    return;
  }
  if (event.type === "twitch.eventsub.welcome") {
    appendEvent("EventSub connected");
    return;
  }
  if (event.type === "twitch.eventsub.keepalive") {
    return;
  }
  if (event.type === "twitch.error") {
    appendEvent("Twitch error: " + event.message);
    showStatus("Twitch error: " + event.message);
    return;
  }

  session.handleNativeEvent(event);

  if (event.type === "error") {
    showStatus("Native error: " + event.message);
  } else if (event.type === "log") {
    console.debug("[native]", event.message);
  } else if (event.type === "exit") {
    showStatus("Native engine exited (code " + (event.code ?? "?") + ")");
    refresh();
  } else if (event.ok === false) {
    showStatus(event.message || "Native command failed");
  } else if (event.ok === true) {
    showStatus(event.message || "Native command accepted");
  }
});

document.querySelector("#start").onclick = async () => {
  const result = await session.start();
  showStatus(result.error || "Native engine started");
  await refresh();
};

document.querySelector("#stop").onclick = async () => {
  await session.stop();
  await stopCamera();
  showStatus("Native engine stopped");
  await refresh();
};

document.querySelector("#capture-window").onclick = async () => {
  const input = document.querySelector("#window-index");
  const oneBased = Number.parseInt(input.value, 10);
  if (!Number.isInteger(oneBased) || oneBased < 1) {
    showStatus("Window number must be at least 1");
    return;
  }
  const result = await session.captureStart("window", oneBased - 1);
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#capture-screen").onclick = async () => {
  const result = await session.captureStart("screen");
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#capture-camera").onclick = async () => {
  const input = document.querySelector("#camera-source-index");
  const oneBased = Number.parseInt(input.value, 10);
  if (!Number.isInteger(oneBased) || oneBased < 1) {
    showStatus("Camera number must be at least 1");
    return;
  }
  const result = await session.captureStart("camera", oneBased - 1);
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#capture-stop").onclick = async () => {
  const result = await session.captureStop();
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#record").onclick = async () => {
  const result = await session.outputStart("local-record");
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#stream-start").onclick = async () => {
  const target = document.querySelector("#rtmp-target").value.trim();
  const result = await session.outputStart("rtmp", target);
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#stream-stop").onclick = async () => {
  const result = await session.outputStop();
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#obs-connect").onclick = async () => {
  try {
    const result = await window.cari.native.obs.connect({});
    showStatus("OBS connected: " + (result.obsWebSocketVersion || "ready"));
  } catch (error) {
    showStatus("OBS connection failed: " + error.message);
  }
};

document.querySelector("#obs-start").onclick = async () => {
  try {
    await window.cari.native.obs.startStream();
    showStatus("OBS stream started");
  } catch (error) {
    showStatus("OBS start failed: " + error.message);
  }
};

document.querySelector("#obs-stop").onclick = async () => {
  try {
    await window.cari.native.obs.stopStream();
    showStatus("OBS stream stopped");
  } catch (error) {
    showStatus("OBS stop failed: " + error.message);
  }
};

document.querySelector("#voice-off").onclick = async () => {
  const result = await session.setVoiceEffect("off");
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#voice-anime").onclick = async () => {
  const result = await session.setVoiceEffect("anime-bright");
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#camera-start").onclick = async () => {
  try {
    await startCamera();
    if (!faceTracker) await configureTracking();
  } catch (error) {
    showStatus("Camera error: " + error.message);
    setTracking("camera unavailable");
  }
};

document.querySelector("#camera-stop").onclick = stopCamera;
document.querySelector("#neutral").onclick = () => acting.set({ expression: "neutral" });
document.querySelector("#happy").onclick = () => acting.set({ expression: "happy" });
document.querySelector("#angry").onclick = () => acting.set({ expression: "angry" });

await configureAvatar();
trackingLoop(performance.now());
await refresh();
setInterval(() => {
  refresh().catch(error => showStatus("Status error: " + error.message));
}, 250);
renderer.render();

document.querySelector("#twitch-connect").onclick = async () => {
  saveTwitchInputs();
  try {
    const status = await window.cari.native.twitch.connect({
      clientId: twitchUi.clientId.value.trim(),
      channel: twitchUi.channel.value.trim()
    });
    updateTwitchStatus(status);
    appendEvent("Twitch connected");
  } catch (error) {
    updateTwitchStatus({ connected: false });
    appendEvent("Twitch connect failed: " + error.message);
    showStatus("Twitch connect failed: " + error.message);
  }
};

document.querySelector("#twitch-disconnect").onclick = async () => {
  try {
    const status = await window.cari.native.twitch.disconnect();
    updateTwitchStatus(status);
    appendEvent("Twitch disconnected");
  } catch (error) {
    showStatus("Twitch disconnect failed: " + error.message);
  }
};

async function sendTwitchChat() {
  const text = twitchUi.input.value.trim();
  if (!text) return;
  try {
    await window.cari.native.twitch.sendChat(text);
    twitchUi.input.value = "";
  } catch (error) {
    showStatus("Chat send failed: " + error.message);
    appendEvent("chat send failed: " + error.message);
  }
}

document.querySelector("#chat-send").onclick = sendTwitchChat;
twitchUi.input.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendTwitchChat();
  }
});

document.querySelector("#chat-read").onclick = () => {
  twitchReadAloud = !twitchReadAloud;
  twitchUi.read.textContent = "Read Chat: " + (twitchReadAloud ? "On" : "Off");
  if (!twitchReadAloud && "speechSynthesis" in window) window.speechSynthesis.cancel();
};

document.querySelector("#model-pick").onclick = async () => {
  try {
    const result = await window.cari.native.avatar.chooseModel();
    if (result?.canceled) return;
    await renderer.load(result.url);
    ui.model.textContent = result.name || "GLB model loaded";
    renderer.render();
    showStatus("Avatar loaded: " + (result.name || "model"));
  } catch (error) {
    ui.model.textContent = "model load failed";
    showStatus("Avatar load failed: " + error.message);
  }
};

document.querySelector("#overlay-show").onclick = () =>
  window.cari.native.avatar.overlay.show()
    .then(() => showStatus("Avatar overlay shown"))
    .catch(error => showStatus("Overlay error: " + error.message));

document.querySelector("#overlay-hide").onclick = () =>
  window.cari.native.avatar.overlay.hide()
    .then(() => showStatus("Avatar overlay hidden"))
    .catch(error => showStatus("Overlay error: " + error.message));

restoreTwitchInputs();
window.cari.native.twitch.status().then(updateTwitchStatus).catch(() => undefined);
