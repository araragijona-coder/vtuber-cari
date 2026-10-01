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

test("portable GameState remains browser-independent", async () => {
  const core = await loadCore();
  const state = core.GameState.createGameState({ playerId: "p1" });
  assert.equal(state.screen, "MAIN");
  assert.equal(state.player.id, "p1");
  assert.equal(state.combat, null);
  assert.equal("document" in state, false);
  assert.equal("localStorage" in state, false);
});

test("battle exposes energy, autos and break state", async () => {
  const core = await loadCore();
  const state = core.GameState.createGameState();
  core.GameState.startBattle(state, { seed: 42 });
  assert.equal(state.combat.resources.energy, 100);
  assert.equal(state.combat.resources.maxEnergy, 100);
  assert.ok(state.combat.player.autoAttack);
  assert.ok(state.combat.enemy.autoAttack);
  assert.equal(state.combat.enemy.breakState.current, 100);
  assert.equal(state.combat.enemy.breakState.max, 100);
  assert.ok(state.combat.enemyIntent);
});