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
    "intento_2/webapp/js/game/state.js",
    "intento_2/webapp/js/game/actions.js",
    "intento_2/webapp/js/game/rules.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context.window;
}

test("creates a portable GameState without browser objects", async () => {
  const core = await loadCore();
  const state = core.GameState.createGameState({ playerId: "p1" });
  assert.equal(state.screen, "MAIN");
  assert.equal(state.player.id, "p1");
  assert.equal(state.combat, null);
  assert.equal("document" in state, false);
  assert.equal("localStorage" in state, false);
});

test("starts a tactical battle in player turn 1 with visible enemy intent", async () => {
  const core = await loadCore();
  const state = core.GameState.createGameState();
  core.GameState.startBattle(state, { seed: 42 });
  assert.equal(state.combat.turn, 1);
  assert.equal(state.combat.phase, "PLAYER_TURN");
  assert.equal(state.combat.activeActor, "player");
  assert.equal(state.combat.outcome, "IN_PROGRESS");
  assert.equal(state.combat.resources.energy, 3);
  assert.ok(state.combat.enemyIntent);
  assert.ok(state.combat.enemyIntent.type);
});
