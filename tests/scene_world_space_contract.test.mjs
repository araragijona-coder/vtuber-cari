import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/camera.js",
  "intento_2/webapp/js/scene/actor.js",
  "intento_2/webapp/js/scene/scene.js",
  "intento_2/webapp/js/combat_shot_director.js"
];

async function loadSceneFoundation() {
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math, Number, String, Object, Map, JSON
  });

  for (const file of FILES) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, context, { filename: file });
  }

  return context.window;
}

function cameraTargetFor(shotDirector, shotName, width, height) {
  const profile = shotDirector.SHOT_PROFILES[shotName];
  const target = shotDirector.create().resolveTarget(profile.target);
  return {
    x: target.x * width,
    y: target.y * height,
    zoom: profile.zoom,
    offsetX: profile.offsetX,
    offsetY: profile.offsetY
  };
}

test("camera movement changes projected screen position while actor world position stays constant", async () => {
  const window = await loadSceneFoundation();
  const camera = window.MachGirlsSceneCamera.create({
    x: 500,
    y: 300,
    zoom: 1,
    now: 0
  });
  const scene = window.MachGirlsScene.create({ camera });
  const actor = window.MachGirlsActor.create({
    id: "scene:PLAYER",
    role: "PLAYER",
    transform: { x: 320, y: 336, z: 0.72, scale: 1, visible: true }
  });

  scene.registerActor(actor);

  const before = actor.transform;
  const screenA = window.MachGirlsWorldSpace.worldToScreen(before, camera.getState(), {
    width: 1000,
    height: 600
  });

  camera.snap({ x: 620, y: 300, zoom: 1.2 });
  const screenB = window.MachGirlsWorldSpace.worldToScreen(actor.transform, camera.getState(), {
    width: 1000,
    height: 600
  });

  const after = actor.transform;

  assert.equal(before.x, after.x);
  assert.equal(before.y, after.y);
  assert.equal(before.z, after.z);
  assert.notEqual(screenA.x, screenB.x);
  assert.notEqual(screenA.y, screenB.y);
  assert.equal(before.x, 320);
  assert.equal(before.y, 336);
});

test("shot director labels semantic anchors separately from world-stage actor frames", async () => {
  const window = await loadSceneFoundation();
  const shotDirector = window.MachGirlsShotDirector.create({ now: 0 });
  const target = shotDirector.resolveTarget("PLAYER_FOCUS");
  const frame = shotDirector.getEntityFrame("PLAYER", 1000, 600);

  assert.equal(target.coordinateSpace, "NORMALIZED_STAGE");
  assert.equal(frame.coordinateSpace, "WORLD_STAGE_PX");
  assert.equal(frame.x, 310);
  assert.equal(frame.y, 336);
  assert.equal(frame.depth, 0.72);
});

test("PLAYER_FOCUS and ENEMY_FOCUS move different world actors toward screen focus without mutating world positions", async () => {
  const window = await loadSceneFoundation();
  const shotDirector = window.MachGirlsShotDirector.create({ now: 0 });
  const width = 1000;
  const height = 600;
  const screenCenterX = width / 2;

  const playerFrame = shotDirector.getEntityFrame("PLAYER", width, height);
  const enemyFrame = shotDirector.getEntityFrame("ENEMY_PRIMARY", width, height);
  const playerWorld = window.MachGirlsWorldSpace.createTransform(playerFrame);
  const enemyWorld = window.MachGirlsWorldSpace.createTransform(enemyFrame);

  const establishingCamera = {
    x: width * 0.5,
    y: height * 0.5,
    zoom: window.MachGirlsShotDirector.SHOT_PROFILES.ESTABLISHING.zoom,
    offsetX: 0,
    offsetY: 0
  };

  const playerFocus = cameraTargetFor(window.MachGirlsShotDirector, "PLAYER_FOCUS", width, height);
  const enemyFocus = cameraTargetFor(window.MachGirlsShotDirector, "ENEMY_FOCUS", width, height);

  const playerBefore = window.MachGirlsWorldSpace.worldToScreen(
    playerWorld,
    establishingCamera,
    { width, height }
  );
  const playerAfter = window.MachGirlsWorldSpace.worldToScreen(
    playerWorld,
    playerFocus,
    { width, height }
  );
  const enemyBefore = window.MachGirlsWorldSpace.worldToScreen(
    enemyWorld,
    establishingCamera,
    { width, height }
  );
  const enemyAfter = window.MachGirlsWorldSpace.worldToScreen(
    enemyWorld,
    enemyFocus,
    { width, height }
  );

  assert.ok(Math.abs(screenCenterX - playerAfter.x) < Math.abs(screenCenterX - playerBefore.x));
  assert.ok(Math.abs(screenCenterX - enemyAfter.x) < Math.abs(screenCenterX - enemyBefore.x));
  assert.equal(playerWorld.x, playerFrame.x);
  assert.equal(playerWorld.y, playerFrame.y);
  assert.equal(enemyWorld.x, enemyFrame.x);
  assert.equal(enemyWorld.y, enemyFrame.y);
});

test("scene actor transform remains world-space state while camera changes", async () => {
  const window = await loadSceneFoundation();
  const camera = window.MachGirlsSceneCamera.create({ x: 500, y: 300, now: 0 });
  const scene = window.MachGirlsScene.create({ camera });
  const actor = window.MachGirlsActor.create({
    id: "scene:ENEMY_PRIMARY",
    role: "ENEMY_PRIMARY",
    transform: { x: 690, y: 336, z: 0.46, scale: 1, visible: true }
  });
  scene.registerActor(actor);

  const worldBefore = actor.transform;
  camera.snap({ x: 690, y: 300, zoom: 1.09 });
  const worldAfter = actor.transform;

  assert.equal(worldAfter.x, worldBefore.x);
  assert.equal(worldAfter.y, worldBefore.y);
  assert.equal(worldAfter.z, worldBefore.z);
  assert.equal(worldAfter.scale, worldBefore.scale);
  assert.equal(scene.getActor("scene:ENEMY_PRIMARY").transform.x, 690);
  assert.equal(scene.getActor("scene:ENEMY_PRIMARY").transform.y, 336);
});
