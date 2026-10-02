import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/mesh_deformation.js",
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

test("mesh base vertices preserve the 3x3 grid without deformation", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, width: 1, height: 1, subdivisions: { x: 2, y: 2 } });
  const base = hostVertices(mesh.getBaseVertices());
  assert.equal(base.length, 9);
  assert.deepEqual(base, [
    { x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 1, y: 0 },
    { x: 0, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.5 },
    { x: 0, y: 1 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }
  ]);
  assert.deepEqual(hostVertices(mesh.getVertices()), base);
});

test("known deformation offsets produce the expected vertices", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({
    enabled: true,
    width: 1,
    height: 1,
    subdivisions: { x: 2, y: 2 }
  });
  const offsets = Array.from({ length: 9 }, () => ({ x: 0, y: 0 }));
  offsets[4] = { x: 0.1, y: -0.05 };
  mesh.setDeformationOffsets(offsets);
  const result = hostVertices(mesh.getVertices());
  assert.deepEqual(result[4], { x: 0.6, y: 0.45 });
  assert.deepEqual(result[0], { x: 0, y: 0 });
});

test("reset restores the exact base geometry", async () => {
  const win = await loadSceneFoundation();
  const mesh = win.MachGirlsMeshDeformation.create({ enabled: true, subdivisions: { x: 2, y: 2 } });
  const base = hostVertices(mesh.getBaseVertices());
  mesh.setDeformationOffsets(Array.from({ length: base.length }, () => ({ x: 0.1, y: -0.05 })));
  mesh.resetDeformation();
  assert.deepEqual(hostVertices(mesh.getVertices()), base);
  assert.deepEqual(hostVertices(mesh.getDeformationOffsets()), Array.from({ length: base.length }, () => ({ x: 0, y: 0 })));
});

test("identical inputs produce identical deformation output", async () => {
  const win = await loadSceneFoundation();
  const spec = {
    enabled: true,
    width: 2,
    height: 3,
    subdivisions: { x: 2, y: 2 }
  };
  const offsets = Array.from({ length: 9 }, (_, index) => ({ x: index * 0.01, y: -index * 0.02 }));
  const first = win.MachGirlsMeshDeformation.create(spec);
  const second = win.MachGirlsMeshDeformation.create(spec);
  first.setDeformationOffsets(offsets);
  second.setDeformationOffsets(offsets);
  assert.deepEqual(hostVertices(first.getVertices()), hostVertices(second.getVertices()));
});

test("deformation changes geometry but preserves Actor Layer z", async () => {
  const win = await loadSceneFoundation();
  const actor = win.MachGirlsActor.create({
    id: "mesh-actor",
    role: "PLAYER",
    transform: { z: 0.7 },
    layers: [{
      id: "body",
      assetId: "asset-body",
      z: 0.35,
      mesh: { enabled: true, subdivisions: { x: 2, y: 2 } }
    }]
  });
  const layerBefore = actor.getRenderLayers()[0];
  const z = layerBefore.z;
  const mesh = layerBefore.mesh;
  const offsets = Array.from({ length: mesh.getBaseVertices().length }, () => ({ x: 0, y: 0 }));
  offsets[4] = { x: 0.1, y: -0.05 };
  mesh.setDeformationOffsets(offsets);
  const layerAfter = actor.getRenderLayers()[0];
  assert.equal(layerAfter.z, z);
  assert.equal(layerAfter.mesh.getVertices()[4].x, 0.6);
  assert.equal(actor.transform.z, 0.7);
});

test("legacy actors without mesh preserve the existing renderable path", async () => {
  const win = await loadSceneFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = win.MachGirlsActor.create({ id: "legacy", role: "ENEMY", layer: "ACTORS", transform: { z: 0.2 } });
  scene.registerActor(actor);
  const renderables = scene.renderables();
  assert.equal(renderables.length, 1);
  assert.equal(renderables[0].type, "ACTOR");
  assert.equal(renderables[0].actorLayer, null);
  assert.equal(actor.getSnapshot().layers.length, 0);
});
