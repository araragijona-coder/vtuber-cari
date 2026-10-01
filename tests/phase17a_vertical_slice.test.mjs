import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCore() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Set, Error, TypeError, Math });
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

test("Phase 17A is retained as historical context while END TURN is retired from production combat", async () => {
  const w = await loadCore();
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state);
  const legacy = w.GameActions.createPlayerEndTurnAction(state);
  assert.equal(w.CombatEngine.validateAction(state, legacy).error, "LEGACY_TURN_FLOW_DISABLED");
  assert.equal(state.combat.phase, "REAL_TIME");
});

test("the new model starts with an active clock, autos and a compact tactical hand", async () => {
  const w = await loadCore();
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state);
  assert.equal(state.combat.clock.stepMs, 100);
  assert.equal(state.combat.cards.hand.length, 5);
  assert.ok(state.combat.player.autoAttack);
  assert.ok(state.combat.enemy.autoAttack);
});

test("saveVersion 1 compatibility remains a storage concern, not a combat-state migration", async () => {
  const context = vm.createContext({
    window: { localStorage: {
      getItem: () => null, setItem: () => {}, removeItem: () => {}
    }},
    JSON, Number, String, Object, Array, Set, Date, Error
  });
  vm.runInContext(
    await readFile("intento_2/webapp/js/storage/save_manager.js", "utf8"),
    context,
    { filename: "save_manager.js" }
  );
  const oldSave = context.window.SaveManager.createDefaultSave("legacy-player");
  assert.equal(oldSave.saveVersion, 1);
  assert.equal(context.window.SaveManager.load().save.saveVersion, 1);
});