import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadActivity() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cari-activity-"));
  for (const relativePath of [
    "avatar/avatar-contract.js",
    "avatar/activity-presets.js",
    "avatar/activity-motion.js"
  ]) {
    const source = await fs.readFile(path.join(root, relativePath), "utf8");
    const target = path.join(dir, path.basename(relativePath, ".js") + ".js");
    await fs.writeFile(target, source, "utf8");
  }
  return import(pathToFileURL(path.join(dir, "activity-motion.js")).href);
}

const {
  AvatarActivityController,
  FULL_ACTIVITY_MODES
} = await loadActivity();

test("manual activity maps to object and arm pose without automation", () => {
  const controller = new AvatarActivityController({ autoEnabled: false });
  const state = controller.setManual("keyboard");

  assert.equal(state.mode, "manual");
  assert.equal(state.activity, "keyboard");
  assert.equal(state.object, "keyboard");
  assert.equal(state.arms, "keyboard");
  assert.equal(state.movementLevel, "normal");
});

test("automatic camera mode is deterministic and contains no microphone behavior", () => {
  const controller = new AvatarActivityController({ autoEnabled: true });
  const state = controller.setAutomatic("camera");

  assert.equal(state.mode, "camera-actions");
  assert.equal(controller.fullMode(), null);
  assert.equal(Object.prototype.hasOwnProperty.call(state, "microphone"), false);
});

test("full mode exposes the requested deterministic joystick scenario", () => {
  const controller = new AvatarActivityController();
  const state = controller.startFullMode("gaming-angry-happy");

  assert.equal(state.fullModeId, "gaming-angry-happy");
  assert.equal(state.object, "joystick");
  assert.equal(state.activity, "controller");
  assert.equal(state.movementLevel, "restless");
  assert.ok(FULL_ACTIVITY_MODES["gaming-angry-happy"].expressionCycle.includes("angry"));
  assert.ok(FULL_ACTIVITY_MODES["gaming-angry-happy"].expressionCycle.includes("happy"));
});

test("full keyboard and pillow modes select the expected object and pose", () => {
  const keyboard = new AvatarActivityController().startFullMode("keyboard-tired-focused");
  assert.equal(keyboard.object, "keyboard");
  assert.equal(keyboard.activity, "keyboard");

  const pillow = new AvatarActivityController().startFullMode("pillow-hug-sleeping");
  assert.equal(pillow.object, "pillow");
  assert.equal(pillow.arms, "hug");
  assert.equal(pillow.movementLevel, "quiet");
});

test("movement level remains constrained to quiet/normal/restless", () => {
  const controller = new AvatarActivityController();
  assert.equal(controller.setMovementLevel("quiet").movementLevel, "quiet");
  assert.equal(controller.setMovementLevel("normal").movementLevel, "normal");
  assert.equal(controller.setMovementLevel("restless").movementLevel, "restless");
  assert.equal(controller.setMovementLevel("invalid").movementLevel, "normal");
});

console.log("Cari activity/privacy smoke: PASS");
