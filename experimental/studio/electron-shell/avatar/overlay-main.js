import { ThreeAvatarRenderer } from "./three-avatar.js";
import { normalizeAvatarAsset, validateAvatarAsset } from "./asset-registry.js";

const canvas = document.querySelector("#canvas");
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

function applyActionFrame(state) {
  const image = document.querySelector("#action-frame");
  if (!image) return;

  const url = state?.url || state?.dataUrl || "";
  if (!url) {
    image.hidden = true;
    image.removeAttribute("src");
    return;
  }

  image.hidden = false;
  image.src = url;
  image.style.opacity = String(state.opacity ?? 1);
  image.style.transform =
    "translate(calc(-50% + " + (state.offsetX ?? 0) +
    "%), calc(-50% + " + (state.offsetY ?? 0) +
    "%)) scale(" + (state.scale ?? 1) + ")";
}

window.cariAvatar.onState(applyState);
window.cariAvatar.onActionFrame(applyActionFrame);
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
