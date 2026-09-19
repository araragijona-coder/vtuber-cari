import { ThreeAvatarRenderer } from "../avatar/three-avatar.js";
import { AvatarActingBridge } from "../avatar/acting-bridge.js";

const canvas = document.querySelector("#avatar");
const status = document.querySelector("#status");
const engine = document.querySelector("#engine");
const tracking = document.querySelector("#tracking");
const acting = new AvatarActingBridge();
const renderer = new ThreeAvatarRenderer(canvas);

function send(command) {
  return window.cari.native.send(command);
}

function showStatus(message) {
  status.textContent = message;
}

window.cari.native.onEvent(event => {
  if (event.type === "error") showStatus(`Native error: ${event.message}`);
  else if (event.type === "exit") {
    showStatus(`Native engine exited (code ${event.code ?? "?"})`);
    refresh();
  } else if (event.type === "status") {
    showStatus(`Native: ${event.state || "ready"}`);
  }
});

acting.subscribe(state => {
  renderer.apply(acting.toRenderParameters());
  renderer.render();
  document.querySelector("#render").textContent = state.expression;
});

async function refresh() {
  const state = await window.cari.native.status();
  engine.textContent = state.running ? `running (PID ${state.pid})` : "offline";
}

document.querySelector("#start").onclick = async () => {
  const result = await window.cari.native.start();
  showStatus(result.error || "Native engine started");
  await refresh();
};

document.querySelector("#stop").onclick = async () => {
  await window.cari.native.stop();
  showStatus("Native engine stopped");
  await refresh();
};

document.querySelector("#capture").onclick = async () => {
  const result = await send({ type: "capture.start", source: "window" });
  showStatus(result.ok ? "Capture command sent" : result.error);
  tracking.textContent = result.ok ? "capture requested" : "error";
};

document.querySelector("#record").onclick = async () => {
  const result = await send({ type: "output.start", profile: "local-record" });
  showStatus(result.ok ? "Local record command sent" : result.error);
};

document.querySelector("#neutral").onclick = () => acting.set({ expression: "neutral" });
document.querySelector("#happy").onclick = () => acting.set({ expression: "happy" });
document.querySelector("#angry").onclick = () => acting.set({ expression: "angry" });

await refresh();
renderer.render();
