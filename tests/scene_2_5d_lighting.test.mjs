import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
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

function createLayeredActor(win, lighting) {
  return win.MachGirlsActor.create({
    id: "lighting-actor",
    role: "PLAYER",
    transform: { x: 500, y: 300, z: 0.7 },
    layers: [{
      id: "body",
      assetId: "asset-body",
      z: 0.25,
      mesh: { enabled: true, subdivisions: { x: 2, y: 2 } },
      motion: { enabled: true, amplitude: 0.02, frequency: 1 },
      lighting
    }]
  });
}

test("disabled lighting preserves base response", async () => {
  const win = await loadFoundation();
  const light = win.MachGirlsLighting.create({ enabled: false, ambient: 1, intensity: 1, tint: { r: 1, g: 0, b: 0 } });
  const result = light.evaluate();
  assert.equal(result.enabled, false);
  assert.equal(result.contribution, 0);
  assert.equal(result.filter, "none");
});

test("zero intensity leaves only ambient contribution", async () => {
  const win = await loadFoundation();
  const light = win.MachGirlsLighting.create({ enabled: true, ambient: 0.4, intensity: 0, direction: { x: 1, y: 0 } });
  assert.equal(light.evaluate().contribution, 0.4);
});

test("same configuration produces deterministic lighting response", async () => {
  const win = await loadFoundation();
  const spec = { enabled: true, ambient: 0.25, intensity: 0.6, direction: { x: 1, y: -1 }, tint: { r: 0.9, g: 0.8, b: 1 } };
  const first = win.MachGirlsLighting.create(spec).evaluate();
  const second = win.MachGirlsLighting.create(spec).evaluate();
  assert.deepEqual(first, second);
});

test("ambient changes produce controlled response", async () => {
  const win = await loadFoundation();
  const low = win.MachGirlsLighting.create({ enabled: true, ambient: 0.1, intensity: 0 });
  const high = win.MachGirlsLighting.create({ enabled: true, ambient: 0.7, intensity: 0 });
  assert.notEqual(low.evaluate().brightness, high.evaluate().brightness);
  assert.notEqual(low.evaluate().contribution, high.evaluate().contribution);
});

test("direction changes produce distinguishable response", async () => {
  const win = await loadFoundation();
  const surface = { x: 0, y: -1 };
  const vertical = win.MachGirlsLighting.create({ enabled: true, ambient: 0, intensity: 1, direction: { x: 0, y: -1 } });
  const opposite = win.MachGirlsLighting.create({ enabled: true, ambient: 0, intensity: 1, direction: { x: 0, y: 1 } });
  assert.notEqual(vertical.evaluate(surface).contribution, opposite.evaluate(surface).contribution);
});

test("tint changes the deterministic canvas filter response", async () => {
  const win = await loadFoundation();
  const neutral = win.MachGirlsLighting.create({ enabled: true, ambient: 0.2, intensity: 0.4, tint: { r: 1, g: 1, b: 1 } });
  const warm = win.MachGirlsLighting.create({ enabled: true, ambient: 0.2, intensity: 0.4, tint: { r: 1, g: 0.45, b: 0.2 } });
  assert.notEqual(neutral.evaluate().filter, warm.evaluate().filter);
  assert.notEqual(neutral.evaluate().tintStrength, 0);
});

test("lighting configuration is attached to Actor Layer without altering z", async () => {
  const win = await loadFoundation();
  const actor = createLayeredActor(win, {
    enabled: true,
    ambient: 0.3,
    intensity: 0.5,
    direction: { x: 0.2, y: -1 },
    tint: { r: 1, g: 0.9, b: 0.75 }
  });
  const layer = actor.getRenderLayers()[0];
  assert.equal(layer.z, 0.25);
  assert.equal(actor.transform.z, 0.7);
  assert.equal(layer.lighting.getSnapshot().enabled, true);
});

test("lighting does not mutate mesh base or procedural deformation", async () => {
  const win = await loadFoundation();
  const actor = createLayeredActor(win, { enabled: true, ambient: 0.25, intensity: 0.4 });
  actor.evaluateMotion(250);
  const layer = actor.getRenderLayers()[0];
  const baseBefore = [...layer.mesh.getBaseVertices()].map(({ x, y }) => ({ x, y }));
  const deformationBefore = [...layer.mesh.getVertices()].map(({ x, y }) => ({ x, y }));
  layer.lighting.evaluate();
  assert.deepEqual([...layer.mesh.getBaseVertices()].map(({ x, y }) => ({ x, y })), baseBefore);
  assert.deepEqual([...layer.mesh.getVertices()].map(({ x, y }) => ({ x, y })), deformationBefore);
});

test("renderer reuses existing Canvas2D pipeline for layer lighting", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  const calls = [];
  const context = {
    filter: "none",
    save() {},
    restore() {},
    translate() {},
    scale() {}
  };
  const renderer = win.MachGirlsSceneRenderer.create({ context, camera });
  const actor = createLayeredActor(win, { enabled: true, ambient: 0.3, intensity: 0.5, tint: { r: 1, g: 0.5, b: 0.25 } });
  const scene = {
    camera,
    renderables: () => [{ type: "ACTOR_LAYER", layerZ: 0.25, actor, actorLayer: actor.getRenderLayers()[0] }]
  };
  renderer.render(scene, { width: 1000, height: 600 }, (item) => {
    calls.push(context.filter);
  }, 0);
  assert.equal(calls.length, 1);
  assert.notEqual(calls[0], "none");
  assert.equal(context.filter, "none");
});

test("legacy actor without lighting preserves the existing renderable path", async () => {
  const win = await loadFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = win.MachGirlsActor.create({
    id: "legacy",
    role: "ENEMY",
    layer: "ACTORS",
    transform: { z: 0.2 }
  });
  scene.registerActor(actor);
  const renderables = scene.renderables();
  assert.equal(renderables.length, 1);
  assert.equal(renderables[0].type, "ACTOR");
  assert.equal(renderables[0].actorLayer, null);
});
