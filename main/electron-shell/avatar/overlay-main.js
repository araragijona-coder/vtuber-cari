import { ThreeAvatarRenderer } from "./three-avatar.js";

const canvas = document.querySelector("#avatar");
const renderer = new ThreeAvatarRenderer(canvas);

function applyState(state) {
  renderer.apply(state || {});
  renderer.render();
}

try {
  const config = await window.cariAvatar.config();
  if (config?.avatarModelPath) {
    try {
      await renderer.load(config.avatarModelPath);
    } catch (error) {
      console.warn("Avatar model load failed; keeping placeholder:", error);
    }
  }
} catch (error) {
  console.warn("Avatar overlay config unavailable:", error);
}

window.cariAvatar.onState(applyState);
applyState({
  expression: "neutral",
  mouthOpen: 0,
  blink: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  eyeX: 0,
  eyeY: 0
});

window.addEventListener("beforeunload", () => renderer.dispose());
