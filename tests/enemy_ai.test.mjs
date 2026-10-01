import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadAI() {
  const context = vm.createContext({
    window: {}, JSON, Number, String, Object, Array, Error, Math
  });
  for (const path of [
    "intento_2/webapp/js/game/balance.js",
    "intento_2/webapp/js/game/enemies.js",
    "intento_2/webapp/js/game/state.js",
    "intento_2/webapp/js/game/actions.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context.window;
}

function combatFor(w, enemyId, turn = 1, hp = null) {
  const enemy = w.EnemyCatalog.createEnemy(enemyId);
  if (hp !== null) enemy.hp = hp;
  return {
    outcome: w.GameState.OUTCOME.IN_PROGRESS,
    activeActor: "enemy",
    turn,
    player: { id: "player", hp: 120, stats: { def: 5 } },
    enemy
  };
}

test("Street Punk always attacks", async () => {
  const w = await loadAI();
  const combat = combatFor(w, "street_punk", 8);
  assert.equal(w.EnemyAI.chooseEnemyAction(combat.enemy, combat).type, "ATTACK");
});

test("Iron Guard defends only when low HP", async () => {
  const w = await loadAI();
  const healthy = combatFor(w, "iron_guard", 1, 100);
  assert.equal(w.EnemyAI.chooseEnemyAction(healthy.enemy, healthy).type, "ATTACK");
  const low = combatFor(w, "iron_guard", 1, 52);
  assert.equal(w.EnemyAI.chooseEnemyAction(low.enemy, low).type, "DEFEND");
});

test("Nitro Raider alternates deterministically", async () => {
  const w = await loadAI();
  const odd = combatFor(w, "nitro_raider", 1);
  const even = combatFor(w, "nitro_raider", 2);
  assert.equal(w.EnemyAI.chooseEnemyAction(odd.enemy, odd).type, "ATTACK");
  assert.equal(w.EnemyAI.chooseEnemyAction(even.enemy, even).type, "DEFEND");
});

test("Banchou Rookie follows low HP, turn priorities and deterministic debuff intent", async () => {
  const w = await loadAI();
  const normal = combatFor(w, "banchou_rookie", 2);
  assert.equal(w.EnemyAI.chooseEnemyAction(normal.enemy, normal).type, "ATTACK");
  const third = combatFor(w, "banchou_rookie", 3);
  assert.equal(w.EnemyAI.chooseEnemyAction(third.enemy, third).type, "DEFEND");
  const low = combatFor(w, "banchou_rookie", 2, 63);
  assert.equal(w.EnemyAI.chooseEnemyAction(low.enemy, low).type, "DEFEND");
  const debuff = combatFor(w, "banchou_rookie", 4);
  assert.equal(w.EnemyAI.previewIntent(debuff).type, "DEBUFF");
});

test("AI decision does not mutate combat state", async () => {
  const w = await loadAI();
  const combat = combatFor(w, "iron_guard", 1, 40);
  const beforeHp = combat.player.hp;
  const beforeEnemyHp = combat.enemy.hp;
  const beforeIntent = w.EnemyAI.previewIntent(combat);
  w.EnemyAI.decide({ combat });
  assert.equal(combat.player.hp, beforeHp);
  assert.equal(combat.enemy.hp, beforeEnemyHp);
  assert.equal(beforeIntent.type, "DEFEND");
});
