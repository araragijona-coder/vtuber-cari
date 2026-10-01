import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCombat() {
  const context = vm.createContext({
    window: {}, JSON, Number, String, Object, Array, Set, Error, TypeError, Math
  });
  for (const path of [
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
    "intento_2/webapp/js/game/rules.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  return context.window;
}

function battle(w, enemyId, hp = null) {
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state, { seed: 33, enemy: { id: enemyId, ...(hp == null ? {} : { hp }) } });
  return state;
}

test("enemy special behavior damages only through CombatEngine", async () => {
  const w = await loadCombat();
  const state = battle(w, "street_punk");
  const intent = w.EnemyBehaviorSystem.previewIntent(state.combat);
  const before = state.combat.player.hp;
  const resolution = w.EnemyBehaviorSystem.resolveIntent(state.combat, intent);
  assert.ok(resolution.damage >= 0);
  assert.equal(state.combat.player.hp <= before, true);
});

test("enemy defense creates a real shield", async () => {
  const w = await loadCombat();
  const state = battle(w, "iron_guard", 40);
  const intent = w.EnemyBehaviorSystem.previewIntent(state.combat);
  assert.equal(intent.type, "DEFEND");
  const resolution = w.EnemyBehaviorSystem.resolveIntent(state.combat, intent);
  assert.equal(resolution.damage, 0);
  assert.ok(state.combat.enemy.block >= 18);
});

test("enemy behavior is inactive after victory or defeat", async () => {
  const w = await loadCombat();
  const state = battle(w, "street_punk");
  state.combat.outcome = "VICTORY";
  assert.equal(w.EnemyAI.decide(state), null);
  state.combat.outcome = "DEFEAT";
  assert.equal(w.EnemyAI.decide(state), null);
});

test("catalog definitions are not mutated by combat state creation", async () => {
  const w = await loadCombat();
  battle(w, "banchou_rookie");
  const fresh = w.EnemyCatalog.createEnemy("banchou_rookie");
  assert.equal(fresh.hp, 180);
  assert.equal(fresh.stats.atk, 22);
});