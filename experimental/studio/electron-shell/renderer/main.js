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
  renderer.apply(acting.toRenderParameters());
  renderer.render();
  ui.render.textContent = state.expression;
});

window.cari.native.onEvent(event => {
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
