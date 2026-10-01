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

function start(w, overrides = {}) {
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state, { seed: 99, ...overrides });
  return state;
}

test("combat continues even when player gives no input", async () => {
  const w = await loadCore();
  const state = start(w);
  const initial = state.combat.player.hp;
  w.CombatEngine.advanceTime(state, 1200);
  assert.ok(state.combat.player.hp < initial);
  assert.ok(state.combat.enemyIntent.remainingMs > 0 || state.combat.outcome !== "IN_PROGRESS");
});

test("victory and defeat lock skills", async () => {
  const w = await loadCore();

  const win = start(w, { enemy: { id: "street_punk", hp: 1, maxHp: 1 } });
  win.combat.enemy.hp = 1;
  w.CombatEngine.resolveAction(
    win,
    w.GameActions.createAction({
      id: "finish",
      type: "AUTO_ATTACK",
      actorId: win.combat.player.id,
      targetId: win.combat.enemy.id,
      simulationTick: 0
    })
  );
  assert.equal(win.combat.outcome, "VICTORY");
  assert.equal(w.CombatEngine.validateAction(
    win,
    w.GameActions.createPlayerEndTurnAction(win)
  ).error, "COMBAT_FINISHED");

  const loss = start(w, { player: { hp: 1, maxHp: 1 } });
  loss.combat.player.hp = 1;
  w.CombatEngine.advanceTime(loss, 1500);
  assert.equal(loss.combat.outcome, "DEFEAT");
});

test("no frame-rate dependent results with a fixed-step clock", async () => {
  const w = await loadCore();
  const run = (frameDelta, frames) => {
    const state = start(w, { enemy: { id: "street_punk" } });
    const card = state.combat.cards.hand.find(entry => entry.cardId === "disparo_neon");
    for (let index = 0; index < frames; index += 1) {
      w.CombatEngine.advanceTime(state, frameDelta);
    }
    w.CombatEngine.resolveAction(state, w.GameActions.createPlayerSkillAction(state, card.instanceId));
    return w.GameState.snapshot(state);
  };
  const a = run(1000 / 30, 30);
  const b = run(1000 / 60, 60);
  const c = run(1000 / 120, 120);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(JSON.stringify(b), JSON.stringify(c));
});