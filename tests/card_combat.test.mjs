import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCombat() {
  const context = vm.createContext({
    window: {},
    JSON, Number, String, Object, Array, Error, TypeError, Math
  });
  for (const path of [
    "intento_2/webapp/js/game/cards.js",
    "intento_2/webapp/js/game/energy.js",
    "intento_2/webapp/js/game/state.js",
    "intento_2/webapp/js/game/actions.js",
    "intento_2/webapp/js/game/rules.js"
  ]) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context.window;
}

function battle(window, overrides = {}) {
  const state = window.GameState.createGameState({ playerId: "test-player" });
  window.GameState.startBattle(state, {
    battleId: "test-battle",
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: { id: "enemy", hp: 100, maxHp: 100, stats: { atk: 15, def: 3, skillDamage: 30 } },
    ...overrides
  });
  return state;
}

test("battle starts with 4-card hand and 3/3 energy", async () => {
  const w = await loadCombat();
  const state = battle(w);
  assert.equal(state.combat.cards.hand.length, 4);
  assert.equal(state.combat.resources.energy, 3);
  assert.equal(state.combat.resources.maxEnergy, 3);
});

test("attack card deals deterministic damage and moves to discard", async () => {
  const w = await loadCombat();
  const state = battle(w);
  const card = state.combat.cards.hand.find((entry) => entry.cardId === "disparo_neon");
  const action = w.GameActions.createPlayerCardAction(state, card.instanceId);
  const resolution = w.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.damage, 18);
  assert.equal(state.combat.enemy.hp, 82);
  assert.equal(state.combat.resources.energy, 2);
  assert.equal(state.combat.cards.hand.some((entry) => entry.instanceId === card.instanceId), false);
  assert.equal(state.combat.cards.discardPile.some((entry) => entry.instanceId === card.instanceId), true);
});

test("insufficient energy rejects the card without moving it or consuming energy", async () => {
  const w = await loadCombat();
  const state = battle(w);
  const card = state.combat.cards.hand.find((entry) => entry.cardId === "embestida_nitro");
  state.combat.resources.energy = 1;
  assert.throws(
    () => w.CombatEngine.resolveAction(state, w.GameActions.createPlayerCardAction(state, card.instanceId)),
    /INSUFFICIENT_ENERGY/
  );
  assert.equal(state.combat.resources.energy, 1);
  assert.ok(state.combat.cards.hand.some((entry) => entry.instanceId === card.instanceId));
  assert.equal(state.combat.cards.discardPile.length, 0);
});

test("invalid, missing and finished-combat cards are rejected", async () => {
  const w = await loadCombat();
  const state = battle(w);
  assert.throws(
    () => w.CombatEngine.resolveAction(state, w.GameActions.createPlayerCardAction(state, "missing-card")),
    /INVALID_CARD/
  );
  const card = state.combat.cards.hand[0];
  const action = w.GameActions.createPlayerCardAction(state, card.instanceId);
  w.CombatEngine.resolveAction(state, action);
  assert.throws(
    () => w.CombatEngine.resolveAction(state, action),
    /WRONG_ACTOR|STALE_TURN/
  );
  state.combat.outcome = w.GameState.OUTCOME.VICTORY;
  assert.throws(
    () => w.CombatEngine.resolveAction(state, w.GameActions.createPlayerCardAction(state, card.instanceId)),
    /COMBAT_FINISHED/
  );
});

test("defend card sets defense and does not deal damage", async () => {
  const w = await loadCombat();
  const state = battle(w);
  const card = state.combat.cards.hand.find((entry) => entry.cardId === "escudo_dark");
  const enemyHp = state.combat.enemy.hp;
  const action = w.GameActions.createPlayerCardAction(state, card.instanceId);
  const resolution = w.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.damage, 0);
  assert.equal(state.combat.enemy.hp, enemyHp);
  assert.equal(state.combat.player.defending, true);
  assert.equal(state.combat.resources.energy, 2);
});
