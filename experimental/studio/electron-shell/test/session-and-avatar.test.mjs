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
  return import(pathToFileURL(tempFile).href);
}

const { StudioSessionManager } = await loadModule("runtime/session-manager.js");
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
