import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/camera.js",
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/mesh_deformation.js",
  "intento_2/webapp/js/scene/procedural_motion.js",
  "intento_2/webapp/js/scene/lighting.js",
  "intento_2/webapp/js/scene/actor.js",
  "intento_2/webapp/js/scene/scene.js",
  "intento_2/webapp/js/scene/renderer.js"
];

async function loadFoundation() {
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math, Number, String, Object, Array, Map, Set, JSON
  });
  for (const file of FILES) {
    vm.runInContext(await readFile(file, "utf8"), context, { filename: file });
  }
  return context.window;
}

function host(value) {
  return {
    x: value.x,
    y: value.y,
    z: value.z,
    parallaxFactor: value.parallaxFactor,
    parallaxOffsetX: value.parallaxOffsetX,
    parallaxOffsetY: value.parallaxOffsetY
  };
}

function makeActor(win) {
  return win.MachGirlsActor.create({
    id: "vfx-actor",
    role: "PLAYER",
    layer: "ACTORS",
    transform: { x: 500, y: 300, z: 0.7 },
    layers: [
      { id: "body", assetId: "body", z: -0.25, mesh: { enabled: true, subdivisions: { x: 2, y: 2 } }, motion: { enabled: true, amplitude: 0.01, frequency: 1 } },
      { id: "front", assetId: "front", z: 0.5 }
    ]
  });
}

test("disabled VFX creates no active visual contribution", async () => {
  const win = await loadFoundation();
  const scene = win.MachGirlsScene.create();
  scene.addEffect("disabled", { type: "GLOW", scope: "ACTOR", actorId: "missing", durationMs: 100, visible: false });
  assert.equal(scene.renderables(10).length, 0);
});

test("enabled VFX produces an observable scene effect", async () => {
  const win = await loadFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = makeActor(win);
  scene.registerActor(actor);
  assert.equal(scene.addEffect("glow", {
    type: "GLOW",
    scope: "ACTOR",
    actorId: actor.id,
    layerId: "body",
    anchor: "CENTER",
    offset: { x: 20, y: -10 },
    intensity: 0.8,
    durationMs: 200,
    startTime: 100
  }), true);
  const effects = scene.renderables(150).filter((item) => item.type === "FX");
  assert.equal(effects.length, 1);
  assert.equal(effects[0].effect.type, "GLOW");
  assert.equal(effects[0].effect.intensity, 0.8);
});

test("same actor, layer, camera and VFX input produce deterministic projection", async () => {
  const win = await loadFoundation();
  const firstScene = win.MachGirlsScene.create({ camera: win.MachGirlsSceneCamera.create({ x: 500, y: 300 }) });
  const secondScene = win.MachGirlsScene.create({ camera: win.MachGirlsSceneCamera.create({ x: 500, y: 300 }) });
  const firstActor = makeActor(win);
  const secondActor = makeActor(win);
  firstScene.registerActor(firstActor);
  secondScene.registerActor(secondActor);
  const spec = { type: "IMPACT", scope: "ACTOR", layerId: "front", anchor: "CENTER", offset: { x: 12, y: -6 }, opacity: 0.9, durationMs: 300, startTime: 100 };
  firstScene.addEffect("impact", { ...spec, actorId: firstActor.id });
  secondScene.addEffect("impact", { ...spec, actorId: secondActor.id });
  const context = { save() {}, restore() {}, translate() {}, scale() {} };
  const renderer = win.MachGirlsSceneRenderer.create({ context });
  const projections = [];
  renderer.render(firstScene, { width: 1000, height: 600 }, (_, screen) => projections.push(host(screen)), 150);
  renderer.render(secondScene, { width: 1000, height: 600 }, (_, screen) => projections.push(host(screen)), 150);
  assert.deepEqual(projections[0], projections[1]);
});

test("actor-relative VFX follows the actor/layer visual depth", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 600, y: 300 });
  const scene = win.MachGirlsScene.create({ camera });
  const actor = makeActor(win);
  scene.registerActor(actor);
  scene.addEffect("back", { type: "GLOW", scope: "ACTOR", actorId: actor.id, layerId: "body", startTime: 0 });
  scene.addEffect("front", { type: "GLOW", scope: "ACTOR", actorId: actor.id, layerId: "front", startTime: 0 });
  const context = { save() {}, restore() {}, translate() {}, scale() {} };
  const renderer = win.MachGirlsSceneRenderer.create({ context });
  const results = [];
  renderer.render(scene, { width: 1000, height: 600 }, (item, screen) => results.push({ type: item.effect.type, id: item.effect === scene.renderables(0)[0]?.effect ? "first" : "other", layerZ: item.layerZ, screen }), 10);
  const fx = results.filter((item) => item.type === "GLOW");
  assert.equal(fx.length, 2);
  assert.notEqual(fx[0].layerZ, fx[1].layerZ);
  assert.notEqual(fx[0].screen.parallaxOffsetX, fx[1].screen.parallaxOffsetX);
});

test("VFX uses the same camera/parallax projection without mutating actor state", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 600, y: 300 });
  const scene = win.MachGirlsScene.create({ camera });
  const actor = makeActor(win);
  scene.registerActor(actor);
  const before = { x: actor.transform.x, y: actor.transform.y, z: actor.transform.z };
  scene.addEffect("trail", { type: "MOTION_TRAIL", scope: "ACTOR", actorId: actor.id, layerId: "front", offset: { x: 8, y: 0 }, startTime: 0 });
  const context = { save() {}, restore() {}, translate() {}, scale() {} };
  const renderer = win.MachGirlsSceneRenderer.create({ context });
  const screens = [];
  renderer.render(scene, { width: 1000, height: 600 }, (_, screen) => screens.push(screen), 25);
  assert.equal(screens.length, 1);
  assert.equal(screens[0].parallaxOffsetX, -12.5);
  assert.deepEqual({ x: actor.transform.x, y: actor.transform.y, z: actor.transform.z }, before);
});

test("screen-relative VFX remains screen-relative and does not move the actor", async () => {
  const win = await loadFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = makeActor(win);
  scene.registerActor(actor);
  const before = { x: actor.transform.x, y: actor.transform.y, z: actor.transform.z };
  scene.addEffect("flash", { type: "SCREEN_FLASH", scope: "SCREEN", opacity: 0.75, durationMs: 120, startTime: 10 });
  const context = { save() {}, restore() {}, translate() {}, scale() {} };
  const renderer = win.MachGirlsSceneRenderer.create({ context });
  const calls = [];
  renderer.render(scene, { width: 1000, height: 600 }, (item, screen) => calls.push({ item, screen }), 50);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].item.effect.scope, "SCREEN");
  assert.equal(calls[0].screen, null);
  assert.deepEqual({ x: actor.transform.x, y: actor.transform.y, z: actor.transform.z }, before);
});

test("VFX cleanup removes finished effects and leaves actor state unchanged", async () => {
  const win = await loadFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = makeActor(win);
  scene.registerActor(actor);
  scene.addEffect("impact", { type: "IMPACT", scope: "ACTOR", actorId: actor.id, durationMs: 50, startTime: 100 });
  assert.equal(scene.renderables(120).filter((item) => item.type === "FX").length, 1);
  assert.equal(scene.cleanupEffects(150), 1);
  assert.equal(scene.renderables(150).filter((item) => item.type === "FX").length, 0);
  assert.deepEqual({ x: actor.transform.x, y: actor.transform.y, z: actor.transform.z }, { x: 500, y: 300, z: 0.7 });
});

test("legacy actor without VFX keeps the existing renderable path", async () => {
  const win = await loadFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = win.MachGirlsActor.create({ id: "legacy", role: "ENEMY", layer: "ACTORS", transform: { z: 0.2 } });
  scene.registerActor(actor);
  const renderables = scene.renderables(10);
  assert.equal(renderables.length, 1);
  assert.equal(renderables[0].type, "ACTOR");
  assert.equal(renderables[0].actorLayer, null);
});
