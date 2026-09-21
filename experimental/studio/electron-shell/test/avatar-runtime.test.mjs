import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadPaired(entry, dependencies = []) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-avatar-runtime-"));
  const source = await fs.readFile(path.join(root, entry), "utf8");
  const entryName = path.basename(entry).replace(/\.js$/, ".mjs");
  await fs.writeFile(path.join(tempRoot, entryName), source, "utf8");

  for (const dependency of dependencies) {
    await fs.copyFile(
      path.join(root, dependency),
      path.join(tempRoot, path.basename(dependency))
    );
  }

  return import(pathToFileURL(path.join(tempRoot, entryName)).href);
}

const { AvatarActingBridge } = await loadPaired(
  "avatar/acting-bridge.js",
  ["avatar/avatar-contract.js"]
);
const { AvatarActivityController } = await loadPaired("avatar/activity-motion.js");
const { SpeechActivityDetector } = await loadPaired("avatar/speech-activity.js");

test("acting bridge composes face and speech mouth sources without clobbering each other", () => {
  const acting = new AvatarActingBridge();

  acting.setFace({
    mouthOpen: 0.20,
    head: { x: 0.1, y: 0.2, z: 0.3 }
  });
  assert.equal(acting.state.mouthOpen, 0.20);

  acting.setSpeech({
    mouthOpen: 0.75,
    speaking: true,
    level: 0.60
  });
  assert.equal(acting.state.mouthOpen, 0.75);
  assert.equal(acting.state.speaking, true);

  acting.clearSpeech();
  assert.equal(acting.state.mouthOpen, 0.20);
  assert.equal(acting.state.speaking, false);

  acting.setManualMouth(0.90);
  assert.equal(acting.state.mouthOpen, 0.90);
  acting.setManualMouth(null);
  assert.equal(acting.state.mouthOpen, 0.20);

  acting.setManualMouth(0.25);
  assert.equal(acting.state.mouthOpen, 0.25);
  acting.setSpeech({ mouthOpen: 0.80, speaking: true, level: 0.80 });
  assert.equal(acting.state.mouthOpen, 0.80);
  acting.setManualMouth(0, { mode: "hard" });
  assert.equal(acting.state.mouthOpen, 0);
  acting.setManualMouth(null);
});

test("activity controller provides idle, keyboard, controller and phone modes", () => {
  const activity = new AvatarActivityController({ idleAfterMs: 1800 });
  assert.equal(activity.current(0), "idle");

  activity.markKeyboard(100);
  assert.equal(activity.current(500), "keyboard");
  assert.equal(activity.current(1900), "idle");

  activity.markController(2000);
  assert.equal(activity.current(2500), "controller");
  assert.equal(activity.current(3900), "idle");

  assert.equal(activity.setManual("phone"), "phone");
  assert.equal(activity.current(10000), "phone");

  activity.clearManual();
  assert.equal(activity.current(10000), "idle");

  activity.setManual("idle");
  assert.equal(activity.current(10000), "idle");
});

test("speech activity detector uses hysteresis and a short hold", () => {
  const detector = new SpeechActivityDetector({
    startThreshold: 0.20,
    stopThreshold: 0.10,
    holdMs: 100,
    attack: 1,
    release: 1
  });

  assert.equal(detector.update(0.05, 0).speaking, false);
  assert.equal(detector.update(0.30, 10).speaking, true);
  assert.equal(detector.update(0.15, 20).speaking, true);
  assert.equal(detector.update(0.05, 50).speaking, true);
  assert.equal(detector.update(0.05, 121).speaking, false);

  detector.reset();
  assert.equal(detector.update(0.40, 200).speaking, true);
});

console.log("Avatar runtime activity/speech smoke: PASS");
