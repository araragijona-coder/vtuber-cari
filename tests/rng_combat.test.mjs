import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCombat() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Error, TypeError, Math });
  for (const path of [
    "intento_2/webapp/js/game/balance.js",
    "intento_2/webapp/js/game/rng.js",
    "intento_2/webapp/js/game/cards.js",
    "intento_2/webapp/js/game/energy.js",
    "intento_2/webapp/js/game/enemies.js",
    "intento_2/webapp/js/game/state.js",
    "intento_2/webapp/js/game/actions.js",
    "intento_2/webapp/js/game/rules.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  return context.window;
}

function battle(w, seed, enemyId = "street_punk") {
  const state = w.GameState.createGameState({ playerId: "test" });
  w.GameState.startBattle(state, {
    battleId: "seeded-battle",
    seed,
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: w.EnemyCatalog.createEnemy(enemyId)
  });
  return state;
}

function firstAttack(w, state) {
  const card = state.combat.cards.hand.find((entry) => entry.cardId === "disparo_neon");
  const action = w.GameActions.createPlayerCardAction(state, card.instanceId);
  return w.CombatEngine.resolveAction(state, action);
}

test("same seed + same action produces the same resolution", async () => {
  const w = await loadCombat();
  const a = battle(w, 424242);
  const b = battle(w, 424242);
  const ra = firstAttack(w, a);
  const rb = firstAttack(w, b);
  assert.deepEqual(
    { damage: ra.damage, critical: ra.critical, variance: ra.variance, rngStateAfter: ra.rngStateAfter },
    { damage: rb.damage, critical: rb.critical, variance: rb.variance, rngStateAfter: rb.rngStateAfter }
  );
});

test("different seeds can change a resolution", async () => {
  const w = await loadCombat();
  const results = new Set();
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    results.add(firstAttack(w, battle(w, seed)).damage);
  }
  assert.ok(results.size > 1);
});

test("card damage resolution remains finite and HP bounded", async () => {
  const w = await loadCombat();
  const state = battle(w, 1);
  const result = firstAttack(w, state);
  assert.equal(Number.isFinite(result.damage), true);
  assert.equal(Number.isFinite(state.combat.enemy.hp), true);
  assert.ok(state.combat.enemy.hp >= 0 && state.combat.enemy.hp <= state.combat.enemy.maxHp);
});

test("defense consumes the next-hit protection", async () => {
  const w = await loadCombat();
  const state = battle(w, 100, "street_punk");
  state.combat.cards.hand[0] = { instanceId: "escudo_dark-test", cardId: "escudo_dark" };
  const shield = state.combat.cards.hand[0];
  const defend = w.GameActions.createPlayerCardAction(state, shield.instanceId);
  w.CombatEngine.resolveAction(state, defend);
  const enemyAction = w.EnemyAI.decide(state);
  const resolution = w.CombatEngine.resolveAction(state, enemyAction);
  assert.equal(state.combat.player.defending, false);
  assert.ok(resolution.damage <= 7);
  assert.equal(resolution.critical, false || typeof resolution.critical === "boolean");
});

test("critical multiplier stays bounded and is recorded", async () => {
  const w = await loadCombat();
  let found = null;
  for (let seed = 1; seed <= 200; seed += 1) {
    const result = firstAttack(w, battle(w, seed));
    if (result.critical) { found = result; break; }
  }
  assert.ok(found);
  assert.equal(found.baseDamage, 18);
  assert.equal(found.seed, found.seed >>> 0);
  assert.ok(found.targetHpAfter >= 0);
});

test("defense stat reduces card damage", async () => {
  const w = await loadCombat();
  const low = battle(w, 55, "street_punk");
  const high = battle(w, 55, "iron_guard");
  const lowResult = firstAttack(w, low);
  const highResult = firstAttack(w, high);
  assert.ok(highResult.damage < lowResult.damage);
});