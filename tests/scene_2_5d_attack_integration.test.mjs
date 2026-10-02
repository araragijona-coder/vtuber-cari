import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FOUNDATION_FILES = [
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/camera.js",
  "intento_2/webapp/js/scene/animation.js",
  "intento_2/webapp/js/scene/presentation_events.js",
  "intento_2/webapp/js/scene/mesh_deformation.js",
  "intento_2/webapp/js/scene/lighting.js",
  "intento_2/webapp/js/scene/procedural_motion.js",
  "intento_2/webapp/js/scene/actor.js",
  "intento_2/webapp/js/scene/scene.js",
  "intento_2/webapp/js/scene/renderer.js",
  "intento_2/webapp/js/combat_shot_director.js",
  "intento_2/webapp/js/combat_presentation.js"
];

const REAL_GAME_FILES = [
  "intento_2/webapp/js/game/balance.js",
  "intento_2/webapp/js/game/rng.js",
  "intento_2/webapp/js/game/status.js",
  "intento_2/webapp/js/game/modifiers.js",
  "intento_2/webapp/js/game/energy.js",
  "intento_2/webapp/js/game/effects.js",
  "intento_2/webapp/js/game/cards.js",
  "intento_2/webapp/js/game/character_kits.js",
  "intento_2/webapp/js/game/abilities.js",
  "intento_2/webapp/js/game/combat_clock.js",
  "intento_2/webapp/js/game/auto_attack.js",
  "intento_2/webapp/js/game/break.js",
  "intento_2/webapp/js/game/burst.js",
  "intento_2/webapp/js/game/enemies.js",
  "intento_2/webapp/js/game/enemy_behavior.js",
  "intento_2/webapp/js/game/state.js",
  "intento_2/webapp/js/game/actions.js",
  "intento_2/webapp/js/game/skill_resolver.js",
  "intento_2/webapp/js/game/rules.js"
];

async function loadRealAttackPresentation() {
  let now = 0;
  const gradient = { addColorStop() {} };
  const context = {
    filter: "none",
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
  const canvas = {
    getBoundingClientRect: () => ({ width: 1000, height: 600 })
  };
  const window = {
    console,
    MachGirlsPresentationEvents: undefined
  };
  const contextVm = vm.createContext({
    window,
    performance: { now: () => now },
    Math,
    Number,
    String,
    Object,
    Array,
    Map,
    Set,
    JSON,
    console
  });

  for (const file of [...REAL_GAME_FILES, ...FOUNDATION_FILES]) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, contextVm, { filename: file });
  }

  return {
    window: contextVm.window,
    presentation: contextVm.window.CombatPresentation.create(canvas, context),
    setNow(value) { now = value; }
  };
}

function foundationActor(snapshot, id) {
  return snapshot.layers.ACTORS.find((actor) => actor.id === id) || null;
}

function sceneVfxTypes(snapshot) {
  return snapshot.effects.map((effect) => effect.type).sort();
}

async function runRealAttack(seed = 290901) {
  const { window, presentation, setNow } = await loadRealAttackPresentation();
  const state = window.GameState.createGameState({ playerId: "yuri-player" });
  const character = window.CharacterKitSystem.definitionFor("yuri");
  const enemy = window.EnemyCatalog.createEnemy("iron_guard");

  window.GameState.startBattle(state, {
    battleId: "phase30h-real-attack",
    seed,
    player: {
      id: "yuri-player",
      hp: 120,
      maxHp: 120,
      stats: { atk: 20, def: 5, skillDamage: 40 }
    },
    enemy,
    characterId: "yuri",
    character,
    cardIds: window.CharacterKitSystem.cardIdsFor("yuri")
  });

  presentation.onCombatStart(state.combat);

  const card = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_break_drive");
  assert.ok(card, "real Yuri Break Drive card must be in the character kit");

  const energyBefore = Number(state.combat.resources.currentEnergy ?? state.combat.resources.energy ?? 0);
  const hpBefore = state.combat.enemy.hp;
  const breakBefore = state.combat.enemy.breakState.current;
  const action = window.GameActions.createPlayerSkillAction(state, card.instanceId);
  assert.equal(action.type, "SKILL");
  assert.equal(action.cardId, "yuri_break_drive");
  assert.equal(action.actorId, "yuri-player");
  assert.equal(action.targetId, "iron_guard");

  const resolution = window.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.actionType, "SKILL");
  assert.equal(resolution.cardId, "yuri_break_drive");
  assert.ok(resolution.damage > 0);
  assert.equal(resolution.hitCount, 1);

  const events = state.combat.events.filter((event) => event.actionId === action.id);
  const attackStart = events.find((event) => event.type === "ATTACK_START");
  const damageApplied = events.find((event) => event.type === "DAMAGE_APPLIED");
  const breakTrigger = events.find((event) => event.type === "BREAK_TRIGGER");
  assert.ok(attackStart);
  assert.ok(damageApplied);
  assert.equal(attackStart.cardId, "yuri_break_drive");
  assert.equal(damageApplied.cardId, "yuri_break_drive");

  const hpAfterCombat = state.combat.enemy.hp;
  const breakAfterCombat = state.combat.enemy.breakState.current;
  const energyAfterCombat = Number(state.combat.resources.currentEnergy ?? state.combat.resources.energy ?? 0);
  const eventCountAfterCombat = state.combat.events.length;

  setNow(1000);
  presentation.render(state.combat, 1000);
  const attackFoundation = presentation.getSceneFoundation();
  const playerAttack = foundationActor(attackFoundation, "scene:PLAYER");
  assert.ok(playerAttack);
  assert.equal(playerAttack.layers.length, 1);
  assert.equal(playerAttack.layers[0].id, "yuri-body");
  assert.equal(playerAttack.layers[0].z, 0.22);
  assert.equal(playerAttack.layers[0].mesh.enabled, true);
  assert.equal(playerAttack.layers[0].mesh.subdivisions.x, 2);
  assert.equal(playerAttack.layers[0].mesh.subdivisions.y, 2);
  assert.equal(playerAttack.transform.state, "ATTACK");
  assert.equal(presentation.getAttackStyleState().abilityId, "yuri_break_drive");

  const cameraAtImpact = presentation.getCameraState();
  assert.ok(["IMPACT", "ATTACK_APPROACH"].includes(cameraAtImpact.active));
  assert.equal(playerAttack.transform.z, attackFoundation.layers.ACTORS.find((actor) => actor.id === "scene:PLAYER").transform.z);

  if (breakTrigger) {
    assert.equal(presentation.getShotState(1000).name, "BREAK");
    assert.equal(foundationActor(attackFoundation, "scene:ENEMY_PRIMARY").transform.state, "BREAK");
  }

  const vfxAtImpact = sceneVfxTypes(attackFoundation);
  assert.ok(vfxAtImpact.includes("MOTION_TRAIL"));
  assert.ok(vfxAtImpact.includes("IMPACT"));

  const playerParallax = window.MachGirlsWorldSpace.worldToScreen(
    playerAttack.transform,
    cameraAtImpact,
    { width: 1000, height: 600 },
    {
      layerZ: playerAttack.layers[0].z,
      parallaxOrigin: cameraAtImpact.parallaxOrigin
    }
  );
  assert.notEqual(playerParallax.parallaxFactor, 1);

  setNow(1060);
  presentation.render(state.combat, 1060);
  const activeFoundation = presentation.getSceneFoundation();
  const playerActive = foundationActor(activeFoundation, "scene:PLAYER");
  const deformationOffsets = playerActive.layers[0].mesh.deformation.offsets;
  assert.ok(deformationOffsets.some((offset) => Math.abs(offset.x) > 0 || Math.abs(offset.y) > 0));
  assert.ok(playerActive.layers[0].motion.enabled);
  assert.ok(playerActive.layers[0].lighting.intensity > 0.32);
  assert.ok(presentation.getCameraState().active === "IMPACT" || presentation.getCameraState().active === "BREAK");

  assert.equal(state.combat.enemy.hp, hpAfterCombat);
  assert.equal(state.combat.enemy.breakState.current, breakAfterCombat);
  assert.equal(
    Number(state.combat.resources.currentEnergy ?? state.combat.resources.energy ?? 0),
    energyAfterCombat
  );
  assert.equal(state.combat.events.length, eventCountAfterCombat);

  setNow(2500);
  presentation.render(state.combat, 2500);
  const recoveryFoundation = presentation.getSceneFoundation();
  const playerRecovery = foundationActor(recoveryFoundation, "scene:PLAYER");
  const enemyRecovery = foundationActor(recoveryFoundation, "scene:ENEMY_PRIMARY");
  assert.equal(playerRecovery.transform.state, "IDLE");
  assert.ok(["IDLE", "BREAK"].includes(enemyRecovery.transform.state));
  assert.equal(presentation.getAttackStyleState(), null);
  assert.equal(presentation.getShotState(2500).name, "PLAYER_FOCUS");
  assert.equal(
    playerRecovery.layers[0].mesh.deformation.offsets.every((offset) => offset.x === 0 && offset.y === 0),
    true
  );
  assert.equal(playerRecovery.layers[0].lighting.intensity, 0.32);
  assert.equal(recoveryFoundation.effects.length, 0);

  assert.equal(state.combat.enemy.hp, hpAfterCombat);
  assert.equal(state.combat.enemy.breakState.current, breakAfterCombat);
  assert.equal(
    Number(state.combat.resources.currentEnergy ?? state.combat.resources.energy ?? 0),
    energyAfterCombat
  );
  assert.equal(state.combat.events.length, eventCountAfterCombat);

  return {
    actionId: String(action.id),
    resolution: {
      damage: resolution.damage,
      breakDamage: resolution.breakDamage,
      broke: Boolean(resolution.broke),
      energyAfter: energyAfterCombat
    },
    events: events.map((event) => event.type),
    playerAttack: {
      state: playerActive.transform.state,
      z: playerActive.transform.z,
      layerZ: playerActive.layers[0].z,
      meshOffsets: deformationOffsets,
      lightingIntensity: playerActive.layers[0].lighting.intensity
    },
    camera: {
      active: presentation.getCameraState().active,
      zoom: presentation.getCameraState().zoom
    },
    vfxAtImpact,
    recovery: {
      attackStyle: presentation.getAttackStyleState(),
      shot: presentation.getShotState(2500).name,
      effects: recoveryFoundation.effects.length
    },
    gameplay: {
      hpBefore,
      hpAfterCombat,
      breakBefore,
      breakAfterCombat,
      energyBefore,
      energyAfterCombat,
      eventCountAfterCombat
    }
  };
}

test("A/B — real Yuri attack executes through CharacterKitSystem, GameActions, CombatEngine and canonical events", async () => {
  const result = await runRealAttack();
  assert.equal(result.resolution.damage > 0, true);
  assert.equal(result.events.includes("ATTACK_START"), true);
  assert.equal(result.events.includes("DAMAGE_APPLIED"), true);
});

test("C — ATTACK_START activates the existing 2.5D mesh response", async () => {
  const result = await runRealAttack();
  assert.equal(result.playerAttack.layerZ, 0.22);
  assert.ok(result.playerAttack.meshOffsets.some((offset) => Math.abs(offset.x) > 0 || Math.abs(offset.y) > 0));
});

test("D — attack presentation keeps the existing camera and parallax path", async () => {
  const result = await runRealAttack();
  assert.ok(["IMPACT", "BREAK"].includes(result.camera.active));
  assert.notEqual(result.playerAttack.layerZ, undefined);
});

test("E — attack/impact produces a lighting response and recovery restores baseline", async () => {
  const result = await runRealAttack();
  assert.ok(result.playerAttack.lightingIntensity > 0.32);
  assert.equal(result.recovery.shot, "PLAYER_FOCUS");
});

test("F — attack and impact are bridged into the existing 30-G Scene VFX manager", async () => {
  const result = await runRealAttack();
  assert.ok(result.vfxAtImpact.includes("MOTION_TRAIL"));
  assert.ok(result.vfxAtImpact.includes("IMPACT"));
  assert.equal(result.recovery.effects, 0);
});

test("G — BREAK, when produced by the chosen real attack, supersedes the IMPACT recoil state", async () => {
  const result = await runRealAttack();
  if (!result.resolution.broke) assert.equal(result.events.includes("BREAK_TRIGGER"), false);
  else assert.deepEqual(result.events.slice(-1), ["BREAK_TRIGGER"]);
});

test("H — recovery clears attack style, transient VFX, deformation and camera state", async () => {
  const result = await runRealAttack();
  assert.equal(result.recovery.attackStyle, null);
  assert.equal(result.recovery.shot, "PLAYER_FOCUS");
  assert.equal(result.recovery.effects, 0);
});

test("I — presentation does not alter gameplay authority or outcome", async () => {
  const result = await runRealAttack();
  assert.equal(result.gameplay.hpAfterCombat, result.gameplay.hpBefore - result.resolution.damage);
  assert.equal(result.gameplay.breakAfterCombat >= result.gameplay.breakBefore, true);
  assert.equal(result.gameplay.energyAfterCombat < result.gameplay.energyBefore, true);
  assert.equal(result.gameplay.eventCountAfterCombat >= result.events.length, true);
});

test("J — identical real attack sequences produce deterministic observable presentation output", async () => {
  const first = await runRealAttack();
  const second = await runRealAttack();
  assert.deepEqual(first.events, second.events);
  assert.deepEqual(first.resolution, second.resolution);
  assert.deepEqual(first.playerAttack, second.playerAttack);
  assert.deepEqual(first.camera, second.camera);
  assert.deepEqual(first.vfxAtImpact, second.vfxAtImpact);
  assert.deepEqual(first.recovery, second.recovery);
});
