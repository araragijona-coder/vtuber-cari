import { StudioController } from "../runtime/studio-controller.js";
import { FaceTracker } from "../avatar/face-tracker.js";
import { FaceTrackingBridge } from "../avatar/face-tracking-bridge.js";
import { ThreeAvatarRenderer } from "../avatar/three-avatar.js";
import { AvatarActingBridge } from "../avatar/acting-bridge.js";

const ui = {
  canvas: document.querySelector("#avatar"),
  camera: document.querySelector("#camera"),
  status: document.querySelector("#status"),
  engine: document.querySelector("#engine"),
  tracking: document.querySelector("#tracking"),
  render: document.querySelector("#render"),
  model: document.querySelector("#model")
};

const controller = new StudioController(window.cari.native);
const acting = new AvatarActingBridge();
const renderer = new ThreeAvatarRenderer(ui.canvas);
const trackingBridge = new FaceTrackingBridge(acting);

let faceTracker = null;
let cameraStream = null;
let trackingFrame = 0;

function showStatus(message) {
  ui.status.textContent = message;
}

function setTracking(message) {
  ui.tracking.textContent = message;
}

async function refresh() {
  const state = await controller.status();
  ui.engine.textContent = state.running
    ? `running (PID ${state.pid})`
    : "offline";
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
  setTracking("idle");
}

async function configureTracking() {
  const config = await window.cari.config();
  if (!config.mediaPipeModelPath) {
    setTracking("MediaPipe disabled — set CARI_MEDIAPIPE_MODEL_PATH");
    return;
  }

  faceTracker?.close();
  faceTracker = new FaceTracker({ modelPath: config.mediaPipeModelPath });
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
    ui.model.textContent = `avatar load failed: ${error.message}`;
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
  if (event.type === "error") {
    showStatus(`Native error: ${event.message}`);
  } else if (event.type === "log") {
    console.debug("[native]", event.message);
  } else if (event.type === "exit") {
    showStatus(`Native engine exited (code ${event.code ?? "?"})`);
    refresh();
  } else if (event.ok === false) {
    showStatus(event.message || "Native command failed");
  } else if (event.ok === true) {
    showStatus(event.message || "Native command accepted");
  }
});

document.querySelector("#start").onclick = async () => {
  const result = await controller.start();
  showStatus(result.error || "Native engine started");
  await refresh();
};

document.querySelector("#stop").onclick = async () => {
  await controller.stop();
  await stopCamera();
  showStatus("Native engine stopped");
  await refresh();
};

document.querySelector("#capture").onclick = async () => {
  const result = await controller.captureStart("window");
  showStatus(result.ok ? result.message : result.error);
};

document.querySelector("#record").onclick = async () => {
  const result = await controller.outputStart("local-record");
  showStatus(result.ok ? result.message : result.error);
};


document.querySelector("#obs-connect").onclick = async () => {
  try {
    const result = await window.cari.native.obs.connect({});
    showStatus(`OBS connected: ${result.obsWebSocketVersion || "ready"}`);
  } catch (error) {
    showStatus(`OBS connection failed: ${error.message}`);
  }
};

document.querySelector("#obs-start").onclick = async () => {
  try {
    await window.cari.native.obs.startStream();
    showStatus("OBS stream started");
  } catch (error) {
    showStatus(`OBS start failed: ${error.message}`);
  }
};

document.querySelector("#obs-stop").onclick = async () => {
  try {
    await window.cari.native.obs.stopStream();
    showStatus("OBS stream stopped");
  } catch (error) {
    showStatus(`OBS stop failed: ${error.message}`);
  }
};

document.querySelector("#camera-start").onclick = async () => {
  try {
    await startCamera();
    if (!faceTracker) await configureTracking();
  } catch (error) {
    showStatus(`Camera error: ${error.message}`);
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
renderer.render();
