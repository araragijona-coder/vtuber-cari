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

function start(core) {
  const state = core.GameState.createGameState();
  core.GameState.startBattle(state, { seed: 424242 });
  return state;
}

test("attack resolves damage and keeps the player decision phase open", async () => {
  const core = await loadCore();
  const state = start(core);
  const action = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.ATTACK);
  const resolution = core.CombatEngine.resolveAction(state, action);
  assert.ok(resolution.damage > 0);
  assert.equal(state.combat.activeActor, "player");
  assert.equal(state.combat.phase, "PLAYER_TURN");
});

test("wrong actor and stale turns are rejected", async () => {
  const core = await loadCore();
  const state = start(core);
  const action = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.ATTACK);
  const wrong = { ...action, actorId: state.combat.enemy.id };
  assert.equal(core.CombatEngine.validateAction(state, wrong).error, "WRONG_ACTOR");
  const stale = { ...action, turn: 99 };
  assert.equal(core.CombatEngine.validateAction(state, stale).error, "STALE_TURN");
});

test("legacy defend action creates block and transitions to enemy", async () => {
  const core = await loadCore();
  const state = start(core);
  const defend = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.DEFEND);
  core.CombatEngine.resolveAction(state, defend);
  assert.equal(state.combat.player.block, 4);
  assert.equal(state.combat.player.defending, true);
  assert.equal(state.combat.activeActor, "enemy");

  const enemyAction = core.EnemyAI.decide(state);
  const resolution = core.CombatEngine.resolveAction(state, enemyAction);
  assert.ok(resolution.blockAbsorbed >= 0);
  assert.equal(state.combat.turn, 2);
});

test("resolution clamps HP and action remains an intention", async () => {
  const core = await loadCore();
  const state = start(core);
  const action = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.ATTACK);
  assert.equal("damage" in action, false);
  assert.equal("targetHpAfter" in action, false);
  state.combat.enemy.hp = 1;
  const resolution = core.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.targetHpAfter, 0);
  assert.equal(state.combat.enemy.hp, 0);
  assert.equal(state.combat.enemy.hp >= 0, true);
  assert.equal(state.combat.enemy.hp <= state.combat.enemy.maxHp, true);
});

test("legacy skill is usable once and then rejected", async () => {
  const core = await loadCore();
  const state = start(core);
  const skill = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.SKILL);
  const resolution = core.CombatEngine.resolveAction(state, skill);
  assert.ok(resolution.damage > 0);
  assert.equal(state.combat.resources.playerSkill, 0);
  assert.equal(state.combat.activeActor, "enemy");

  const enemyAction = core.EnemyAI.decide(state);
  core.CombatEngine.resolveAction(state, enemyAction);
  const second = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.SKILL);
  assert.equal(core.CombatEngine.validateAction(state, second).error, "SKILL_UNAVAILABLE");
});
