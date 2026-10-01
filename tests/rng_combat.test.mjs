import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCombat() {
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

function battle(w, seed) {
  const state = w.GameState.createGameState();
  w.GameState.startBattle(state, { seed, enemy: { id: "street_punk", hp: 200, maxHp: 200 } });
  return state;
}

function skill(w, state) {
  const card = state.combat.cards.hand.find(entry => entry.cardId === "disparo_neon");
  return w.CombatEngine.resolveAction(state, w.GameActions.createPlayerSkillAction(state, card.instanceId));
}

test("same seed + same clock + same skill gives same resolution", async () => {
  const w = await loadCombat();
  const a = battle(w, 424242);
  const b = battle(w, 424242);
  w.CombatEngine.advanceTime(a, 500);
  w.CombatEngine.advanceTime(b, 500);
  const ra = skill(w, a);
  const rb = skill(w, b);
  assert.equal(JSON.stringify({
    damage: ra.damage, critical: ra.critical, variance: ra.variance,
    rngStateAfter: ra.rngStateAfter, simulationTick: ra.simulationTick
  }), JSON.stringify({
    damage: rb.damage, critical: rb.critical, variance: rb.variance,
    rngStateAfter: rb.rngStateAfter, simulationTick: rb.simulationTick
  }));
});

test("frame-rate partitioning produces identical fixed-step results", async () => {
  const w = await loadCombat();
  const run = (frameDelta, frames) => {
    const state = battle(w, 1234);
    for (let index = 0; index < frames; index += 1) w.CombatEngine.advanceTime(state, frameDelta);
    return w.GameState.snapshot(state);
  };
  assert.equal(JSON.stringify(run(1000 / 30, 30)), JSON.stringify(run(1000 / 60, 60)));
  assert.equal(JSON.stringify(run(1000 / 60, 60)), JSON.stringify(run(1000 / 120, 120)));
});

test("break and burst use gameplay state rather than wall-clock", async () => {
  const w = await loadCombat();
  const state = battle(w, 7);
  w.BreakSystem.applyImpact(state.combat.enemy.breakState, 100, 0);
  assert.equal(w.BreakSystem.isBroken(state.combat.enemy.breakState), true);
  assert.equal(w.BurstSystem.isActive(state.combat), true);
  assert.equal(w.BurstSystem.multiplier(state.combat), 1.75);
});

test("defense shield absorbs damage", async () => {
  const w = await loadCombat();
  const state = battle(w, 7);
  const card = state.combat.cards.hand.find(entry => entry.cardId === "escudo_dark");
  w.CombatEngine.resolveAction(state, w.GameActions.createPlayerSkillAction(state, card.instanceId));
  const before = state.combat.player.hp;
  w.CombatEngine.advanceTime(state, 1400);
  assert.ok(state.combat.player.hp < before);
  assert.equal(state.combat.player.block, 0);
});