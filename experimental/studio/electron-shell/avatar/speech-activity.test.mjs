import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-speech-"));
const source = await fs.readFile(path.join(root, "avatar", "speech-activity.js"), "utf8");
const file = path.join(tempRoot, "speech-activity.mjs");
await fs.writeFile(file, source, "utf8");
const { SpeechActivityDetector } = await import(pathToFileURL(file).href);

test("speech detector uses hysteresis and hold time", () => {
  const detector = new SpeechActivityDetector({
    startThreshold: 0.5,
    stopThreshold: 0.25,
    holdMs: 100,
    attack: 1,
    release: 1
  });

  assert.equal(detector.update(0.2, 0).speaking, false);
  assert.equal(detector.update(0.6, 10).speaking, true);
  assert.equal(detector.update(0.1, 50).speaking, true);
  assert.equal(detector.update(0.1, 109).speaking, true);
  assert.equal(detector.update(0.1, 111).speaking, false);
});

test("speech detector resets completely", () => {
  const detector = new SpeechActivityDetector({ attack: 1, release: 1 });
  detector.update(1, 1);
  assert.equal(detector.speaking, true);
  detector.reset();
  assert.equal(detector.level, 0);
  assert.equal(detector.speaking, false);
  assert.equal(detector.lastAboveThresholdAt, -Infinity);
});
