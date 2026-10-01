import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCombat() {
  const context = vm.createContext({
    window: {}, JSON, Number, String, Object, Array, Set, Error, TypeError, Math
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
    "intento_2/webapp/js/game/rules.js",
    "intento_2/webapp/js/game/enemy.js"
  ]) vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  return context.window;
}

function battle(w) {
  const state = w.GameState.createGameState({ playerId: "test-player" });
  w.GameState.startBattle(state, {
    battleId: "test-battle",
    seed: 424242,
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: { id: "street_punk" }
  });
  return state;
}

test("battle starts with four cards and three tactical roles", async () => {
  const w = await loadCombat();
  const state = battle(w);
  assert.equal(state.combat.cards.hand.length, 4);
  assert.equal(state.combat.resources.energy, 100);
  assert.equal(new Set(state.combat.cards.hand.map(card => w.CardSystem.definitionFor(card.cardId).type)).size, 3);
});

test("attack skill uses seeded resolution and moves to discard while combat continues", async () => {
  const w = await loadCombat();
  const state = battle(w);
  const card = state.combat.cards.hand.find(card => card.cardId === "disparo_neon");
  const resolution = w.CombatEngine.resolveAction(state, w.GameActions.createPlayerSkillAction(state, card.instanceId));
  assert.ok(resolution.damage > 0);
  assert.equal(resolution.cost, 24);
  assert.equal(state.combat.outcome, "IN_PROGRESS");
  assert.equal(state.combat.cards.hand.some(entry => entry.instanceId === card.instanceId), false);
  assert.ok(state.combat.cards.drawPile.length + state.combat.cards.discardPile.length > 0);
});

test("insufficient energy rejects skill without consuming it", async () => {
  const w = await loadCombat();
  const state = battle(w);
  const card = state.combat.cards.hand.find(entry => entry.cardId === "embestida_nitro");
  state.combat.resources.energy = 1;
  assert.throws(
    () => w.CombatEngine.resolveAction(state, w.GameActions.createPlayerSkillAction(state, card.instanceId)),
    /INSUFFICIENT_ENERGY/
  );
  assert.equal(state.combat.resources.energy, 1);
  assert.ok(state.combat.cards.hand.some(entry => entry.instanceId === card.instanceId));
});

test("defense skill creates temporary real shield", async () => {
  const w = await loadCombat();
  const state = battle(w);
  const card = state.combat.cards.hand.find(entry => entry.cardId === "escudo_dark");
  const resolution = w.CombatEngine.resolveAction(state, w.GameActions.createPlayerSkillAction(state, card.instanceId));
  assert.equal(resolution.damage, 0);
  assert.equal(state.combat.player.block, 18);
  assert.ok(state.combat.player.blockRemainingMs > 0);
});

test("legacy END TURN is no longer a combat primitive", async () => {
  const w = await loadCombat();
  const state = battle(w);
  const legacy = w.GameActions.createPlayerEndTurnAction(state);
  assert.equal(w.CombatEngine.validateAction(state, legacy).error, "LEGACY_TURN_FLOW_DISABLED");
  assert.throws(() => w.CombatEngine.resolveAction(state, legacy), /LEGACY_TURN_FLOW_DISABLED/);
});

test("rules contain no direct Math.random call", async () => {
  const source = await readFile("intento_2/webapp/js/game/rules.js", "utf8");
  assert.equal(source.includes("Math.random"), false);
});