import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCore() {
  const window = {};
  const context = vm.createContext({ window, console, JSON, Math, Number, String, Object, Array, Set });
  for (const path of [
    "intento_2/webapp/js/game/state.js",
    "intento_2/webapp/js/game/actions.js",
    "intento_2/webapp/js/game/rules.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context.window;
}

test("enemy can attack after player action", async () => {
  const core = await loadCore();
  const state = core.GameState.createGameState();
  core.GameState.startBattle(state);
  const playerAction = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.ATTACK);
  core.CombatEngine.resolveAction(state, playerAction);
  const enemyAction = core.EnemyAI.decide(state);
  assert.equal(enemyAction.type, "ATTACK");
  core.CombatEngine.resolveAction(state, enemyAction);
  assert.equal(state.combat.turn, 2);
  assert.equal(state.combat.activeActor, "player");
});

test("victory and defeat lock further actions", async () => {
  const core = await loadCore();

  const win = core.GameState.createGameState();
  core.GameState.startBattle(win, {
    enemy: { hp: 1, maxHp: 1, stats: { atk: 1, def: 0, skillDamage: 1 } }
  });
  const attack = core.GameActions.createPlayerAction(win, core.GameActions.ACTION_TYPES.ATTACK);
  const winResolution = core.CombatEngine.resolveAction(win, attack);
  assert.equal(winResolution.outcome, "VICTORY");
  assert.equal(win.combat.phase, "VICTORY");
  assert.equal(core.CombatEngine.validateAction(win, attack).error, "COMBAT_FINISHED");

  const loss = core.GameState.createGameState();
  core.GameState.startBattle(loss, {
    player: { hp: 1, maxHp: 1, stats: { atk: 1, def: 0, skillDamage: 1 } }
  });
  const playerAttack = core.GameActions.createPlayerAction(loss, core.GameActions.ACTION_TYPES.ATTACK);
  core.CombatEngine.resolveAction(loss, playerAttack);
  const enemyAction = core.EnemyAI.decide(loss);
  core.CombatEngine.resolveAction(loss, enemyAction);
  assert.equal(loss.combat.outcome, "DEFEAT");
  assert.equal(loss.combat.phase, "DEFEAT");
});