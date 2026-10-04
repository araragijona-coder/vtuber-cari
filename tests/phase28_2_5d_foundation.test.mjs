import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadFoundation() {
  const files = [
    "intento_2/webapp/js/scene/world_space.js",
    "intento_2/webapp/js/scene/camera.js",
    "intento_2/webapp/js/scene/animation.js",
    "intento_2/webapp/js/scene/actor.js",
    "intento_2/webapp/js/scene/scene.js",
    "intento_2/webapp/js/scene/renderer.js",
    "intento_2/webapp/js/scene/presentation_events.js"
  ];
  const source = await Promise.all(files.map((path) => readFile(path, "utf8")));
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math, Number, String, Object, Array, Map, Set, JSON
  });
  for (let i = 0; i < source.length; i += 1) {
    vm.runInContext(source[i], context, { filename: files[i] });
  }
  return context.window;
}

test("Phase 28 world-space actor supports x/y/z/scale/rotation/state and camera projection", async () => {
  const win = await loadFoundation();
  const actor = win.MachGirlsActor.create({
    id: "scene:PLAYER",
    role: "PLAYER",
    layer: "ACTORS",
    transform: { x: 300, y: 350, z: 0.7, scale: 1.1, rotation: 0.1, state: "IDLE" }
  });
  assert.equal(actor.transform.x, 300);
  assert.equal(actor.transform.y, 350);
  assert.equal(actor.transform.z, 0.7);
  assert.equal(actor.transform.scale, 1.1);
  assert.equal(actor.transform.rotation, 0.1);
  assert.equal(actor.transform.state, "IDLE");
  assert.equal(actor.transform.visible, true);
  assert.equal(actor.transform.anchor, "CENTER");
  assert.equal(actor.transform.assetRef, null);

  const camera = win.MachGirlsSceneCamera.create({ x: 300, y: 350, zoom: 1 });
  const projected = win.MachGirlsWorldSpace.worldToScreen(actor.transform, camera.getState(), { width: 1200, height: 700 });
  assert.equal(Math.round(projected.x), 600);
  assert.equal(Math.round(projected.y), 350);
  assert.ok(projected.scale < actor.transform.scale);
});

test("Phase 28 scene registers independent actors and sorts by layer then depth", async () => {
  const win = await loadFoundation();
  const scene = win.MachGirlsScene.create();
  const far = win.MachGirlsActor.create({ id: "far", role: "ALLY", layer: "ACTORS", transform: { x: 800, y: 300, z: 0.2 } });
  const near = win.MachGirlsActor.create({ id: "near", role: "ENEMY", layer: "ACTORS", transform: { x: 900, y: 300, z: 0.9 } });
  assert.equal(scene.registerActor(far), true);
  assert.equal(scene.registerActor(near), true);
  const renderables = scene.renderables();
  assert.deepEqual(Array.from(renderables, (item) => item.actor.id), ["far", "near"]);
  assert.equal(scene.removeActor("far"), true);
  assert.equal(scene.getActor("far"), null);
});

test("Phase 28 actor animation transitions are presentation-only and deterministic", async () => {
  const win = await loadFoundation();
  const actor = win.MachGirlsActor.create({ id: "player", role: "PLAYER", transform: { state: "IDLE" } });
  assert.equal(actor.getAnimationState(), "IDLE");
  assert.equal(actor.setState("MOVE", 10), "MOVE");
  assert.equal(actor.setState("ATTACK", 20), "ATTACK");
  assert.equal(actor.setState("HIT", 30), "HIT");
  assert.equal(actor.getAnimationState(), "HIT");
  assert.equal(actor.setState("BURST", 40), "HIT");
});

test("Phase 28 camera interpolates independently from gameplay", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 600, y: 350 });
  camera.setTarget({ x: 840, y: 320, zoom: 1.2, offsetX: 12, offsetY: -8, durationMs: 100, name: "PLAYER_FOCUS" }, 0);
  const at0 = camera.update(0);
  const at100 = camera.update(100);
  assert.ok(at100.zoom > at0.zoom);
  assert.equal(at100.active, "PLAYER_FOCUS");
  assert.equal(at100.x, 840);
  assert.equal(at100.y, 320);
});

test("Phase 28 renderer lifecycle applies one camera transform and restores context", async () => {
  const win = await loadFoundation();
  const calls = [];
  const context = {
    save() { calls.push("save"); },
    restore() { calls.push("restore"); },
    translate(...args) { calls.push(["translate", ...args]); },
    scale(...args) { calls.push(["scale", ...args]); }
  };
  const camera = win.MachGirlsSceneCamera.create({ x: 600, y: 350 });
  const renderer = win.MachGirlsSceneRenderer.create({ context, camera });
  const scene = win.MachGirlsScene.create({ camera });
  const actor = win.MachGirlsActor.create({ id: "a", role: "PLAYER", layer: "ACTORS", transform: { x: 600, y: 350, z: 0.7 } });
  scene.registerActor(actor);
  let drawn = 0;
  assert.equal(renderer.render(scene, { width: 1200, height: 700 }, () => { drawn += 1; }, 0), true);
  assert.equal(drawn, 1);

  let frameDrawn = false;
  assert.equal(renderer.renderFrame(scene, { width: 1200, height: 700 }, () => { frameDrawn = true; }, 0), true);
  assert.equal(frameDrawn, true);
  assert.equal(calls.filter((item) => item === "save").length, 2);
  assert.equal(calls.filter((item) => item === "restore").length, 2);
  assert.equal(calls[0], "save");
  assert.equal(calls.at(-1), "restore");
});

test("Phase 28 presentation event bridge maps gameplay actions without owning combat rules", async () => {
  const win = await loadFoundation();
  const bridge = win.MachGirlsPresentationEvents.create();
  assert.equal(bridge.fromAction({ actionType: "AUTO_ATTACK" }).type, "ATTACK");
  assert.equal(bridge.fromAction({ damage: 10 }).type, "IMPACT");
  assert.equal(bridge.fromAction({ broke: true }).type, "BREAK");
  assert.equal(bridge.fromAction({ actionType: "BURST" }).type, "BURST");
  assert.equal(bridge.fromAction({ outcome: "VICTORY" }).type, "VICTORY");
});

test("Phase 28 combat keeps exactly one RAF owner", async () => {
  const combat = await readFile("intento_2/webapp/js/combat.js", "utf8");
  const requestAnimationFrameCalls = combat.match(/requestAnimationFrame\(/g) || [];
  assert.equal(requestAnimationFrameCalls.length, 2);
  assert.equal((combat.match(/function startMainLoop\(/g) || []).length, 1);
  assert.equal((combat.match(/function frame\(/g) || []).length, 1);
  assert.match(combat, /function startMainLoop\(/);
  assert.doesNotMatch(combat, /function startSimulation\(/);
  assert.doesNotMatch(combat, /cancelAnimationFrame/);
});

test("Phase 28 does not create alternate combat, card, Energy, save or gameplay systems", async () => {
  const [foundation, presentation] = await Promise.all([
    readFile("intento_2/webapp/js/scene/renderer.js", "utf8"),
    readFile("intento_2/webapp/js/combat_presentation.js", "utf8")
  ]);
  for (const forbidden of ["CombatEngine", "CombatClock", "EnergySystem", "SaveManager", "GameState.startBattle"]) {
    assert.equal(foundation.includes(forbidden), false, forbidden);
  }
  assert.match(presentation, /MachGirlsSceneRenderer/);
  assert.match(presentation, /MachGirlsSceneCamera/);
  assert.match(presentation, /MachGirlsActor/);
  assert.match(presentation, /renderFrame/);
  assert.doesNotMatch(presentation, /function applyCamera\(/);
});

test("Phase 28 player foundation carries motorcycle and shadow as composition children", async () => {
  const win = await loadFoundation();
  const actor = win.MachGirlsActor.create({
    id: "scene:PLAYER",
    role: "PLAYER",
    transform: { x: 600, y: 400, z: 0.7, scale: 1, state: "IDLE" }
  });
  actor.attachChild(win.MachGirlsActor.create({
    id: "scene:PLAYER:MOTORCYCLE",
    role: "MOTORCYCLE",
    transform: { x: 0, y: 18, z: 0, scale: 0.82, state: "IDLE", assetRef: "player.motorcycle" }
  }));
  actor.attachChild(win.MachGirlsActor.create({
    id: "scene:PLAYER:SHADOW",
    role: "SHADOW",
    transform: { x: 0, y: 20, z: 0, scale: 1, state: "IDLE" }
  }));
  const snapshot = actor.getSnapshot();
  assert.deepEqual(Array.from(snapshot.children, (child) => child.id), [
    "scene:PLAYER:MOTORCYCLE",
    "scene:PLAYER:SHADOW"
  ]);
});
