import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function source(path) {
  return readFile(path, "utf8");
}

async function loadFoundation() {
  const files = [
    "intento_2/webapp/js/scene/world_space.js",
    "intento_2/webapp/js/scene/camera.js",
    "intento_2/webapp/js/scene/animation.js",
    "intento_2/webapp/js/scene/actor.js",
    "intento_2/webapp/js/scene/scene.js",
    "intento_2/webapp/js/scene/renderer.js",
    "intento_2/webapp/js/scene/presentation_events.js",
    "intento_2/webapp/js/combat_shot_director.js"
  ];
  const sources = await Promise.all(files.map(source));
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math, Number, String, Object, Array, Map, Set, JSON
  });
  for (let i = 0; i < sources.length; i += 1) {
    vm.runInContext(sources[i], context, { filename: files[i] });
  }
  return context.window;
}

test("Phase 29 scene composes player, motorcycle, shadow and enemy in distinct depth planes", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 600, y: 350 });
  const scene = win.MachGirlsScene.create({ camera });
  const player = win.MachGirlsActor.create({
    id: "scene:PLAYER",
    role: "PLAYER",
    layer: "ACTORS",
    transform: { x: 360, y: 392, z: 0.72, scale: 1, state: "IDLE" }
  });
  player.attachChild(win.MachGirlsActor.create({
    id: "scene:PLAYER:MOTORCYCLE",
    role: "MOTORCYCLE",
    transform: { x: 0, y: 18, z: 0, scale: 0.82, state: "IDLE", assetRef: "player.motorcycle" }
  }));
  player.attachChild(win.MachGirlsActor.create({
    id: "scene:PLAYER:SHADOW",
    role: "SHADOW",
    transform: { x: 0, y: 20, z: 0, scale: 1, state: "IDLE" }
  }));
  const enemy = win.MachGirlsActor.create({
    id: "scene:ENEMY_PRIMARY",
    role: "ENEMY_PRIMARY",
    layer: "ACTORS",
    transform: { x: 760, y: 382, z: 0.46, scale: 1, state: "IDLE" }
  });

  scene.registerActor(player);
  scene.registerActor(enemy);

  const snapshot = player.getSnapshot();
  assert.deepEqual(snapshot.children.map((child) => child.id), [
    "scene:PLAYER:MOTORCYCLE",
    "scene:PLAYER:SHADOW"
  ]);
  assert.ok(win.MachGirlsWorldSpace.depthFactor(player.transform.z) > win.MachGirlsWorldSpace.depthFactor(enemy.transform.z));
  assert.deepEqual(scene.renderables().map((item) => item.actor.id), [
    "scene:ENEMY_PRIMARY",
    "scene:PLAYER"
  ]);
});

test("Phase 29 camera focus projects the focused actor to screen center", async () => {
  const win = await loadFoundation();
  const camera = win.MachGirlsSceneCamera.create({ x: 600, y: 350 });
  camera.setTarget({ x: 760, y: 382, zoom: 1.12, offsetX: 0, offsetY: 0, durationMs: 0, name: "ENEMY_FOCUS" }, 0);
  const state = camera.update(0);
  const projected = win.MachGirlsWorldSpace.worldToScreen(
    { x: 760, y: 382, z: 0.46, scale: 1, rotation: 0, state: "IDLE" },
    state,
    { width: 1200, height: 700 }
  );
  assert.equal(Math.round(projected.x), 600);
  assert.equal(Math.round(projected.y), 350);
  assert.ok(projected.scale < 1.12);
});

test("Phase 29 renderer lifecycle keeps one camera transform and one restore", async () => {
  const win = await loadFoundation();
  const calls = [];
  const context = {
    save() { calls.push("save"); },
    restore() { calls.push("restore"); },
    translate(...args) { calls.push(["translate", ...args]); },
    scale(...args) { calls.push(["scale", ...args]); },
    clearRect(...args) { calls.push(["clearRect", ...args]); },
    setLineDash(...args) { calls.push(["setLineDash", ...args]); }
  };
  const camera = win.MachGirlsSceneCamera.create({ x: 760, y: 382 });
  const scene = win.MachGirlsScene.create({ camera });
  scene.registerActor(win.MachGirlsActor.create({
    id: "enemy", role: "ENEMY_PRIMARY", layer: "ACTORS",
    transform: { x: 760, y: 382, z: 0.46, scale: 1 }
  }));
  const renderer = win.MachGirlsSceneRenderer.create({ context, camera });
  assert.equal(
    renderer.render(scene, { width: 1200, height: 700 }, () => {}, 0),
    true
  );
  assert.equal(calls.filter((entry) => entry === "save").length, 1);
  assert.equal(calls.filter((entry) => entry === "restore").length, 1);
});

test("Phase 29 shot director exposes the required cinematic shot path", async () => {
  const win = await loadFoundation();
  assert.deepEqual(
    ["ESTABLISHING", "PLAYER_FOCUS", "ENEMY_FOCUS", "ATTACK_APPROACH", "IMPACT", "BREAK", "BURST"]
      .every((name) => win.MachGirlsShotDirector.SHOT_NAMES.includes(name)),
    true
  );
  const director = win.MachGirlsShotDirector.create();
  const establishing = director.getShotState(0);
  director.setShot("PLAYER_FOCUS", true, 10);
  const focus = director.getShotState(10);
  assert.equal(establishing.name, "ESTABLISHING");
  assert.equal(focus.name, "PLAYER_FOCUS");
  assert.equal(focus.profile.target, "PLAYER_FOCUS");
  assert.ok(director.getEntityFrame("ENEMY_PRIMARY", 1200, 700).depth < director.getEntityFrame("PLAYER", 1200, 700).depth);
});

test("Phase 29 presentation contains the controlled player/enemy motion and visual freeze boundary", async () => {
  const presentation = await source("intento_2/webapp/js/combat_presentation.js");
  assert.match(presentation, /function scheduleMotion\(/);
  assert.match(presentation, /function motionFor\(/);
  assert.match(presentation, /visualFreezeUntil/);
  assert.match(presentation, /stageMotion:/);
  assert.match(presentation, /drawFoundationShadow/);
  assert.match(presentation, /renderFrame/);
  assert.doesNotMatch(presentation, /function applyCamera\(/);
});

test("Phase 29 combat exposes the cinematic slice without adding a second RAF/render loop", async () => {
  const combat = await source("intento_2/webapp/js/combat.js");
  const raf = combat.match(/requestAnimationFrame\(/g) || [];
  assert.equal(raf.length, 2);
  assert.equal((combat.match(/function startMainLoop\(/g) || []).length, 1);
  assert.doesNotMatch(combat, /cancelAnimationFrame/);
  assert.doesNotMatch(combat, /setInterval\(/);
  assert.match(combat, /function playCinematicSlice\(/);
  assert.match(combat, /playCinematicSlice,/);
  assert.match(combat, /yuri_break_drive/);
  assert.match(combat, /BreakSystem\.isBroken/);
  assert.match(combat, /BurstSystem\.canUse/);
  assert.match(combat, /createBattleConfig\("iron_guard"\)/);
  assert.doesNotMatch(combat, /maki_mach/);
  assert.doesNotMatch(combat, /new CombatEngine/);
});

test("Phase 29 UI exposes a non-DOM battlefield cinematic trigger", async () => {
  const html = await source("intento_2/webapp/index.html");
  const combat = await source("intento_2/webapp/js/combat.js");
  assert.match(html, /id="cinematic-slice"/);
  assert.match(html, /PLAY CINEMATIC SLICE/);
  assert.match(combat, /getElementById\("cinematic-slice"\)/);
  assert.doesNotMatch(html, /class="player"|class="enemy"/);
});

test("Phase 29 real gameplay route reaches BREAK and BURST with existing systems", async () => {
  const files = [
    "balance.js", "rng.js", "cards.js", "enemies.js", "energy.js", "status.js",
    "modifiers.js", "effects.js", "character_kits.js", "abilities.js", "combat_clock.js",
    "auto_attack.js", "break.js", "burst.js", "state.js", "actions.js",
    "skill_resolver.js", "enemy_behavior.js", "rules.js"
  ];
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math, Number, String, Object, Array, Map, Set, JSON
  });
  for (const file of files) {
    const path = "intento_2/webapp/js/game/" + file;
    vm.runInContext(await source(path), context, { filename: path });
  }
  const win = context.window;
  const game = win.GameState.createGameState({ playerId: "phase29-qa" });
  win.GameState.startBattle(game, {
    battleId: "phase29-real-route",
    seed: 170001,
    characterId: "yuri",
    character: win.CharacterKitSystem.definitionFor("yuri"),
    cardIds: win.CharacterKitSystem.cardIdsFor("yuri"),
    player: { id: "player-demo", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: win.EnemyCatalog.createEnemy("iron_guard")
  });

  let breakReached = false;
  let lastResolution = null;
  for (let strike = 0; strike < 5 && !breakReached; strike += 1) {
    let card = null;
    for (let guard = 0; guard < 200; guard += 1) {
      card = game.combat.cards.hand.find((entry) => entry.cardId === "yuri_break_drive");
      if (
        card &&
        win.EnergySystem.canSpend(game.combat.resources, 24) &&
        Number(game.combat.cooldowns.yuri_break_drive || 0) <= 0
      ) break;
      win.CombatEngine.advanceTime(game, 100);
    }
    assert.ok(card, "existing Yuri BREAK skill remained available");
    lastResolution = win.CombatEngine.resolveAction(
      game,
      win.GameActions.createPlayerSkillAction(game, card.instanceId)
    );
    breakReached = Boolean(lastResolution.broke || win.BreakSystem.isBroken(game.combat.enemy.breakState));
  }

  assert.equal(breakReached, true);
  assert.equal(game.combat.enemy.hp > 0, true);
  let burstReady = win.BurstSystem.canUse(game.combat);
  for (let i = 0; i < 30 && !burstReady; i += 1) {
    win.CombatEngine.advanceTime(game, 100);
    burstReady = win.BurstSystem.canUse(game.combat);
  }
  assert.equal(burstReady, true);
  const burst = win.CombatEngine.resolveAction(game, win.GameActions.createPlayerBurstAction(game));
  assert.equal(burst.actionType, "BURST");
  assert.ok(Number(burst.damage) >= 0);
  assert.ok(lastResolution);
});

test("Phase 29 presentation routes action roles before motion and impact scheduling", async () => {
  const combatPresentation = await source("intento_2/webapp/js/combat_presentation.js");
  const start = combatPresentation.indexOf("function onAction(combat, action)");
  const end = combatPresentation.indexOf("function sceneAssetSlots(", start);
  assert.ok(start >= 0);
  assert.ok(end > start);
  const onAction = combatPresentation.slice(start, end);

  assert.match(onAction, /const sourceRole = attacker === "enemy" \? "ENEMY_PRIMARY" : "PLAYER";/);
  assert.match(onAction, /const targetRole = targetTeam === "player" \? "PLAYER" : "ENEMY_PRIMARY";/);
  assert.match(onAction, /scheduleMotion\(\s*sourceRole,/);
  assert.match(onAction, /scheduleMotion\(\s*targetRole,/);
  assert.match(onAction, /setShot\("ATTACK_APPROACH"\)/);
  assert.match(onAction, /setShot\("IMPACT"\)/);
});
