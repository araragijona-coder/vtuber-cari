import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCombat() {
  const context = vm.createContext({
    window: {}, JSON, Number, String, Object, Array, Error, TypeError, Math
  });
  for (const path of [
    "intento_2/webapp/js/game/balance.js",
    "intento_2/webapp/js/game/rng.js",
    "intento_2/webapp/js/game/cards.js",
    "intento_2/webapp/js/game/energy.js",
    "intento_2/webapp/js/game/status.js",
    "intento_2/webapp/js/game/enemies.js",
    "intento_2/webapp/js/game/state.js",
    "intento_2/webapp/js/game/actions.js",
    "intento_2/webapp/js/game/rules.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  return context.window;
}

function battle(w, enemyId, seed = 424242) {
  const state = w.GameState.createGameState({ playerId: "test-player" });
  w.GameState.startBattle(state, {
    battleId: "test-battle",
    seed,
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: w.EnemyCatalog.createEnemy(enemyId)
  });
  state.combat.activeActor = "enemy";
  state.combat.phase = w.GameState.PHASE.ENEMY_TURN;
  return state;
}

test("enemy attack changes HP only through CombatEngine", async () => {
  const w = await loadCombat();
  const state = battle(w, "street_punk");
  const before = state.combat.player.hp;
  const action = w.EnemyAI.decide(state);
  assert.equal(state.combat.player.hp, before);
  const resolution = w.CombatEngine.resolveAction(state, action);
  assert.ok(resolution.damage >= 7 && resolution.damage <= 15);
  assert.equal(state.combat.player.hp, before - resolution.damage);
});

test("enemy defend flows through the same resolution path", async () => {
  const w = await loadCombat();
  const state = battle(w, "iron_guard");
  state.combat.enemy.hp = 40;
  state.combat.enemyIntent = w.EnemyAI.previewIntent(state.combat);
  const action = w.EnemyAI.decide(state);
  assert.equal(action.type, "DEFEND");
  const resolution = w.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.damage, 0);
  assert.equal(state.combat.enemy.defending, true);
  assert.equal(state.combat.player.hp, 120);
  assert.equal(state.combat.activeActor, "player");
});

test("enemy cannot act after victory or defeat", async () => {
  const w = await loadCombat();
  const state = battle(w, "street_punk");
  state.combat.outcome = w.GameState.OUTCOME.VICTORY;
  assert.equal(w.EnemyAI.decide(state), null);
  state.combat.outcome = w.GameState.OUTCOME.DEFEAT;
  assert.equal(w.EnemyAI.decide(state), null);
});

test("catalog definitions are not mutated by combat", async () => {
  const w = await loadCombat();
  const state = battle(w, "banchou_rookie");
  state.combat.enemy.hp = 1;
  state.combat.enemy.stats.atk = 999;
  const fresh = w.EnemyCatalog.createEnemy("banchou_rookie");
  assert.equal(fresh.hp, 180);
  assert.equal(fresh.stats.atk, 28);
});

test("all catalog enemies can produce a valid action", async () => {
  const w = await loadCombat();
  for (const enemyId of w.EnemyCatalog.ENEMY_SEQUENCE) {
    const state = battle(w, enemyId);
    const action = w.EnemyAI.decide(state);
    assert.ok(action);
    assert.equal(action.actorId, state.combat.enemy.id);
    assert.equal(action.targetId, state.combat.player.id);
    assert.ok(["ATTACK", "DEFEND"].includes(action.type));
  }
});