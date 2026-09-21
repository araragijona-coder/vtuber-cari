import { ThreeAvatarRenderer } from "./three-avatar.js";
import { normalizeAvatarAsset, validateAvatarAsset } from "./asset-registry.js";

const canvas = document.querySelector("#avatar");
const renderer = new ThreeAvatarRenderer(canvas);

function applyState(state) {
  renderer.apply(state || {});
  renderer.render();
}

try {
  const config = await window.cariAvatar.config();
  const asset = normalizeAvatarAsset({
    url: config?.avatarModelPath,
    name: config?.avatarModelPath
  });
  const validation = validateAvatarAsset(asset);
  if (validation.valid && asset?.url) {
    try {
      await renderer.load(asset.url);
    } catch (error) {
      console.warn("Avatar model load failed; keeping placeholder:", error);
    }
  } else if (asset) {
    console.warn("Avatar model rejected:", validation.error);
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
