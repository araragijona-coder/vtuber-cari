import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadRuntime() {
  const source = await fs.readFile(path.join(root, "avatar", "action-runtime.js"), "utf8");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-action-runtime-"));
  const file = path.join(tempRoot, "action-runtime.mjs");
  await fs.writeFile(file, source, "utf8");
  return import(pathToFileURL(file).href);
}

const { Avatar2DFramePlayer, StudioActionRouter } = await loadRuntime();

const actions = [
  { id: "neutral", label: "Neutral", expression: "neutral", durationMs: 100, loop: true, frames: [
    { id: "n0", name: "neutral-0", dataUrl: "data:image/png;base64,a" },
    { id: "n1", name: "neutral-1", dataUrl: "data:image/png;base64,b" }
  ]},
  { id: "happy", label: "Feliz", expression: "happy", durationMs: 100, loop: false, frames: [
    { id: "h0", name: "happy", dataUrl: "data:image/png;base64,c" }
  ]},
  { id: "angry", label: "Enojada", expression: "angry", durationMs: 100, loop: false, frames: [
    { id: "a0", name: "angry", dataUrl: "data:image/png;base64,d" }
  ]},
  { id: "talking", label: "Hablar", expression: "neutral", durationMs: 100, loop: true, frames: [
    { id: "t0", name: "mouth-open", dataUrl: "data:image/png;base64,e" },
    { id: "t1", name: "mouth-closed", dataUrl: "data:image/png;base64,f" }
  ]}
];

function makeStore() {
  return {
    list: () => actions.map(action => ({ ...action, frames: action.frames.map(frame => ({ ...frame })) })),
    get: id => {
      const found = actions.find(action => action.id === id);
      return found ? { ...found, frames: found.frames.map(frame => ({ ...frame })) } : null;
    }
  };
}

test("frame player loops frames deterministically", () => {
  let callback = null;
  const rendered = [];
  const player = new Avatar2DFramePlayer({
    store: makeStore(),
    renderFrame: (action, index) => rendered.push([action?.id || null, index]),
    timerFactory: cb => { callback = cb; return 1; },
    clearTimer: () => undefined
  });

  player.setBaseAction("neutral");
  assert.deepEqual(rendered.at(-1), ["neutral", 0]);
  assert.equal(typeof callback, "function");
  callback();
  assert.deepEqual(rendered.at(-1), ["neutral", 1]);
});

test("chat override expires back to the selected base action", () => {
  let now = 1000;
  const player = new Avatar2DFramePlayer({
    store: makeStore(),
    renderFrame: () => undefined,
    timerFactory: () => 1,
    clearTimer: () => undefined,
    now: () => now
  });

  player.setBaseAction("angry");
  assert.equal(player.trigger("happy", { source: "chat", priority: 80, holdMs: 500 }), true);
  assert.equal(player.currentAction().id, "happy");
  now = 1600;
  player.update(now);
  assert.equal(player.currentAction().id, "angry");
});

test("voice does not override a higher-priority chat action and returns after chat expires", () => {
  let now = 1000;
  const player = new Avatar2DFramePlayer({
    store: makeStore(),
    renderFrame: () => undefined,
    timerFactory: () => 1,
    clearTimer: () => undefined,
    now: () => now
  });
  const router = new StudioActionRouter({ actionStore: makeStore(), player });

  router.setManualAction("angry");
  router.trigger("happy", { source: "chat", holdMs: 1000, priority: 80 });
  router.setVoiceActivity({ speaking: true });
  assert.equal(player.currentSource(), "chat");
  assert.equal(player.currentAction().id, "happy");

  now = 2100;
  player.update(now);
  assert.equal(player.currentSource(), "voice");
  assert.equal(player.currentAction().id, "talking");

  router.setVoiceActivity({ speaking: false });
  assert.equal(player.currentSource(), "base");
  assert.equal(player.currentAction().id, "angry");
});

test("router maps chat commands and Twitch EventSub events", () => {
  const store = makeStore();
  const player = new Avatar2DFramePlayer({
    store,
    renderFrame: () => undefined,
    timerFactory: () => 1,
    clearTimer: () => undefined
  });
  const expressions = [];
  const router = new StudioActionRouter({
    actionStore: store,
    player,
    acting: { setManualExpression(value) { expressions.push(value); } }
  });

  assert.equal(router.handleChatMessage("!happy"), "happy");
  assert.equal(player.currentAction().id, "happy");
  assert.equal(router.handleTwitchEvent("channel.subscribe"), "happy");
  assert.ok(expressions.includes("happy"));
});
