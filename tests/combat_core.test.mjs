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

function start(core) {
  const state = core.GameState.createGameState();
  core.GameState.startBattle(state);
  return state;
}

test("attack resolves damage and hands turn to enemy", async () => {
  const core = await loadCore();
  const state = start(core);
  const action = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.ATTACK);
  const resolution = core.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.damage, 17);
  assert.equal(state.combat.enemy.hp, 83);
  assert.equal(state.combat.activeActor, "enemy");
  assert.equal(state.combat.phase, "ENEMY_TURN");
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

test("defend absorbs half of the next incoming damage", async () => {
  const core = await loadCore();
  const state = start(core);
  const defend = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.DEFEND);
  core.CombatEngine.resolveAction(state, defend);
  const enemyAction = core.EnemyAI.decide(state);
  const resolution = core.CombatEngine.resolveAction(state, enemyAction);
  assert.equal(resolution.damage, 5);
  assert.equal(state.combat.player.hp, 115);
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

test("skill is usable once and then rejected", async () => {
  const core = await loadCore();
  const state = start(core);
  const skill = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.SKILL);
  const resolution = core.CombatEngine.resolveAction(state, skill);
  assert.equal(resolution.damage, 37);
  assert.equal(state.combat.resources.playerSkill, 0);

  const enemyAction = core.EnemyAI.decide(state);
  core.CombatEngine.resolveAction(state, enemyAction);
  const second = core.GameActions.createPlayerAction(state, core.GameActions.ACTION_TYPES.SKILL);
  assert.equal(core.CombatEngine.validateAction(state, second).error, "SKILL_UNAVAILABLE");
});