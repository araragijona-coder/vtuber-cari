import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await fs.readFile(
  path.join(root, "avatar/speech-activity.js"),
  "utf8"
);
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-speech-"));
const tempFile = path.join(tempRoot, "speech-activity.mjs");
await fs.writeFile(tempFile, source, "utf8");
const { SpeechActivityDetector } = await import(pathToFileURL(tempFile).href);

test("speech detector uses hysteresis and hold time", () => {
  const detector = new SpeechActivityDetector({
    startThreshold: 0.4,
    stopThreshold: 0.2,
    holdMs: 100,
    attack: 1,
    release: 1
  });

  assert.equal(detector.update(0.1, 0).speaking, false);
  assert.equal(detector.update(0.5, 10).speaking, true);
  assert.equal(detector.update(0.1, 80).speaking, true);
  assert.equal(detector.update(0.1, 150).speaking, false);
});

test("speech detector clamps noisy/invalid input", () => {
  const detector = new SpeechActivityDetector({
    attack: 1,
    release: 1
  });

  assert.equal(detector.update(9, 0).level, 1);
  assert.equal(detector.update("not-a-number", 10).level, 0);
});
