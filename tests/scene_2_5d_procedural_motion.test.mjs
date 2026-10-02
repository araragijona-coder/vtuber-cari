import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/mesh_deformation.js",
  "intento_2/webapp/js/scene/procedural_motion.js",
  "intento_2/webapp/js/scene/actor.js",
  "intento_2/webapp/js/scene/scene.js"
];

async function loadSceneFoundation() {
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math, Number, String, Object, Array, Map, Set, JSON
  });
  for (const file of FILES) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, context, { filename: file });
  }
  return context.window;
}

function hostVertices(vertices) {
  return [...vertices].map(({ x, y }) => ({ x, y }));
}

test("disabled motion preserves the mesh base", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const base = hostVertices(mesh.getBaseVertices());
  const motion = win.MachGirlsProceduralMotion.create({
    enabled: false,
    amplitude: 0.25,
    frequency: 1
  });
  assert.equal(motion.applyToMesh(mesh, 250), false);
  assert.deepEqual(hostVertices(mesh.getVertices()), base);
});

test("same time and profile produce identical offsets", async () => {
  const win = await loadSceneFoundation();
  const spec = { enabled: true, amplitude: 0.02, frequency: 1.5, phase: 0.25 };
  const meshA = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const meshB = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const motionA = win.MachGirlsProceduralMotion.create(spec);
  const motionB = win.MachGirlsProceduralMotion.create(spec);
  assert.deepEqual(
    hostVertices(motionA.evaluate(1000, meshA)),
    hostVertices(motionB.evaluate(1000, meshB))
  );
  motionA.applyToMesh(meshA, 1000);
  motionB.applyToMesh(meshB, 1000);
  assert.deepEqual(hostVertices(meshA.getVertices()), hostVertices(meshB.getVertices()));
});

test("different times produce a controlled deformation change", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const motion = win.MachGirlsProceduralMotion.create({ enabled: true, amplitude: 0.05, frequency: 1 });
  motion.applyToMesh(mesh, 250);
  const first = hostVertices(mesh.getVertices());
  motion.applyToMesh(mesh, 750);
  const second = hostVertices(mesh.getVertices());
  assert.notDeepEqual(first, second);
  assert.notEqual(first[0].y, second[0].y);
  assert.notEqual(first[2].y, second[2].y);
});

test("zero amplitude produces zero deformation", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const motion = win.MachGirlsProceduralMotion.create({ enabled: true, amplitude: 0, frequency: 1 });
  const offsets = hostVertices(motion.evaluate(250, mesh));
  assert.deepEqual(offsets, hostVertices(mesh.getBaseVertices()).map(() => ({ x: 0, y: 0 })));
  motion.applyToMesh(mesh, 250);
  assert.deepEqual(hostVertices(mesh.getVertices()), hostVertices(mesh.getBaseVertices()));
});

test("reset returns the mesh to its base after procedural motion", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const motion = win.MachGirlsProceduralMotion.create({ enabled: true, amplitude: 0.04, frequency: 0.75 });
  const base = hostVertices(mesh.getBaseVertices());
  motion.applyToMesh(mesh, 500);
  assert.notDeepEqual(hostVertices(mesh.getVertices()), base);
  assert.equal(motion.reset(mesh), true);
  assert.deepEqual(hostVertices(mesh.getVertices()), base);
});

test("repeated evaluation does not mutate base vertices or accumulate offsets", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const motion = win.MachGirlsProceduralMotion.create({ enabled: true, amplitude: 0.03, frequency: 1 });
  const baseBefore = hostVertices(mesh.getBaseVertices());
  const first = hostVertices(motion.evaluate(250, mesh));
  const second = hostVertices(motion.evaluate(250, mesh));
  assert.deepEqual(first, second);
  motion.applyToMesh(mesh, 250);
  const rendered = hostVertices(mesh.getVertices());
  motion.applyToMesh(mesh, 250);
  assert.deepEqual(hostVertices(mesh.getVertices()), rendered);
  assert.deepEqual(hostVertices(mesh.getBaseVertices()), baseBefore);
});

test("procedural motion preserves Actor Layer z and Actor world z", async () => {
  const win = await loadSceneFoundation();
  const actor = win.MachGirlsActor.create({
    id: "motion-actor",
    role: "PLAYER",
    transform: { z: 0.7 },
    layers: [{
      id: "body",
      assetId: "asset-body",
      z: 0.35,
      mesh: { enabled: true, subdivisions: { x: 2, y: 2 } },
      motion: { enabled: true, amplitude: 0.03, frequency: 1 }
    }]
  });
  const before = actor.getRenderLayers()[0];
  actor.evaluateMotion(250);
  const after = actor.getRenderLayers()[0];
  assert.equal(after.z, before.z);
  assert.equal(actor.transform.z, 0.7);
  assert.notDeepEqual(hostVertices(after.mesh.getVertices()), hostVertices(after.mesh.getBaseVertices()));
  actor.resetMotion();
  assert.deepEqual(hostVertices(actor.getRenderLayers()[0].mesh.getVertices()), hostVertices(after.mesh.getBaseVertices()));
});

test("legacy actor without mesh or motion keeps the existing renderable path", async () => {
  const win = await loadSceneFoundation();
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
  assert.equal(actor.evaluateMotion(250), 0);
});
