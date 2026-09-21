import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadModule(relativePath, replacements = []) {
  const source = await fs.readFile(path.join(root, relativePath), "utf8");
  let transformed = source;
  for (const [from, to] of replacements) transformed = transformed.replaceAll(from, to);
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-action-integration-"));
  const filename = path.basename(relativePath).replace(/\.js$/, ".mjs");
  await fs.writeFile(path.join(tempRoot, filename), transformed, "utf8");
  return import(pathToFileURL(path.join(tempRoot, filename)).href);
}

const { Avatar2DFramePlayer, StudioActionRouter } = await loadModule("avatar/action-runtime.js");
const { SpeechActivityDetector } = await loadModule("avatar/speech-activity.js");

const actions = [
  { id: "neutral", label: "Neutral", expression: "neutral", durationMs: 80, loop: true,
    frames: [{ id: "n0", url: "file:///neutral0.png" }, { id: "n1", url: "file:///neutral1.png" }] },
  { id: "happy", label: "Feliz", expression: "happy", durationMs: 80, loop: false,
    frames: [{ id: "h0", url: "file:///happy.png" }] },
  { id: "talking", label: "Hablar", expression: "neutral", durationMs: 80, loop: true,
    frames: [{ id: "t0", url: "file:///open.png" }, { id: "t1", url: "file:///closed.png" }] },
  { id: "silent", label: "Callar", expression: "neutral", durationMs: 80, loop: false,
    frames: [{ id: "s0", url: "file:///closed.png" }] }
];

function makeStore() {
  return {
    list: () => actions.map(action => ({ ...action, frames: action.frames.map(frame => ({ ...frame })) })),
    get: id => {
      const action = actions.find(item => item.id === id);
      return action ? { ...action, frames: action.frames.map(frame => ({ ...frame })) } : null;
    }
  };
}

test("chat and Twitch events reach the 2D frame renderer", () => {
  const store = makeStore();
  const rendered = [];
  const player = new Avatar2DFramePlayer({
    store,
    renderFrame: (action, index) => rendered.push([action?.id || null, index]),
    timerFactory: () => 1,
    clearTimer: () => undefined
  });
  const router = new StudioActionRouter({ actionStore: store, player });

  router.setManualAction("neutral");
  assert.deepEqual(rendered.at(-1), ["neutral", 0]);

  const chat = router.handleEvent({ type: "twitch.chat", text: "!happy" });
  assert.deepEqual(chat, { kind: "chat", action: "happy" });
  assert.deepEqual(rendered.at(-1), ["happy", 0]);

  const event = router.handleEvent({
    type: "twitch.event",
    eventType: "channel.subscribe",
    payload: { user_name: "viewer" }
  });
  assert.deepEqual(event, { kind: "event", action: "happy" });
  assert.equal(player.currentAction().id, "happy");
});

test("VAD hysteresis drives talking/silent PNG actions without restarting unchanged state", () => {
  let now = 0;
  const store = makeStore();
  const player = new Avatar2DFramePlayer({
    store,
    renderFrame: () => undefined,
    timerFactory: () => 1,
    clearTimer: () => undefined,
    now: () => now
  });
  const router = new StudioActionRouter({ actionStore: store, player });
  const vad = new SpeechActivityDetector({
    startThreshold: 0.2,
    stopThreshold: 0.1,
    holdMs: 100,
    attack: 1,
    release: 1
  });

  let voice = vad.update(0.05, now);
  assert.equal(router.setVoiceActivity({ speaking: voice.speaking, active: true }), true);
  assert.equal(player.currentAction().id, "silent");

  now = 10;
  voice = vad.update(0.4, now);
  assert.equal(router.setVoiceActivity({ speaking: voice.speaking, active: true }), true);
  assert.equal(player.currentAction().id, "talking");

  now = 20;
  voice = vad.update(0.3, now);
  assert.equal(router.setVoiceActivity({ speaking: voice.speaking, active: true }), false);

  now = 150;
  voice = vad.update(0.02, now);
  assert.equal(router.setVoiceActivity({ speaking: voice.speaking, active: true }), true);
  assert.equal(player.currentAction().id, "silent");

  router.setVoiceActivity({ active: false, speaking: false });
  assert.equal(player.currentSource(), "base");
});

console.log("2D action + Twitch/VAD integration smoke: PASS");
