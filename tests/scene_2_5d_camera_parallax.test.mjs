
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/camera.js",
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/mesh_deformation.js",
  "intento_2/webapp/js/scene/procedural_motion.js",
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

function project(win, camera, layerZ) {
  return win.MachGirlsWorldSpace.worldToScreen(
    win.MachGirlsWorldSpace.createTransform({ x: 500, y: 300, z: 0.4 }),
    camera.getState(),
    { width: 1000, height: 600 },
    { layerZ }
  );
}

function host(value) {
  return {
    x: value.x,
    y: value.y,
    factor: value.parallaxFactor,
    offsetX: value.parallaxOffsetX,
    offsetY: value.parallaxOffsetY
  };
}

test("static camera produces zero parallax delta", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  const result = project(win, camera, 0.5);
  assert.equal(result.parallaxOffsetX, 0);
  assert.equal(result.parallaxOffsetY, 0);
});

test("camera displacement produces a deterministic visual response", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 600, y: 350 });
  const result = project(win, camera, 0.5);
  assert.equal(result.parallaxOffsetX, -12.5);
  assert.equal(result.parallaxOffsetY, -6.25);
});

test("interpolated camera state drives parallax, not the target directly", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.setTarget({ x: 600, y: 300, durationMs: 1000 }, 0);
  camera.update(500);
  assert.equal(camera.getState().x, 550);
  assert.equal(project(win, camera, 0.5).parallaxOffsetX, -6.25);
});

test("different layer depths produce different responses", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 600, y: 300 });
  const back = project(win, camera, -0.5);
  const front = project(win, camera, 0.5);
  assert.notEqual(back.parallaxOffsetX, front.parallaxOffsetX);
  assert.ok(back.parallaxFactor < front.parallaxFactor);
});

test("same camera, depth and input produce identical output", async () => {
  const win = await loadFoundation();
  const firstCamera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  const secondCamera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  firstCamera.snap({ x: 575, y: 330 });
  secondCamera.snap({ x: 575, y: 330 });
  const first = host(project(win, firstCamera, 0.25));
  const second = host(project(win, secondCamera, 0.25));
  assert.deepEqual(first, second);
});

test("parallax is visual-only and does not mutate actor/world state", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 650, y: 340 });
  const actor = win.MachGirlsWorldSpace.createTransform({ x: 420, y: 280, z: 0.7 });
  const before = {
    x: actor.x, y: actor.y, z: actor.z, scale: actor.scale,
    rotation: actor.rotation, state: actor.state, visible: actor.visible,
    anchor: actor.anchor, assetRef: actor.assetRef
  };
  win.MachGirlsWorldSpace.worldToScreen(
    actor,
    camera.getState(),
    { width: 1000, height: 600 },
    { layerZ: 0.5 }
  );
  assert.deepEqual({
    x: actor.x, y: actor.y, z: actor.z, scale: actor.scale,
    rotation: actor.rotation, state: actor.state, visible: actor.visible,
    anchor: actor.anchor, assetRef: actor.assetRef
  }, before);
  assert.equal(camera.getState().x, 650);
  assert.equal(camera.getState().y, 340);
});

test("legacy projection without layer parallax remains unchanged", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 550, y: 320 });
  const transform = win.MachGirlsWorldSpace.createTransform({ x: 500, y: 300, z: 0.2 });
  const legacy = win.MachGirlsWorldSpace.worldToScreen(
    transform,
    camera.getState(),
    { width: 1000, height: 600 }
  );
  assert.equal(legacy.parallaxFactor, 1);
  assert.equal(legacy.parallaxOffsetX, 0);
  assert.equal(legacy.parallaxOffsetY, 0);
});

test("renderer reuses the existing camera and exposes layer parallax in screen projection", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 600, y: 300 });
  const calls = [];
  const context = { save() {}, restore() {}, translate() {}, scale() {} };
  const renderer = win.MachGirlsSceneRenderer.create({ context, camera });
  const actor = {
    id: "layered",
    transform: { x: 500, y: 300, z: 0.4, scale: 1, rotation: 0, visible: true }
  };
  const scene = {
    camera,
    renderables: () => [{ type: "ACTOR_LAYER", layerZ: 0.5, actor }]
  };
  renderer.render(scene, { width: 1000, height: 600 }, (item, projection) => {
    calls.push({ item, projection });
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].projection.parallaxFactor, 1.125);
  assert.equal(calls[0].projection.parallaxOffsetX, -12.5);
});

test("mesh and procedural motion state are preserved through parallax projection", async () => {
  const win = await loadFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const motion = win.MachGirlsProceduralMotion.create({
    enabled: true,
    amplitude: 0.03,
    frequency: 1
  });
  motion.applyToMesh(mesh, 250);
  const verticesBefore = host(mesh.getVertices()[4]);
  const baseBefore = host(mesh.getBaseVertices()[4]);
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  camera.snap({ x: 600, y: 300 });
  win.MachGirlsWorldSpace.worldToScreen(
    win.MachGirlsWorldSpace.createTransform({ x: 500, y: 300, z: 0.4 }),
    camera.getState(),
    { width: 1000, height: 600 },
    { layerZ: 0.5 }
  );
  assert.deepEqual(host(mesh.getVertices()[4]), verticesBefore);
  assert.deepEqual(host(mesh.getBaseVertices()[4]), baseBefore);
  const motionSnapshot = motion.getSnapshot();
  assert.deepEqual(
    {
      enabled: motionSnapshot.enabled,
      amplitude: motionSnapshot.amplitude,
      frequency: motionSnapshot.frequency,
      phase: motionSnapshot.phase
    },
    { enabled: true, amplitude: 0.03, frequency: 1, phase: 0 }
  );
});

test("z ordering remains external to parallax projection", async () => {
  const win = await loadFoundation();
  assert.equal(win.MachGirlsWorldSpace.compareDepth({ z: -1 }, { z: 1 }) < 0, true);
  const camera = win.MachGirlsSceneCamera.create({ x: 500, y: 300 });
  const before = win.MachGirlsWorldSpace.compareDepth({ z: -0.5 }, { z: 0.5 });
  camera.snap({ x: 600, y: 300 });
  project(win, camera, -0.5);
  project(win, camera, 0.5);
  assert.equal(win.MachGirlsWorldSpace.compareDepth({ z: -0.5 }, { z: 0.5 }), before);
});
