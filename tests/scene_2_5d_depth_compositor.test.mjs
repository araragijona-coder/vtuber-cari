import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/world_space.js",
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

test("2.5D actor layers sort from back to front by relative z without mutating input", async () => {
  const win = await loadSceneFoundation();
  const input = [
    { id: "front", assetId: "asset-front", z: 1 },
    { id: "back", assetId: "asset-back", z: -1 },
    { id: "middle", assetId: "asset-middle", z: 0 }
  ];
  const originalOrder = input.map((layer) => layer.id);
  const actor = win.MachGirlsActor.create({ id: "actor-2.5d", role: "PLAYER", layers: input });

  assert.deepEqual(input.map((layer) => layer.id), originalOrder);
  assert.deepEqual(actor.getRenderLayers().map((layer) => layer.id), ["back", "middle", "front"]);
  assert.deepEqual(actor.getRenderLayers().map((layer) => layer.z), [-1, 0, 1]);
});

test("Scene exposes actor layers as ordered renderables", async () => {
  const win = await loadSceneFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = win.MachGirlsActor.create({
    id: "layered-actor",
    role: "PLAYER",
    layer: "ACTORS",
    transform: { x: 600, y: 350, z: 0.7 },
    layers: [
      { id: "hair-front", assetId: "asset-hair-front", z: 0.3 },
      { id: "body", assetId: "asset-body", z: 0 },
      { id: "hair-back", assetId: "asset-hair-back", z: -0.2 }
    ]
  });
  scene.registerActor(actor);

  const renderables = scene.renderables().filter((item) => item.actor?.id === "layered-actor");
  assert.deepEqual([...renderables.map((item) => item.type)], ["ACTOR_LAYER", "ACTOR_LAYER", "ACTOR_LAYER"]);
  assert.deepEqual([...renderables.map((item) => item.actorLayer.id)], ["hair-back", "body", "hair-front"]);
  assert.deepEqual([...renderables.map((item) => item.actorLayer.z)], [-0.2, 0, 0.3]);
});

test("existing scene ordering still sorts actors by world z before internal layer z", async () => {
  const win = await loadSceneFoundation();
  const scene = win.MachGirlsScene.create();
  const farActor = win.MachGirlsActor.create({
    id: "far",
    role: "ENEMY",
    layer: "ACTORS",
    transform: { z: 0.2 },
    layers: [{ id: "far-front", z: 1 }]
  });
  const nearActor = win.MachGirlsActor.create({
    id: "near",
    role: "PLAYER",
    layer: "ACTORS",
    transform: { z: 0.9 },
    layers: [{ id: "near-back", z: -1 }]
  });
  scene.registerActor(nearActor);
  scene.registerActor(farActor);
  const renderables = scene.renderables();
  assert.deepEqual([...renderables.map((item) => item.actor.id)], ["far", "near"]);
});

test("actors without 2.5D layers preserve the single ACTOR renderable", async () => {
  const win = await loadSceneFoundation();
  const scene = win.MachGirlsScene.create();
  const actor = win.MachGirlsActor.create({ id: "legacy", role: "ENEMY", layer: "ACTORS", transform: { z: 0.2 } });
  scene.registerActor(actor);
  const renderables = scene.renderables();
  assert.equal(renderables.length, 1);
  assert.equal(renderables[0].type, "ACTOR");
  assert.equal(renderables[0].actorLayer, null);
});