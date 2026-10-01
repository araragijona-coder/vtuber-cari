import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadAI() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Error, Math });
  for (const path of [
    "intento_2/webapp/js/game/balance.js",
    "intento_2/webapp/js/game/enemies.js",
    "intento_2/webapp/js/game/state.js",
    "intento_2/webapp/js/game/actions.js",
    "intento_2/webapp/js/game/combat_clock.js",
    "intento_2/webapp/js/game/auto_attack.js",
    "intento_2/webapp/js/game/break.js",
    "intento_2/webapp/js/game/burst.js",
    "intento_2/webapp/js/game/status.js",
    "intento_2/webapp/js/game/cards.js",
    "intento_2/webapp/js/game/energy.js",
    "intento_2/webapp/js/game/abilities.js",
    "intento_2/webapp/js/game/skill_resolver.js",
    "intento_2/webapp/js/game/enemy_behavior.js",
    "intento_2/webapp/js/game/rng.js",
    "intento_2/webapp/js/game/rules.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  return context.window;
}

function combatFor(w, enemyId, hp = null) {
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state, { seed: 7, enemy: { id: enemyId, ...(hp == null ? {} : { hp }) } });
  return state.combat;
}

test("Street Punk telegraphs ATTACK", async () => {
  const w = await loadAI();
  const combat = combatFor(w, "street_punk");
  assert.equal(w.EnemyAI.previewIntent(combat).type, "ATTACK");
});

test("Iron Guard telegraphs DEFEND at low HP", async () => {
  const w = await loadAI();
  const combat = combatFor(w, "iron_guard", 40);
  assert.equal(w.EnemyAI.previewIntent(combat).type, "DEFEND");
});

test("Nitro Raider alternates deterministic behavior", async () => {
  const w = await loadAI();
  const combat = combatFor(w, "nitro_raider");
  assert.equal(w.EnemyBehaviorSystem.nextType(combat.enemy, 0), "ATTACK");
  assert.equal(w.EnemyBehaviorSystem.nextType(combat.enemy, 1), "DEFEND");
});

test("Banchou Rookie has deterministic DEBUFF telegraph", async () => {
  const w = await loadAI();
  const combat = combatFor(w, "banchou_rookie");
  assert.equal(w.EnemyBehaviorSystem.nextType(combat.enemy, 3), "DEBUFF");
});

test("enemy preview does not mutate HP", async () => {
  const w = await loadAI();
  const combat = combatFor(w, "iron_guard", 40);
  const hp = combat.enemy.hp;
  w.EnemyAI.previewIntent(combat);
  assert.equal(combat.enemy.hp, hp);
});