import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCore() {
  const context = vm.createContext({
    window: {}, console, JSON, Math, Number, String, Object, Array, Set, Error, TypeError, Infinity, NaN
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
    "intento_2/webapp/js/game/rules.js"
  ]) vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  return context.window;
}

test("GameState starts a real-time battle with a fixed-step clock", async () => {
  const w = await loadCore();
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state, { seed: 42 });
  assert.equal(state.combat.phase, "REAL_TIME");
  assert.equal(state.combat.activeActor, "combat");
  assert.equal(state.combat.clock.stepMs, 100);
  assert.equal(state.combat.simulationTick, 0);
});

test("auto attacks advance combat without player input", async () => {
  const w = await loadCore();
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state, { seed: 42 });
  const playerHp = state.combat.player.hp;
  const enemyHp = state.combat.enemy.hp;
  w.CombatEngine.advanceTime(state, 1500);
  assert.ok(state.combat.player.hp < playerHp);
  assert.ok(state.combat.enemy.hp < enemyHp);
  assert.equal(state.combat.simulationTick, 15);
  assert.equal(state.combat.clock.elapsedMs, 1500);
});

test("legacy turn actions are rejected by the new model", async () => {
  const w = await loadCore();
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state);
  const legacy = w.GameActions.createPlayerEndTurnAction(state);
  assert.equal(w.CombatEngine.validateAction(state, legacy).error, "LEGACY_TURN_FLOW_DISABLED");
});