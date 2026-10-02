import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/camera.js",
  "intento_2/webapp/js/scene/animation.js",
  "intento_2/webapp/js/scene/actor.js",
  "intento_2/webapp/js/scene/scene.js",
  "intento_2/webapp/js/scene/renderer.js",
  "intento_2/webapp/js/combat_shot_director.js",
  "intento_2/webapp/js/combat_presentation.js"
];

async function loadPresentation() {
  let now = 0;
  const gradient = { addColorStop() {} };
  const context = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    setTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    arc() {},
    ellipse() {},
    arcTo() {},
    drawImage() {},
    fillText() {},
    strokeText() {},
    setLineDash() {},
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    measureText() { return { width: 0 }; }
  };
  const canvas = { getBoundingClientRect: () => ({ width: 1000, height: 600 }) };

  const window = {
    MachGirlsPresentationEvents: { create: () => ({ fromAction: () => null }) },
    BreakSystem: { isBroken: () => false },
    BurstSystem: { canUse: () => false, chargeOf: () => 0, maxChargeOf: () => 100 }
  };

  const contextVm = vm.createContext({
    window,
    performance: { now: () => now },
    Math, Number, String, Object, Map, JSON,
    console
  });

  for (const file of FILES) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, contextVm, { filename: file });
  }

  return {
    presentation: contextVm.window.CombatPresentation.create(canvas, context),
    setNow(value) { now = value; }
  };
}

function actorFrom(snapshot, id) {
  return snapshot.layers.ACTORS.find((actor) => actor.id === id);
}

function runFrame(presentation, setNow, combat, now) {
  setNow(now);
  presentation.render(combat, now);
  return presentation.getSceneFoundation();
}

test("resolved attack produces ATTACK state, world movement, distinct contact recoil and recovery", async () => {
  const { presentation, setNow } = await loadPresentation();
  const combat = {
    battleId: "test-battle",
    outcome: "IN_PROGRESS",
    player: { id: "player-1", hp: 100, maxHp: 100, identity: { characterId: "yuri" } },
    enemy: { id: "iron_guard", hp: 100, maxHp: 100, breakState: { current: 0, max: 100 } }
  };

  presentation.onCombatStart(combat);
  const actionAt = 1000;
  setNow(actionAt);
  presentation.onAction(combat, {
    actionId: "attack-1",
    actionType: "CARD",
    source: "PLAYER",
    targetId: "iron_guard",
    damage: 12,
    breakDamage: 0,
    blockAbsorbed: 0
  });

  const start = runFrame(presentation, setNow, combat, actionAt);
  const playerStart = actorFrom(start, "scene:PLAYER");
  const enemyStart = actorFrom(start, "scene:ENEMY_PRIMARY");

  assert.equal(playerStart.transform.state, "ATTACK");
  assert.equal(enemyStart.transform.x, 690);

  const move = runFrame(presentation, setNow, combat, 1050);
  const playerMove = actorFrom(move, "scene:PLAYER");
  assert.notEqual(playerMove.transform.x, playerStart.transform.x);
  assert.equal(playerMove.transform.state, "ATTACK");

  const preContact = runFrame(presentation, setNow, combat, 1090);
  assert.equal(actorFrom(preContact, "scene:ENEMY_PRIMARY").transform.x, 690);

  const postContact = runFrame(presentation, setNow, combat, 1160);
  const enemyPostContact = actorFrom(postContact, "scene:ENEMY_PRIMARY");
  assert.notEqual(enemyPostContact.transform.x, 690);
  assert.equal(enemyPostContact.transform.state, "HIT");

  const recovery = runFrame(presentation, setNow, combat, 2000);
  const playerRecovery = actorFrom(recovery, "scene:PLAYER");
  const enemyRecovery = actorFrom(recovery, "scene:ENEMY_PRIMARY");
  assert.equal(playerRecovery.transform.x, 310);
  assert.ok(Math.abs(playerRecovery.transform.y - 336) < 1e-9);
  assert.equal(enemyRecovery.transform.x, 690);
  assert.ok(Math.abs(enemyRecovery.transform.y - 336) < 1e-9);
  assert.equal(playerRecovery.transform.state, "IDLE");
  assert.equal(enemyRecovery.transform.state, "IDLE");
});

test("animation state names used by presentation map to the real animation machine", async () => {
  const { presentation, setNow } = await loadPresentation();
  const combat = {
    battleId: "test-battle-2",
    outcome: "IN_PROGRESS",
    player: { id: "player-1", hp: 100, maxHp: 100, identity: { characterId: "yuri" } },
    enemy: { id: "iron_guard", hp: 100, maxHp: 100, breakState: { current: 0, max: 100 } }
  };

  presentation.onCombatStart(combat);
  setNow(1000);
  presentation.onAction(combat, {
    actionId: "attack-2",
    actionType: "CARD",
    source: "PLAYER",
    targetId: "iron_guard",
    damage: 10
  });

  const foundation = runFrame(presentation, setNow, combat, 1200);
  assert.equal(actorFrom(foundation, "scene:PLAYER").transform.state, "ATTACK");
  assert.equal(actorFrom(foundation, "scene:ENEMY_PRIMARY").transform.state, "HIT");

  setNow(2000);
  runFrame(presentation, setNow, combat, 2000);
  assert.equal(actorFrom(presentation.getSceneFoundation(), "scene:PLAYER").transform.state, "IDLE");
  assert.equal(actorFrom(presentation.getSceneFoundation(), "scene:ENEMY_PRIMARY").transform.state, "IDLE");
});
