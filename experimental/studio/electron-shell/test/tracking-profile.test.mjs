import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadTrackingProfile() {
  const source = await fs.readFile(
    path.join(root, "avatar", "tracking-profile.js"),
    "utf8"
  );
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-tracking-"));
  const tempFile = path.join(tempRoot, "tracking-profile.mjs");
  await fs.writeFile(tempFile, source, "utf8");
  return import(pathToFileURL(tempFile).href);
}

const {
  TrackingProfileController,
  normalizeTrackingProfile
} = await loadTrackingProfile();

test("tracking profile clamps unsafe configuration", () => {
  const profile = normalizeTrackingProfile({
    headGain: 99,
    smoothing: -1,
    deadzone: 99,
    calibrationSamples: 1
  });

  assert.equal(profile.headGain, 2);
  assert.equal(profile.smoothing, 0.08);
  assert.equal(profile.deadzone, 0.15);
  assert.equal(profile.calibrationSamples, 10);
});

test("tracking calibration centers head, gaze and mouth", () => {
  const tracking = new TrackingProfileController({
    smoothing: 1,
    deadzone: 0,
    mouthGain: 1,
    calibrationSamples: 10
  });

  const neutral = {
    head: { x: 0.10, y: -0.05, z: 0.02 },
    gaze: { x: 0.20, y: -0.10 },
    mouthOpen: 0.02,
    blink: 0.03
  };

  tracking.beginCalibration();
  for (let i = 0; i < 10; i += 1) {
    tracking.addCalibrationSample(neutral);
  }

  assert.equal(tracking.calibrationState().calibrated, true);

  const result = tracking.apply({
    head: { x: 0.30, y: 0.05, z: 0.02 },
    gaze: { x: 0.40, y: 0.10 },
    mouthOpen: 0.60,
    blink: 0.40
  });

  assert.ok(Math.abs(result.head.x - 0.20) < 0.001);
  assert.ok(Math.abs(result.gaze.x - 0.20) < 0.001);
  assert.ok(Math.abs(result.mouthOpen - 0.58) < 0.001);
  assert.equal(result.blink, 0.4);
});

test("tracking loss uses grace period then fades to neutral", () => {
  const tracking = new TrackingProfileController({
    smoothing: 1,
    deadzone: 0,
    lostGraceFrames: 2,
    lossFadeFrames: 2
  });

  tracking.statusValue = "tracking";
  tracking.apply({
    head: { x: 0.5, y: 0, z: 0 },
    gaze: { x: 0.4, y: 0 },
    mouthOpen: 0.7,
    blink: 0
  });

  const grace1 = tracking.onLost();
  const grace2 = tracking.onLost();
  assert.equal(grace1.status, "lost-grace");
  assert.equal(grace2.status, "lost-grace");

  const fading = tracking.onLost();
  assert.equal(fading.status, "lost");
  assert.ok(fading.head.x < 0.5);

  tracking.onLost();
  const neutral = tracking.onLost();
  assert.equal(neutral.head.x, 0);
  assert.equal(neutral.gaze.x, 0);
  assert.equal(neutral.mouthOpen, 0);
});
