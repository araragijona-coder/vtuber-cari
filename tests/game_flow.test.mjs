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

test("enemy can resolve after END TURN", async () => {
  const core = await loadCore();
  const state = core.GameState.createGameState();
  core.GameState.startBattle(state);
  const playerCard = state.combat.cards.hand[0];
  core.CombatEngine.resolveAction(
    state,
    core.GameActions.createPlayerCardAction(state, playerCard.instanceId)
  );
  assert.equal(state.combat.activeActor, "player");

  core.CombatEngine.resolveAction(
    state,
    core.GameActions.createPlayerEndTurnAction(state)
  );
  assert.equal(state.combat.activeActor, "enemy");

  const enemyAction = core.EnemyAI.decide(state);
  assert.ok(enemyAction);
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
  assert.equal(loss.combat.activeActor, "enemy");
  const enemyAction = core.EnemyAI.decide(loss);
  core.CombatEngine.resolveAction(loss, enemyAction);
  assert.equal(loss.combat.outcome, "DEFEAT");
  assert.equal(loss.combat.phase, "DEFEAT");
  assert.equal(core.CombatEngine.validateAction(loss, playerAttack).error, "COMBAT_FINISHED");
});

test("simultaneous knockout resolves deterministically as defeat", async () => {
  const core = await loadCore();
  const state = core.GameState.createGameState();
  core.GameState.startBattle(state, {
    player: { hp: 1, maxHp: 1, stats: { atk: 1, def: 0, skillDamage: 1 } },
    enemy: { hp: 1, maxHp: 1, stats: { atk: 1, def: 0, skillDamage: 1 } }
  });
  const combat = state.combat;
  assert.equal(core.CombatEngine.checkOutcome({
    ...combat,
    player: { ...combat.player, hp: 0 },
    enemy: { ...combat.enemy, hp: 0 }
  }), "DEFEAT");
});
