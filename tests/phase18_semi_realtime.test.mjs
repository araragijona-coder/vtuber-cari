import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const CORE = [
  "intento_2/webapp/js/game/balance.js",
  "intento_2/webapp/js/game/rng.js",
  "intento_2/webapp/js/game/cards.js",
  "intento_2/webapp/js/game/enemies.js",
  "intento_2/webapp/js/game/energy.js",
  "intento_2/webapp/js/game/status.js",
  "intento_2/webapp/js/game/abilities.js",
  "intento_2/webapp/js/game/combat_clock.js",
  "intento_2/webapp/js/game/auto_attack.js",
  "intento_2/webapp/js/game/break.js",
  "intento_2/webapp/js/game/burst.js",
  "intento_2/webapp/js/game/state.js",
  "intento_2/webapp/js/game/actions.js",
  "intento_2/webapp/js/game/skill_resolver.js",
  "intento_2/webapp/js/game/enemy_behavior.js",
  "intento_2/webapp/js/game/rules.js"
];

async function loadCore() {
  const context = vm.createContext({
    window: {}, console, JSON, Math, Number, String, Object, Array, Set,
    Error, TypeError, Infinity, NaN
  });
  for (const path of CORE) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context.window;
}

function start(w, overrides = {}) {
  const state = w.GameState.createGameState({ playerId: "phase18-test" });
  w.GameState.startBattle(state, {
    battleId: "phase18-battle",
    seed: 987654,
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: { id: "street_punk", hp: 200, maxHp: 200, stats: { atk: 12, def: 0, skillDamage: 12 } },
    ...overrides
  });
  return state;
}

function cardAction(w, state, cardId) {
  const card = state.combat.cards.hand.find(entry => entry.cardId === cardId);
  assert.ok(card, "card missing from hand: " + cardId);
  return w.GameActions.createPlayerSkillAction(state, card.instanceId);
}

test("fixed-step combat clock advances without an END TURN primitive", async () => {
  const w = await loadCore();
  const state = start(w);
  assert.equal(state.combat.clock.stepMs, 100);
  assert.equal(state.combat.phase, "REAL_TIME");
  assert.equal(state.combat.activeActor, "combat");
  const legacy = w.GameActions.createPlayerEndTurnAction(state);
  assert.equal(w.CombatEngine.validateAction(state, legacy).error, "LEGACY_TURN_FLOW_DISABLED");
});

test("auto attacks damage both sides without player input", async () => {
  const w = await loadCore();
  const state = start(w);
  const playerBefore = state.combat.player.hp;
  const enemyBefore = state.combat.enemy.hp;
  w.CombatEngine.advanceTime(state, 1500);
  assert.ok(state.combat.player.hp < playerBefore);
  assert.ok(state.combat.enemy.hp < enemyBefore);
  assert.equal(state.combat.simulationTick, 15);
  assert.equal(state.combat.elapsedMs, 1500);
});

test("energy regenerates continuously", async () => {
  const w = await loadCore();
  const state = start(w);
  const shot = cardAction(w, state, "disparo_neon");
  w.CombatEngine.resolveAction(state, shot);
  const afterSpend = state.combat.resources.energy;
  w.CombatEngine.advanceTime(state, 1000);
  assert.ok(state.combat.resources.energy > afterSpend);
  assert.ok(state.combat.resources.energy <= 100);
});

test("skill action is immediate and does not stop the simulation", async () => {
  const w = await loadCore();
  const state = start(w);
  const tick = state.combat.simulationTick;
  const action = cardAction(w, state, "pulso_debilitante");
  const result = w.CombatEngine.resolveAction(state, action);
  assert.equal(result.actionType, "SKILL");
  assert.equal(state.combat.simulationTick, tick);
  assert.equal(w.StatusSystem.has(state.combat.enemy, "WEAK"), true);
  w.CombatEngine.advanceTime(state, 500);
  assert.equal(state.combat.simulationTick, tick + 5);
});

test("cooldown prevents duplicate skill use until its logical timer expires", async () => {
  const w = await loadCore();
  const state = start(w);
  const first = cardAction(w, state, "disparo_neon");
  w.CombatEngine.resolveAction(state, first);
  const duplicate = { instanceId: "copy-shot", cardId: "disparo_neon" };
  state.combat.cards.hand.unshift(duplicate);
  const duplicateAction = w.GameActions.createPlayerSkillAction(state, duplicate.instanceId);
  assert.equal(w.CombatEngine.validateAction(state, duplicateAction).error, "SKILL_COOLDOWN");
  w.CombatEngine.advanceTime(state, 500);
  state.combat.resources.currentEnergy = 100;
  const second = w.GameActions.createPlayerSkillAction(state, duplicate.instanceId);
  assert.equal(w.CombatEngine.validateAction(state, second).valid, true);
});

test("defense creates temporal shield and absorbs real damage", async () => {
  const w = await loadCore();
  const state = start(w);
  const shield = cardAction(w, state, "escudo_dark");
  w.CombatEngine.resolveAction(state, shield);
  const before = state.combat.player.hp;
  const action = w.GameActions.createAction({
    id: "enemy-test",
    type: "ENEMY_BEHAVIOR",
    actorId: state.combat.enemy.id,
    targetId: state.combat.player.id,
    simulationTick: state.combat.simulationTick
  });
  state.combat.enemyIntent = { type: "ATTACK", value: 40, label: "ATTACK 40", remainingMs: 0 };
  const resolution = w.CombatEngine.resolveEnemyAttack(state.combat, action, 40);
  assert.ok(resolution.blockAbsorbed > 0);
  assert.ok(state.combat.player.hp < before);
  assert.equal(state.combat.player.block, 0);
});

test("WEAK modifies outgoing damage and EXPOSED modifies incoming damage", async () => {
  const w = await loadCore();
  const normal = start(w);
  const weak = start(w);
  w.StatusSystem.applyTimedMs(weak.combat.player, "WEAK", 2000);
  const normalDamage = w.CombatEngine.resolveAction(normal, cardAction(w, normal, "disparo_neon")).damage;
  const weakDamage = w.CombatEngine.resolveAction(weak, cardAction(w, weak, "disparo_neon")).damage;
  assert.ok(weakDamage < normalDamage);

  const exposed = start(w);
  w.StatusSystem.applyTimedMs(exposed.combat.enemy, "EXPOSED", 2000);
  const exposedDamage = w.CombatEngine.resolveAction(exposed, cardAction(w, exposed, "disparo_neon")).damage;
  const baseline = start(w);
  const baselineDamage = w.CombatEngine.resolveAction(baseline, cardAction(w, baseline, "disparo_neon")).damage;
  assert.ok(exposedDamage > baselineDamage);
});

test("status durations expire from fixed simulation time", async () => {
  const w = await loadCore();
  const state = start(w);
  w.StatusSystem.applyTimedMs(state.combat.enemy, "EXPOSED", 500);
  assert.equal(w.StatusSystem.has(state.combat.enemy, "EXPOSED"), true);
  w.CombatEngine.advanceTime(state, 500);
  assert.equal(w.StatusSystem.has(state.combat.enemy, "EXPOSED"), false);
});

test("enemy intent telegraphs before automatic behavior resolves", async () => {
  const w = await loadCore();
  const state = start(w, { enemy: { id: "iron_guard", hp: 40, maxHp: 130 } });
  assert.equal(state.combat.enemyIntent.type, "DEFEND");
  assert.ok(state.combat.enemyIntent.remainingMs > 0);
  w.CombatEngine.advanceTime(state, 1200);
  assert.equal(state.combat.lastAction.actionType, "ENEMY_BEHAVIOR");
  assert.equal(state.combat.enemy.block >= 18, true);
});

test("break opens a burst window with separate damage amplification", async () => {
  const w = await loadCore();
  const baseline = start(w);
  const broken = start(w);
  w.BreakSystem.applyImpact(broken.combat.enemy.breakState, 100, 0);
  assert.equal(w.BreakSystem.isBroken(broken.combat.enemy.breakState), true);
  assert.equal(w.BurstSystem.isActive(broken.combat), true);

  const baseDamage = w.CombatEngine.resolveAction(baseline, cardAction(w, baseline, "disparo_neon")).damage;
  const burstDamage = w.CombatEngine.resolveAction(broken, cardAction(w, broken, "disparo_neon")).damage;
  assert.ok(burstDamage > baseDamage);
  assert.equal(w.BurstSystem.multiplier(broken.combat), 1.75);
});

test("break window expires and restores the break meter", async () => {
  const w = await loadCore();
  const state = start(w);
  w.BreakSystem.applyImpact(state.combat.enemy.breakState, 100, 0);
  assert.equal(state.combat.enemy.breakState.current, 0);
  w.CombatEngine.advanceTime(state, 2500);
  assert.equal(state.combat.enemy.breakState.current, 100);
  assert.equal(w.BurstSystem.isActive(state.combat), false);
});

test("same seed and same inputs are deterministic", async () => {
  const w = await loadCore();
  const a = start(w);
  const b = start(w);
  for (const state of [a, b]) {
    w.CombatEngine.advanceTime(state, 500);
    w.CombatEngine.resolveAction(state, cardAction(w, state, "disparo_neon"));
    w.CombatEngine.advanceTime(state, 900);
  }
  assert.equal(JSON.stringify(w.GameState.snapshot(a)), JSON.stringify(w.GameState.snapshot(b)));
});

test("30/60/120 FPS render partitions yield identical gameplay state", async () => {
  const w = await loadCore();
  const simulate = (frameMs, frames) => {
    const state = start(w);
    for (let i = 0; i < frames; i += 1) w.CombatEngine.advanceTime(state, frameMs);
    return {
      tick: state.combat.simulationTick,
      elapsedMs: state.combat.elapsedMs,
      playerHp: state.combat.player.hp,
      enemyHp: state.combat.enemy.hp,
      energy: state.combat.resources.energy,
      rng: state.combat.rng.state,
      break: state.combat.enemy.breakState.current
    };
  };
  const a = simulate(1000 / 30, 30);
  const b = simulate(1000 / 60, 60);
  const c = simulate(1000 / 120, 120);
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
});

test("character ability has a real condition and effect in the live model", async () => {
  const w = await loadCore();
  const state = start(w);
  state.combat.resources.energy = 20;
  assert.equal(w.CharacterAbilitySystem.canUse(state.combat), true);
  const result = w.CombatEngine.resolveAction(
    state,
    w.GameActions.createPlayerAbilityAction(state)
  );
  assert.equal(result.actionType, "ABILITY");
  assert.equal(state.combat.resources.playerAbilityUses, 0);
  assert.equal(w.StatusSystem.has(state.combat.enemy, "EXPOSED"), true);
});

test("targeting exposes a future-proof interface while remaining single-enemy MVP", async () => {
  const w = await loadCore();
  const state = start(w);
  const shot = w.CardSystem.definitionFor("disparo_neon");
  assert.equal(w.CombatEngine.resolveTarget(state.combat, state.combat.player, shot, state.combat.enemy.id), state.combat.enemy);
  const shield = w.CardSystem.definitionFor("escudo_dark");
  assert.equal(w.CombatEngine.resolveTarget(state.combat, state.combat.player, shield, state.combat.player.id), state.combat.player);
  assert.equal(w.CombatEngine.resolveTarget(state.combat, state.combat.player, shot, "missing"), null);
});

test("saveVersion 1 remains loadable after the combat pivot", async () => {
  const storageData = new Map();
  const context = vm.createContext({
    window: { localStorage: {
      getItem: key => storageData.get(key) ?? null,
      setItem: (key, value) => storageData.set(key, String(value)),
      removeItem: key => storageData.delete(key)
    }},
    JSON, Number, String, Object, Array, Set, Date, Error, TypeError, Infinity, NaN
  });
  vm.runInContext(await readFile("intento_2/webapp/js/storage/save_manager.js", "utf8"), context);
  const legacy = context.window.SaveManager.createDefaultSave("legacy-player");
  legacy.player.xp = 100;
  storageData.set(context.window.SaveManager.STORAGE_KEY, JSON.stringify(legacy));
  const loaded = context.window.SaveManager.load();
  assert.equal(loaded.source, "localStorage");
  assert.equal(loaded.save.saveVersion, 1);
  assert.equal(loaded.save.player.xp, 100);
});

test("combat path has no Math.random dependency", async () => {
  for (const path of [
    "intento_2/webapp/js/game/combat_clock.js",
    "intento_2/webapp/js/game/auto_attack.js",
    "intento_2/webapp/js/game/break.js",
    "intento_2/webapp/js/game/burst.js",
    "intento_2/webapp/js/game/enemy_behavior.js",
    "intento_2/webapp/js/game/skill_resolver.js",
    "intento_2/webapp/js/game/rules.js"
  ]) {
    const source = await readFile(path, "utf8");
    assert.equal(source.includes("Math.random"), false, path);
  }
});
