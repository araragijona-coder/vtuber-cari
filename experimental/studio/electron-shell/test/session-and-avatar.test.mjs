import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function loadModule(relativePath) {
  const source = await fs.readFile(path.join(root, relativePath), "utf8");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-contract-"));
  const tempFile = path.join(tempRoot, path.basename(relativePath, ".js") + ".mjs");
  await fs.writeFile(tempFile, source, "utf8");
  if (relativePath === "runtime/session-manager.js") {
    const dependency = await fs.readFile(
      path.join(root, "runtime/resource-policy.mjs"),
      "utf8"
    );
    await fs.writeFile(path.join(tempRoot, "resource-policy.mjs"), dependency, "utf8");
  }
  return import(pathToFileURL(tempFile).href);
}

const { StudioSessionManager } = await loadModule("runtime/session-manager.js");
const { AudioLipSync } = await loadModule("avatar/audio-lipsync.js");
async function loadActionStore() {
  const source = await fs.readFile(
    path.join(root, "avatar/action-store.js"),
    "utf8"
  );
  const contract = await fs.readFile(
    path.join(root, "avatar/avatar-contract.js"),
    "utf8"
  );
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-actions-"));
  await fs.writeFile(path.join(tempRoot, "action-store.mjs"), source, "utf8");
  await fs.writeFile(path.join(tempRoot, "avatar-contract.js"), contract, "utf8");
  return import(pathToFileURL(path.join(tempRoot, "action-store.mjs")).href);
}

const {
  normalizeAvatarState,
  normalizeExpression,
  clamp01,
  normalizeSigned,
  toRenderParameters
} = await loadModule("avatar/avatar-contract.js");

function makeNative(responses = {}) {
  const calls = [];
  let running = false;

  return {
    calls,
    async start() {
      calls.push(["start"]);
      running = true;
      return { running: true, pid: 42 };
    },
    async stop() {
      calls.push(["stop"]);
      running = false;
      return { ok: true };
    },
    async status() {
      calls.push(["status"]);
      return { running, pid: running ? 42 : null };
    },
    async send(command) {
      calls.push(["send", command]);
      const key = command.type + ":" + (command.source || command.profile || command.effect || "");
      const response = responses[key] ?? responses[command.type] ?? { ok: true, message: command.type + "=started" };
      return { ...response, id: command.id };
    }
  };
}

test("session manager serializes output startup and remembers selected source", async () => {
  const native = makeNative({
    "capture.start:screen": { ok: true, message: "capture=started" },
    "audio.start": { ok: true, message: "audio=started" },
    "output.start:local-record": { ok: true, message: "output=started" }
  });
  const session = new StudioSessionManager(native);

  const capture = await session.captureStart("screen");
  assert.equal(capture.ok, true);
  assert.equal(session.snapshot().source, "screen");

  const output = await session.outputStart("local-record");
  assert.equal(output.ok, true);

  const captureCall = native.calls.find(call =>
    call[0] === "send" && call[1].type === "capture.start" &&
    call[1].source === "screen"
  );
  assert.ok(captureCall);
  assert.equal(session.snapshot().output, true);
});

test("session manager sends the selected native window index", async () => {
  const native = makeNative({
    "capture.start:window": { ok: true, message: "capture=started" }
  });
  const session = new StudioSessionManager(native);

  const result = await session.captureStart("window", 4);
  assert.equal(result.ok, true);
  assert.equal(session.snapshot().windowIndex, 4);

  const captureCall = native.calls.find(call =>
    call[0] === "send" && call[1].type === "capture.start"
  );
  assert.ok(captureCall);
  assert.equal(captureCall[1].window_index, 4);
});

test("session manager routes a native camera source and keeps its index separate", async () => {
  const native = makeNative({
    "capture.start:camera": { ok: true, message: "capture=started" }
  });
  const session = new StudioSessionManager(native);

  const result = await session.captureStart("camera", 2);
  assert.equal(result.ok, true);
  assert.equal(session.snapshot().source, "camera");
  assert.equal(session.snapshot().cameraIndex, 2);
  assert.equal(session.snapshot().windowIndex, 0);

  const captureCall = native.calls.find(call =>
    call[0] === "send" && call[1].type === "capture.start"
  );
  assert.ok(captureCall);
  assert.equal(captureCall[1].source, "camera");
  assert.equal(captureCall[1].camera_index, 2);
  assert.equal(captureCall[1].window_index, -1);
});




test("session manager rolls back resources it started when output fails", async () => {
  const native = makeNative({
    "capture.start:window": { ok: true, message: "capture=started" },
    "audio.start": { ok: true, message: "audio=started" },
    "output.start:rtmp": { ok: false, error: "encoder unavailable" }
  });
  const session = new StudioSessionManager(native);

  const result = await session.outputStart("rtmp", "rtmps://example.invalid/live/key");
  assert.equal(result.ok, false);
  assert.equal(session.snapshot().capture, false);
  assert.equal(session.snapshot().audio, false);
  assert.equal(session.snapshot().output, false);

  const stopTypes = native.calls
    .filter(call => call[0] === "send")
    .map(call => call[1].type);
  assert.ok(stopTypes.includes("capture.stop"));
  assert.ok(stopTypes.includes("audio.stop"));
});

test("stop-only commands never start an offline engine", async () => {
  const native = makeNative();
  const session = new StudioSessionManager(native);

  const result = await session.captureStop();
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.deepEqual(native.calls, []);
});

test("microphone gate starts audio only when enabling", async () => {
  const native = makeNative({
    "audio.start": { ok: true, message: "audio=started" },
    "microphone.set": { ok: true, message: "microphone=on" }
  });
  const session = new StudioSessionManager(native);

  const result = await session.microphoneSet(true);
  assert.equal(result.ok, true);
  assert.equal(session.snapshot().audio, true);
  assert.equal(session.snapshot().microphone, true);

  const micCall = native.calls.find(call =>
    call[0] === "send" && call[1].type === "microphone.set"
  );
  assert.ok(micCall);
  assert.equal(micCall[1].enabled, true);
});

test("voice configuration does not spawn an idle native engine", async () => {
  const native = makeNative();
  const session = new StudioSessionManager(native);

  const result = await session.setVoiceEffect("anime-bright");
  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(session.snapshot().voice, "anime-bright");
  assert.deepEqual(native.calls, []);
});

test("output stop releases capture/audio owned by the output", async () => {
  const native = makeNative({
    "capture.start:window": { ok: true, message: "capture=started" },
    "audio.start": { ok: true, message: "audio=started" },
    "output.start:local-record": { ok: true, message: "output=started" },
    "output.stop": { ok: true, message: "output=stopped" },
    "capture.stop": { ok: true, message: "capture=stopped" },
    "audio.stop": { ok: true, message: "audio=stopped" }
  });
  const session = new StudioSessionManager(native);

  const output = await session.outputStart("local-record");
  assert.equal(output.ok, true);
  assert.equal(session.snapshot().output, true);
  assert.equal(session.snapshot().captureOwnedByOutput, true);
  assert.equal(session.snapshot().audioOwnedByOutput, true);

  const stopped = await session.outputStop();
  assert.equal(stopped.ok, true);
  assert.equal(session.snapshot().output, false);
  assert.equal(session.snapshot().capture, false);
  assert.equal(session.snapshot().audio, false);
  assert.equal(session.snapshot().engine, false);
  assert.equal(session.snapshot().captureOwnedByOutput, false);
  assert.equal(session.snapshot().audioOwnedByOutput, false);

  const sentTypes = native.calls
    .filter(call => call[0] === "send")
    .map(call => call[1].type);
  assert.deepEqual(sentTypes, [
    "capture.start",
    "audio.start",
    "output.start",
    "output.stop",
    "capture.stop",
    "audio.stop"
  ]);
  assert.equal(native.calls.filter(call => call[0] === "stop").length, 1);
});

test("Cari action store exposes only canonical runtime actions", async () => {
  const { AvatarActionStore } = await loadActionStore();
  const storage = {
    value: null,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; }
  };
  const store = new AvatarActionStore(storage);
  const actions = store.list();

  assert.deepEqual(
    actions.map(action => action.id),
    [
      "neutral",
      "happy",
      "sad",
      "angry",
      "afraid",
      "embarrassed",
      "exhausted",
      "confused",
      "talking",
      "silent"
    ]
  );
  assert.equal(actions.find(action => action.id === "sad").expression, "sad");
  assert.equal(actions.find(action => action.id === "afraid").expression, "afraid");
  assert.equal(actions.find(action => action.id === "exhausted").expression, "exhausted");
});

test("avatar contract clamps unsafe values and keeps the renderer contract stable", () => {
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(-1), 0);
  assert.equal(normalizeSigned(4), 1);
  assert.equal(normalizeSigned(-4), -1);
  assert.equal(normalizeExpression("unknown"), "neutral");

  const state = normalizeAvatarState(undefined, {
    expression: "happy",
    mouthOpen: 2,
    blink: -1,
    head: { x: 3, y: -3, z: 0.25 },
    gaze: { x: 2, y: -2 }
  });

  assert.deepEqual(state, {
    expression: "happy",
    mouthOpen: 1,
    blink: 0,
    head: { x: 1, y: -1, z: 0.25 },
    gaze: { x: 1, y: -1 }
  });

  assert.deepEqual(toRenderParameters(state), {
    headYaw: 1,
    headPitch: -1,
    headRoll: 0.25,
    eyeX: 1,
    eyeY: -1,
    mouthOpen: 1,
    blink: 0,
    expression: "happy"
  });
});


test("audio lip sync maps local amplitude to the existing avatar mouth state", () => {
  const state = {
    mouthOpen: 0,
    expression: "neutral",
    blink: 0,
    head: { x: 0, y: 0, z: 0 },
    gaze: { x: 0, y: 0 }
  };
  const actingStub = {
    set(partial) {
      state.mouthOpen = Math.max(0, Math.min(1, Number(partial.mouthOpen) || 0));
    }
  };

  const lipSync = new AudioLipSync(actingStub, {
    floor: 0.1,
    gain: 2,
    attack: 1,
    release: 1
  });

  assert.equal(lipSync.update(0.05), 0);
  assert.equal(lipSync.update(0.35), 0.5);
  assert.equal(state.mouthOpen, 0.5);
  assert.equal(lipSync.update(0), 0);
  lipSync.reset();
  assert.equal(state.mouthOpen, 0);
});
